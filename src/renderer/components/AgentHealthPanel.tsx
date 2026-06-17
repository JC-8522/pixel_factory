import type { ReactElement } from "react";
import type { AgentRecord, SessionRecord } from "../../shared/types/records";

type AgentHealthPanelProps = {
  agents: AgentRecord[];
  sessionsByAgent: Record<string, SessionRecord[]>;
  selectedAgentId: string | null;
  onSelectAgent(agentId: string): void;
};

const runtimeDuration = (session: SessionRecord | undefined): string => {
  if (!session) {
    return "No run yet";
  }

  const start = new Date(session.started_at).getTime();
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  const seconds = Math.max(0, Math.round((end - start) / 1000));
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export function AgentHealthPanel({
  agents,
  sessionsByAgent,
  selectedAgentId,
  onSelectAgent
}: AgentHealthPanelProps): ReactElement {
  return (
    <section className="ops-panel" aria-label="Agent health">
      <div className="panel-heading">
        <h3>Agent Health</h3>
        <span>{agents.length} agents</span>
      </div>
      <div className="health-list">
        {agents.map((agent) => {
          const sessions = sessionsByAgent[agent.id] ?? [];
          const latestSession = sessions.at(-1);
          return (
            <button
              className={selectedAgentId === agent.id ? "health-row active" : "health-row"}
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              type="button"
            >
              <strong>{agent.name}</strong>
              <span>{agent.status}</span>
              <small>{latestSession ? latestSession.status : "no session"}</small>
              <small>{runtimeDuration(latestSession)}</small>
              {latestSession?.error_message ? <em>{latestSession.error_message}</em> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
