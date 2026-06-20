import type { ReactElement } from "react";
import type { AgentRecord } from "../../shared/types/records";
import { agentFrameIndex, agentSheetUrl, spriteSheetStyle } from "../office/officeLayout";
import { AgentChat } from "./AgentChat";
import { AgentLogStream } from "./AgentLogStream";
import { AgentSkillBadges } from "./AgentSkillBadges";

type AgentDetailDrawerProps = {
  agent: AgentRecord | null;
  onClose(): void;
  onDelete?(agentId: string): Promise<void>;
  className?: string;
  headingEyebrow?: string;
  showSkills?: boolean;
  showLogs?: boolean;
};

export function AgentDetailDrawer({
  agent,
  onClose,
  onDelete,
  className,
  headingEyebrow = "Selected agent",
  showSkills = true,
  showLogs = true
}: AgentDetailDrawerProps): ReactElement {
  const panelClassName = className ?? "detail-panel";

  if (!agent) {
    return (
      <aside aria-label="Selected agent details" className={panelClassName} data-agent-id="">
        <p className="empty-note">Select an agent to inspect details.</p>
      </aside>
    );
  }

  const avatarStyle = spriteSheetStyle(agentSheetUrl, agentFrameIndex(agent.status));

  return (
    <aside aria-label="Selected agent details" className={panelClassName} data-agent-id={agent.id}>
      <div className="drawer-heading conversation-panel-header">
        <div className="conversation-panel-identity">
          <span aria-hidden="true" className="conversation-panel-avatar">
            <span className="conversation-panel-avatar-sprite" style={avatarStyle} />
          </span>
          <div className="agent-panel-hero conversation-panel-copy">
            <p className="eyebrow">{headingEyebrow}</p>
            <h3>{agent.name}</h3>
          </div>
        </div>
        <div className="drawer-actions">
          {onDelete ? (
            <button className="danger-button" onClick={() => void onDelete(agent.id)} type="button">
              Remove AI Employee
            </button>
          ) : null}
          <button className="icon-button" onClick={onClose} type="button" title="Close details">
            x
          </button>
        </div>
      </div>

      <section className="conversation-panel-chat">
        <AgentChat agent={agent} />
      </section>

      {showSkills ? (
        <section>
          <h4>Skills</h4>
          <AgentSkillBadges agent={agent} />
        </section>
      ) : null}

      {showLogs ? (
        <section>
          <h4>Logs</h4>
          <AgentLogStream agentId={agent.id} />
        </section>
      ) : null}
    </aside>
  );
}
