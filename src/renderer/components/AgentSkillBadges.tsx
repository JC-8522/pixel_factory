import { useEffect, type ReactElement } from "react";
import type { AgentRecord } from "../../shared/types/records";
import { useSkillStore } from "../stores/skillStore";

type AgentSkillBadgesProps = {
  agent: AgentRecord;
};

const isReadOnlySkillAgent = (agent: AgentRecord): boolean => {
  try {
    const metadata = JSON.parse(agent.metadata_json) as { detected?: boolean };
    return metadata.detected === true || agent.runtime_kind === "codex_cli_attached" || agent.permission_mode === "external" || agent.auto_run_mode === "external";
  } catch {
    return agent.runtime_kind === "codex_cli_attached" || agent.permission_mode === "external" || agent.auto_run_mode === "external";
  }
};

export function AgentSkillBadges({ agent }: AgentSkillBadgesProps): ReactElement {
  const agentId = agent.id;
  const { skills, agentSkills, assignSkill, hydrate, hydrateForAgent, removeSkill, scan } = useSkillStore();
  const assignments = agentSkills[agentId] ?? [];
  const assignedIds = new Set(assignments.map((assignment) => assignment.skill_id));
  const readOnly = isReadOnlySkillAgent(agent);

  useEffect(() => {
    void hydrate();
    void hydrateForAgent(agentId);
  }, [agentId, hydrate, hydrateForAgent]);

  return (
    <div className="skill-panel">
      <div className="skill-badges">
        {assignments.length === 0 ? (
          <p className="empty-note">No skills assigned.</p>
        ) : (
          assignments.map((assignment) => {
            const skill = skills.find((item) => item.id === assignment.skill_id);
            return (
              <button
                className="skill-badge"
                key={assignment.skill_id}
                onClick={() => void removeSkill({ agentId, skillId: assignment.skill_id })}
                title="Remove skill"
                type="button"
              >
                {skill?.name ?? assignment.skill_id}
              </button>
            );
          })
        )}
      </div>
      <div className="skill-actions">
        <button onClick={() => void scan()} type="button">Scan</button>
        {readOnly ? (
          <p className="empty-note">Detected external agents are read-only in MVP.</p>
        ) : (
          skills
            .filter((skill) => !assignedIds.has(skill.id))
            .slice(0, 6)
            .map((skill) => (
              <button
                key={skill.id}
                onClick={() => void assignSkill({ agentId, skillId: skill.id, assignedBy: "local-user" })}
                type="button"
              >
                + {skill.name}
              </button>
            ))
        )}
      </div>
    </div>
  );
}
