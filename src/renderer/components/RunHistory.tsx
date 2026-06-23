import type { ReactElement } from "react";
import type { MessageRecord, SessionRecord } from "../../shared/types/records";

type RunHistoryProps = {
  sessions: SessionRecord[];
  messagesBySession: Record<string, MessageRecord[]>;
  selectedSessionId: string | null;
  onSelectSession(sessionId: string): void;
};

export function RunHistory({
  sessions,
  messagesBySession,
  selectedSessionId,
  onSelectSession
}: RunHistoryProps): ReactElement {
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions.at(-1) ?? null;
  const messages = selectedSession ? messagesBySession[selectedSession.id] ?? [] : [];

  return (
    <section className="ops-panel run-history" aria-label="Run history">
      <div className="panel-heading">
        <h3>Run History</h3>
        <span>{sessions.length} runs</span>
      </div>
      <div className="run-grid">
        <div className="run-list">
          {sessions.map((session) => (
            <button
              className={selectedSession?.id === session.id ? "run-row active" : "run-row"}
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              type="button"
            >
              <strong>{session.status}</strong>
              <span>{session.started_at.slice(0, 16).replace("T", " ")}</span>
              <small>{session.total_tokens} tokens</small>
            </button>
          ))}
          {sessions.length === 0 ? <p className="empty-note">No archived runs yet.</p> : null}
        </div>
        <div className="run-detail">
          {selectedSession ? (
            <>
              <dl className="compact-facts">
                <div>
                  <dt>Prompt</dt>
                  <dd>{selectedSession.initial_prompt ?? "No initial prompt"}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{selectedSession.model_profile ?? "default"}</dd>
                </div>
                <div>
                  <dt>Cost</dt>
                  <dd>{selectedSession.estimated_cost ? `$${selectedSession.estimated_cost.toFixed(4)}` : "$0.0000"}</dd>
                </div>
              </dl>
              <div className="run-history-message-list">
                {messages.map((message) => (
                  <article className="run-history-message-card" data-role={message.role} key={message.id}>
                    <strong>{message.role}</strong>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-note">Select an agent to inspect run details.</p>
          )}
        </div>
      </div>
    </section>
  );
}
