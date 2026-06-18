import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { PermissionRequestRecord, RuntimeSendMessageResult } from "../../shared/ipc";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { AgentRecord, MessageRecord, SessionRecord } from "../../shared/types/records";
import { useChatStore } from "../stores/chatStore";
import { PermissionDecisionDialog } from "./PermissionDecisionDialog";

type AgentChatProps = {
  agent: AgentRecord;
  onRuntimeEvent?: (event: AgentRuntimeEvent) => void;
};

const isDetectedExternalAgent = (agent: AgentRecord): boolean => {
  try {
    const metadata = JSON.parse(agent.metadata_json) as { detected?: boolean };
    return metadata.detected === true || agent.runtime_kind === "codex_cli_attached" || agent.permission_mode === "external" || agent.auto_run_mode === "external";
  } catch {
    return agent.runtime_kind === "codex_cli_attached" || agent.permission_mode === "external" || agent.auto_run_mode === "external";
  }
};

export function AgentChat({ agent, onRuntimeEvent }: AgentChatProps): ReactElement {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequestRecord | null>(null);
  const [pendingMessage, setPendingMessage] = useState<{ sessionId: string; message: string } | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const { messagesBySession, hydrateSession } = useChatStore();

  const readOnlyExternalAgent = isDetectedExternalAgent(agent);
  const activeSession = useMemo(() => sessions.at(-1) ?? null, [sessions]);
  const messages: MessageRecord[] = activeSession ? messagesBySession[activeSession.id] ?? [] : [];

  const refreshSessions = async (): Promise<SessionRecord[]> => {
    const nextSessions = await window.codexOffice.sessions.listByAgent(agent.id);
    setSessions(nextSessions);
    if (nextSessions.at(-1)) {
      await hydrateSession(nextSessions.at(-1)!.id);
    }
    return nextSessions;
  };

  useEffect(() => {
    void refreshSessions();
  }, [agent.id]);

  useEffect(() => {
    const unsubscribe = window.codexOffice.runtime.onEvent((event) => {
      if (event.agentId !== agent.id) {
        return;
      }

      onRuntimeEvent?.(event);
      if (activeSession?.id === event.sessionId) {
        void hydrateSession(event.sessionId);
      }
    });

    return unsubscribe;
  }, [agent.id, activeSession?.id, hydrateSession, onRuntimeEvent]);

  const ensureSession = async (): Promise<SessionRecord> => {
    if (readOnlyExternalAgent) {
      throw new Error("Detected external Codex processes are read-only in MVP.");
    }

    const latest = (await refreshSessions()).at(-1);
    if (latest && !["completed", "stopped", "failed"].includes(latest.status)) {
      return latest;
    }

    const session = await window.codexOffice.runtime.spawnAgent({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      workingDirectory: agent.working_directory,
      runtimeKind: agent.runtime_kind,
      permissionMode: agent.permission_mode,
      autoRunMode: agent.auto_run_mode
    });
    await refreshSessions();
    return session;
  };

  const tryLoadPermissionRequest = async (requestId: string, sessionId: string, message: string): Promise<void> => {
    const request = await window.codexOffice.permissions.getRequest(requestId);
    if (!request) {
      throw new Error("Permission request expired before the dialog could open.");
    }

    setPermissionRequest(request);
    setPendingMessage({ sessionId, message });
  };

  const sendRuntimeMessage = async (sessionId: string, message: string): Promise<void> => {
    try {
      const result: RuntimeSendMessageResult = await window.codexOffice.runtime.sendMessage(sessionId, message);
      if (result.status === "permission_required") {
        await tryLoadPermissionRequest(result.requestId, sessionId, message);
        return;
      }
      await hydrateSession(sessionId);
      await refreshSessions();
      setDraft("");
      setSubmitError(null);
    } catch (error) {
      throw error;
    }
  };

  const send = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) {
      return;
    }

    setBusy(true);
    setSubmitError(null);
    try {
      const session = await ensureSession();
      await sendRuntimeMessage(session.id, message);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to send message.");
    } finally {
      setBusy(false);
    }
  };

  const handleDecision = async (decision: "allow_once" | "allow_project" | "deny"): Promise<void> => {
    if (!permissionRequest) {
      return;
    }

    setDecisionBusy(true);
    try {
      const result = await window.codexOffice.permissions.decide({
        requestId: permissionRequest.id,
        decision
      });

      if (result.status === "approved" && pendingMessage) {
        await sendRuntimeMessage(pendingMessage.sessionId, pendingMessage.message);
      } else {
        setSubmitError("Command was denied before execution.");
      }

      setPermissionRequest(null);
      setPendingMessage(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save permission decision.");
    } finally {
      setDecisionBusy(false);
    }
  };

  return (
    <section className="agent-chat">
      <p className="chat-hint">Use regular chat, or try command review with `cmd: pwd` or `cmd: npm install package-name`.</p>
      <div className="message-list">
        {messages.length === 0 ? (
          <p className="empty-note">Start a conversation with this agent.</p>
        ) : (
          messages.map((message) => (
            <article className="chat-message" data-role={message.role} key={message.id}>
              <span>{message.role}</span>
              <p>{message.content}</p>
            </article>
          ))
        )}
      </div>
      <form className="chat-form" onSubmit={(event) => void send(event)}>
        <input
          disabled={busy || readOnlyExternalAgent}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={readOnlyExternalAgent ? "Detected process is read-only" : "Send a message to this agent"}
          value={draft}
        />
        <button disabled={busy || readOnlyExternalAgent || draft.trim().length === 0} type="submit">
          Send
        </button>
      </form>
      {submitError ? <p className="form-error">{submitError}</p> : null}
      {permissionRequest ? (
        <PermissionDecisionDialog
          busy={decisionBusy}
          onClose={() => {
            setPermissionRequest(null);
            setPendingMessage(null);
          }}
          onDecide={handleDecision}
          request={permissionRequest}
        />
      ) : null}
    </section>
  );
}
