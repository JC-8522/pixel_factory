import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from "react";
import type { PermissionRequestRecord, RuntimeSendMessageResult } from "../../shared/ipc";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { AgentRecord, EventRecord, MessageRecord, SessionRecord } from "../../shared/types/records";
import { agentFrameIndex, agentSheetUrl, spriteSheetStyle } from "../office/officeLayout";
import { useChatStore } from "../stores/chatStore";
import { useEventStore } from "../stores/eventStore";
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

const shouldRefreshMessages = (event: AgentRuntimeEvent): boolean =>
  ["message_chunk", "session_completed", "session_stopped", "error"].includes(event.type);

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function AgentChat({ agent, onRuntimeEvent }: AgentChatProps): ReactElement {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequestRecord | null>(null);
  const [pendingMessage, setPendingMessage] = useState<{ sessionId: string; message: string } | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const sessionRefreshTimeoutsRef = useRef(new Map<string, TimeoutHandle>());
  const { messagesBySession, hydrateSession } = useChatStore();
  const { events, hydrate: hydrateEvents } = useEventStore();

  const readOnlyExternalAgent = isDetectedExternalAgent(agent);
  const oneShotLocalRuntime = agent.runtime_kind === "codex_cli";
  const activeSession = useMemo(() => sessions.at(-1) ?? null, [sessions]);
  const messages: MessageRecord[] = useMemo(() => {
    if (oneShotLocalRuntime) {
      return sessions
        .flatMap((session) => messagesBySession[session.id] ?? [])
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
    }

    return activeSession ? messagesBySession[activeSession.id] ?? [] : [];
  }, [activeSession, messagesBySession, oneShotLocalRuntime, sessions]);
  const avatarStyle = useMemo(() => spriteSheetStyle(agentSheetUrl, agentFrameIndex(agent.status)), [agent.status]);
  const activityEvents = useMemo(
    () =>
      events
        .filter((event) => {
          if (!["status_changed", "file_touched", "waiting_user_input"].includes(event.type)) {
            return false;
          }

          if (event.type !== "status_changed") {
            return true;
          }

          const payload = JSON.parse(event.payload_json) as { status?: string };
          return ["thinking", "reading_files", "running_command", "editing_files", "waiting_user_input"].includes(
            payload.status ?? ""
          );
        })
        .sort((left, right) => left.created_at.localeCompare(right.created_at))
        .slice(-5),
    [events]
  );
  const timelineItems = useMemo(
    () =>
      [
        ...activityEvents.map((event) => ({ kind: "event" as const, at: event.created_at, event })),
        ...messages.map((message) => ({ kind: "message" as const, at: message.created_at, message }))
      ].sort((left, right) => left.at.localeCompare(right.at)),
    [activityEvents, messages]
  );

  const refreshSessions = async (): Promise<SessionRecord[]> => {
    const nextSessions = await window.codexOffice.sessions.listByAgent(agent.id);
    setSessions(nextSessions);
    if (nextSessions.length > 0) {
      await Promise.all(nextSessions.map((session) => hydrateSession(session.id)));
    }
    return nextSessions;
  };

  useEffect(() => {
    void refreshSessions();
  }, [agent.id]);

  useEffect(() => {
    void hydrateEvents({ agentId: agent.id });
  }, [agent.id, hydrateEvents]);

  const scheduleSessionRefresh = useCallback(
    (sessionId: string): void => {
      const current = sessionRefreshTimeoutsRef.current.get(sessionId);
      if (current) {
        clearTimeout(current);
      }

      const timeoutId = setTimeout(() => {
        sessionRefreshTimeoutsRef.current.delete(sessionId);
        void hydrateSession(sessionId);
      }, 120);

      sessionRefreshTimeoutsRef.current.set(sessionId, timeoutId);
    },
    [hydrateSession]
  );

  useEffect(() => {
    const unsubscribe = window.codexOffice.runtime.onEvent((event) => {
      if (event.agentId !== agent.id) {
        return;
      }

      onRuntimeEvent?.(event);
      if (shouldRefreshMessages(event) && (oneShotLocalRuntime || activeSession?.id === event.sessionId)) {
        scheduleSessionRefresh(event.sessionId);
      }
    });

    return unsubscribe;
  }, [agent.id, activeSession?.id, onRuntimeEvent, oneShotLocalRuntime, scheduleSessionRefresh]);

  useEffect(
    () => () => {
      for (const timeoutId of sessionRefreshTimeoutsRef.current.values()) {
        clearTimeout(timeoutId);
      }

      sessionRefreshTimeoutsRef.current.clear();
    },
    []
  );

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

  const startNewSessionWithMessage = async (message: string): Promise<void> => {
    await window.codexOffice.runtime.spawnAgent({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      workingDirectory: agent.working_directory,
      runtimeKind: agent.runtime_kind,
      permissionMode: agent.permission_mode,
      autoRunMode: agent.auto_run_mode,
      currentTask: message
    });
    await refreshSessions();
    setDraft("");
    setSubmitError(null);
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
      if (oneShotLocalRuntime) {
        await startNewSessionWithMessage(message);
        return;
      }

      const latest = (await refreshSessions()).at(-1);
      if (!latest || ["completed", "stopped", "failed"].includes(latest.status)) {
        await startNewSessionWithMessage(message);
      } else {
        const session = await ensureSession();
        await sendRuntimeMessage(session.id, message);
      }
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
        if (oneShotLocalRuntime) {
          await startNewSessionWithMessage(pendingMessage.message);
        } else {
          await sendRuntimeMessage(pendingMessage.sessionId, pendingMessage.message);
        }
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

  const formatMessageTime = (value: string): string =>
    new Date(value).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });

  const formatActivity = (event: EventRecord): string => {
    const payload = JSON.parse(event.payload_json) as {
      action?: string;
      command?: string;
      path?: string;
      prompt?: string;
      status?: string;
    };

    switch (event.type) {
      case "status_changed":
        switch (payload.status) {
          case "thinking":
            return "Thinking through the next reply";
          case "reading_files":
            return "Reviewing the current project context";
          case "running_command":
            return "Working through the next step";
          case "editing_files":
            return "Updating the project";
          case "waiting_user_input":
            return "Waiting for your next instruction";
          default:
            return "Thinking through the next reply";
        }
      case "file_touched":
        return `${payload.action ?? "Updated"} ${payload.path ?? "project files"}`;
      case "waiting_user_input":
        return payload.prompt?.trim() || "Waiting for manager input";
      default:
        return event.type;
    }
  };

  return (
    <section className="agent-chat">
      <div className="message-list">
        {timelineItems.length === 0 ? (
          <p className="empty-note">Start a conversation with this AI employee.</p>
        ) : (
          timelineItems.map((item) =>
            item.kind === "event" ? (
              <article className="chat-thread-note" key={item.event.id}>
                <span>{formatActivity(item.event)}</span>
                <small>{formatMessageTime(item.event.created_at)}</small>
              </article>
            ) : (
              <article className="chat-message" data-role={item.message.role} key={item.message.id}>
                {item.message.role !== "user" ? (
                  <span aria-hidden="true" className="chat-message-avatar">
                    {item.message.role === "agent" ? (
                      <span className="chat-message-avatar-sprite" style={avatarStyle} />
                    ) : (
                      <span className="chat-message-avatar-system">SYS</span>
                    )}
                  </span>
                ) : null}
                <div className="chat-message-bubble">
                  <div className="chat-message-meta">
                    <strong>{item.message.role === "user" ? "You" : item.message.role === "agent" ? agent.name : "System"}</strong>
                    <span>{formatMessageTime(item.message.created_at)}</span>
                  </div>
                  <p className="chat-message-text">{item.message.content}</p>
                </div>
              </article>
            )
          )
        )}
      </div>
      <form className="chat-form" onSubmit={(event) => void send(event)}>
        <textarea
          disabled={busy || readOnlyExternalAgent}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            readOnlyExternalAgent
              ? "Detected process is read-only"
              : oneShotLocalRuntime
                ? "Message this AI employee and start the next Codex run"
                : "Message this AI employee"
          }
          rows={3}
          value={draft}
        />
        <button disabled={busy || readOnlyExternalAgent || draft.trim().length === 0} type="submit">
          {busy ? "Sending..." : "Send"}
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
