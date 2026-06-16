import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { AgentRecord, MessageRecord, SessionRecord } from "../../shared/types/records";
import { useChatStore } from "../stores/chatStore";

type AgentChatProps = {
  agent: AgentRecord;
  onRuntimeEvent?: (event: AgentRuntimeEvent) => void;
};

export function AgentChat({ agent, onRuntimeEvent }: AgentChatProps): ReactElement {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const { messagesBySession, hydrateSession } = useChatStore();

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

  const send = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) {
      return;
    }

    setBusy(true);
    setDraft("");
    try {
      const session = await ensureSession();
      await window.codexOffice.runtime.sendMessage(session.id, message);
      await hydrateSession(session.id);
      await refreshSessions();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="agent-chat">
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
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Send a message to this agent"
          value={draft}
        />
        <button disabled={busy || draft.trim().length === 0} type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
