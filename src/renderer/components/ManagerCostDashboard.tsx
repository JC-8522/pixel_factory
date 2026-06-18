import type { ReactElement } from "react";
import type { TokenUsageSummary } from "../../shared/ipc";
import type { AgentRecord, TokenUsageRecord } from "../../shared/types/records";

type ManagerCostDashboardProps = {
  agents: AgentRecord[];
  selectedAgentId: string | null;
  summariesByAgent: Record<string, TokenUsageSummary>;
  usageByAgent: Record<string, TokenUsageRecord[]>;
};

export function ManagerCostDashboard({
  agents,
  selectedAgentId,
  summariesByAgent,
  usageByAgent
}: ManagerCostDashboardProps): ReactElement {
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const selectedUsage = selectedAgent ? usageByAgent[selectedAgent.id] ?? [] : [];
  const totalTokens = agents.reduce((sum, agent) => sum + (summariesByAgent[agent.id]?.total_tokens ?? 0), 0);
  const totalCost = agents.reduce((sum, agent) => sum + (summariesByAgent[agent.id]?.estimated_cost ?? 0), 0);

  return (
    <section className="ops-panel cost-dashboard" aria-label="Manager cost dashboard">
      <div className="panel-heading">
        <h3>Manager Cost</h3>
        <span>{totalTokens} tokens / ${totalCost.toFixed(4)}</span>
      </div>
      <div className="cost-grid">
        {agents.map((agent) => {
          const summary = summariesByAgent[agent.id] ?? {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            estimated_cost: 0
          };
          return (
            <article className="cost-card" key={agent.id}>
              <strong>{agent.name}</strong>
              <span>{summary.total_tokens} tokens</span>
              <small>${summary.estimated_cost.toFixed(4)}</small>
            </article>
          );
        })}
      </div>
      <div className="usage-table" aria-label="Usage source details">
        {selectedUsage.slice(-6).map((usage) => (
          <div className="usage-row" key={usage.id}>
            <span>{usage.model_profile ?? "default"}</span>
            <span>{usage.total_tokens} tokens</span>
            <span>{usage.usage_source}</span>
            <span>{usage.estimated_cost ? `$${usage.estimated_cost.toFixed(4)}` : "$0.0000"}</span>
          </div>
        ))}
        {selectedUsage.length === 0 ? <p className="empty-note">No token usage recorded for the selected agent.</p> : null}
      </div>
    </section>
  );
}
