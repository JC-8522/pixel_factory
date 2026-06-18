import type { ReactElement } from "react";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { AgentRecord } from "../../shared/types/records";
import { AgentChat } from "./AgentChat";
import { AgentLogStream } from "./AgentLogStream";
import { AgentSkillBadges } from "./AgentSkillBadges";

type AgentDetailDrawerProps = {
  agent: AgentRecord | null;
  onClose(): void;
  onDelete?(agentId: string): Promise<void>;
  onRuntimeEvent?(event: AgentRuntimeEvent): void;
};

export function AgentDetailDrawer({ agent, onClose, onDelete, onRuntimeEvent }: AgentDetailDrawerProps): ReactElement {
  if (!agent) {
    return (
      <aside className="detail-panel" aria-label="Selected agent details">
        <p className="empty-note">Select an agent to inspect details.</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-label="Selected agent details">
      <div className="drawer-heading">
        <div>
          <p className="eyebrow">Selected agent</p>
          <h3>{agent.name}</h3>
        </div>
        <div className="drawer-actions">
          {onDelete ? (
            <button
              className="danger-button"
              onClick={() => void onDelete(agent.id)}
              type="button"
            >
              Delete Agent
            </button>
          ) : null}
          <button className="icon-button" onClick={onClose} type="button" title="Close details">
            x
          </button>
        </div>
      </div>
      <dl>
        <div>
          <dt>Role</dt>
          <dd>{agent.role}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{agent.status.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{agent.runtime_kind}</dd>
        </div>
        <div>
          <dt>Workspace</dt>
          <dd>{agent.working_directory}</dd>
        </div>
      </dl>
      <section>
        <h4>Skills</h4>
        <AgentSkillBadges agent={agent} />
      </section>
      <section>
        <h4>Chat</h4>
        <AgentChat agent={agent} onRuntimeEvent={onRuntimeEvent} />
      </section>
      <section>
        <h4>Logs</h4>
        <AgentLogStream agentId={agent.id} />
      </section>
    </aside>
  );
}
