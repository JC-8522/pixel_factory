import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from "react";
import type { PermissionRequestRecord, RuntimeSendMessageResult } from "../../shared/ipc";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { AgentRecord, MessageRecord, SessionRecord } from "../../shared/types/records";
import { agentFrameIndex, agentSheetUrl, spriteSheetStyle } from "../office/officeLayout";
import { useChatStore } from "../stores/chatStore";
import { PermissionDecisionDialog } from "./PermissionDecisionDialog";

type AgentChatProps = {
  agent: AgentRecord;
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

const isTerminalSession = (status: string): boolean => ["completed", "stopped", "failed"].includes(status);

const sameSessions = (left: SessionRecord[], right: SessionRecord[]): boolean =>
  left.length === right.length &&
  left.every(
    (session, index) =>
      session.id === right[index]?.id &&
      session.status === right[index]?.status &&
      session.ended_at === right[index]?.ended_at
  );

const roleLabel = (role: string, agentName: string): string =>
  role === "user" ? "You" : role === "agent" ? agentName : "System";

const describeAgentStatus = (
  status: string
): { label: string; detail: string | null; tone: "working" | "waiting" | "error" } | null => {
  switch (status) {
    case "thinking":
      return { label: "Thinking through the next reply", detail: null, tone: "working" };
    case "reading_files":
      return { label: "Reviewing the current project context", detail: null, tone: "working" };
    case "running_command":
      return { label: "Working through the next step", detail: null, tone: "working" };
    case "editing_files":
      return { label: "Updating the project", detail: null, tone: "working" };
    case "waiting_user_input":
      return { label: "Waiting for your next instruction", detail: null, tone: "waiting" };
    case "error":
      return { label: "Run hit an error", detail: null, tone: "error" };
    default:
      return null;
  }
};

const trimDetail = (value: string | null | undefined, max = 120): string | null => {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return null;
  }

  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
};

type LiveActivity = {
  label: string;
  detail: string | null;
  tone: "working" | "waiting" | "error";
  updatedAt: string;
};

const activityFromEvent = (event: AgentRuntimeEvent): LiveActivity | null => {
  switch (event.type) {
    case "status_changed": {
      const activity = describeAgentStatus(event.status);
      return activity ? { ...activity, updatedAt: event.at } : null;
    }
    case "command_started":
      return {
        label: "Running a command",
        detail: trimDetail(event.command),
        tone: "working",
        updatedAt: event.at
      };
    case "command_completed":
      return {
        label: "Command finished",
        detail: trimDetail(event.command),
        tone: event.exitCode === 0 ? "working" : "error",
        updatedAt: event.at
      };
    case "file_touched":
      return {
        label: "Updating files",
        detail: trimDetail(`${event.action} ${event.path}`),
        tone: "working",
        updatedAt: event.at
      };
    case "waiting_user_input":
      return {
        label: "Waiting for your next instruction",
        detail: trimDetail(event.prompt),
        tone: "waiting",
        updatedAt: event.at
      };
    case "error":
      return {
        label: "Run hit an error",
        detail: trimDetail(event.message),
        tone: "error",
        updatedAt: event.at
      };
    case "session_completed":
      return null;
    case "session_stopped":
      return {
        label: "Session stopped",
        detail: null,
        tone: "error",
        updatedAt: event.at
      };
    default:
      return null;
  }
};

type TimeoutHandle = ReturnType<typeof setTimeout>;

export function AgentChat({ agent }: AgentChatProps): ReactElement {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequestRecord | null>(null);
  const [pendingMessage, setPendingMessage] = useState<{ sessionId: string; message: string } | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [liveActivity, setLiveActivity] = useState<LiveActivity | null>(() => {
    const initial = describeAgentStatus(agent.status);
    return initial ? { ...initial, updatedAt: new Date().toISOString() } : null;
  });
  const sessionRefreshTimeoutsRef = useRef(new Map<string, TimeoutHandle>());
  const hydratedSessionIdsRef = useRef(new Set<string>());
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
  const { messagesBySession, hydrateSession } = useChatStore();

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
  const refreshSessions = useCallback(async (): Promise<SessionRecord[]> => {
    const nextSessions = await window.codexOffice.sessions.listByAgent(agent.id);
    setSessions((current) => (sameSessions(current, nextSessions) ? current : nextSessions));

    const sessionsToHydrate = oneShotLocalRuntime
      ? nextSessions.filter((session) => !hydratedSessionIdsRef.current.has(session.id))
      : nextSessions.at(-1)
        ? [nextSessions.at(-1) as SessionRecord]
        : [];

    if (sessionsToHydrate.length > 0) {
      await Promise.all(
        sessionsToHydrate.map(async (session) => {
          hydratedSessionIdsRef.current.add(session.id);
          await hydrateSession(session.id);
        })
      );
    }

    return nextSessions;
  }, [agent.id, hydrateSession, oneShotLocalRuntime]);

  useEffect(() => {
    hydratedSessionIdsRef.current.clear();
    const initial = describeAgentStatus(agent.status);
    setLiveActivity(initial ? { ...initial, updatedAt: new Date().toISOString() } : null);
    void refreshSessions();
  }, [agent.id, refreshSessions]);

  const scheduleSessionRefresh = useCallback(
    (sessionId: string): void => {
      const current = sessionRefreshTimeoutsRef.current.get(sessionId);
      if (current) {
        clearTimeout(current);
      }

      const timeoutId = setTimeout(() => {
        sessionRefreshTimeoutsRef.current.delete(sessionId);
        hydratedSessionIdsRef.current.add(sessionId);
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

      const nextActivity = activityFromEvent(event);
      if (nextActivity || event.type === "session_completed") {
        setLiveActivity(nextActivity);
      }
      if (shouldRefreshMessages(event) && (oneShotLocalRuntime || activeSession?.id === event.sessionId)) {
        scheduleSessionRefresh(event.sessionId);
      }
    });

    return unsubscribe;
  }, [agent.id, activeSession?.id, oneShotLocalRuntime, scheduleSessionRefresh]);

  useEffect(
    () => () => {
      for (const timeoutId of sessionRefreshTimeoutsRef.current.values()) {
        clearTimeout(timeoutId);
      }

      sessionRefreshTimeoutsRef.current.clear();
    },
    []
  );

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ block: "end" });
  }, [liveActivity, messages]);

  const ensureSession = async (): Promise<SessionRecord> => {
    if (readOnlyExternalAgent) {
      throw new Error("Detected external Codex processes are read-only in MVP.");
    }

    const latest = (await refreshSessions()).at(-1);
    if (latest && !isTerminalSession(latest.status)) {
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
      if (!latest || isTerminalSession(latest.status)) {
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

  const showLiveActivity =
    liveActivity &&
    (!activeSession || !isTerminalSession(activeSession.status) || liveActivity.tone === "waiting" || liveActivity.tone === "error");

  return (
    <section className="agent-chat">
      <div className="message-list">
        {messages.length === 0 ? (
          <p className="empty-note">Start a conversation with this AI employee.</p>
        ) : (
          messages.map((message) => {
            const isStreaming = message.role === "agent" && message.stream_state === "streaming";
            const isEmptyStreamingBubble = isStreaming && message.content.trim().length === 0;

            return (
              <article className="chat-message" data-role={message.role} data-streaming={isStreaming} key={message.id}>
                {message.role !== "user" ? (
                  <span aria-hidden="true" className="chat-message-avatar">
                    {message.role === "agent" ? (
                      <span className="chat-message-avatar-sprite" style={avatarStyle} />
                    ) : (
                      <span className="chat-message-avatar-system">SYS</span>
                    )}
                  </span>
                ) : null}
                <div className="chat-message-bubble">
                  <div className="chat-message-meta">
                    <strong>{roleLabel(message.role, agent.name)}</strong>
                    <span>{formatMessageTime(message.created_at)}</span>
                  </div>
                  {isEmptyStreamingBubble ? (
                    <div aria-label="AI employee is replying" className="chat-stream-indicator" role="status">
                      <span className="chat-stream-indicator-dot" />
                      <span className="chat-stream-indicator-dot" />
                      <span className="chat-stream-indicator-dot" />
                    </div>
                  ) : (
                    <p className="chat-message-text">{message.content}</p>
                  )}
                </div>
              </article>
            );
          })
        )}
        <div ref={bottomAnchorRef} />
      </div>
      {showLiveActivity ? (
        <div className={`chat-live-status is-${liveActivity.tone}`}>
          <span aria-hidden="true" className="chat-live-status-dot" />
          <div className="chat-live-status-copy">
            <strong>{liveActivity.label}</strong>
            {liveActivity.detail ? <span>{liveActivity.detail}</span> : null}
          </div>
          <small>{formatMessageTime(liveActivity.updatedAt)}</small>
        </div>
      ) : null}
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
