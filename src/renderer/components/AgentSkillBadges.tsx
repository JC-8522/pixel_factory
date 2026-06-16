import { useEffect, type ReactElement } from "react";
import { useSkillStore } from "../stores/skillStore";

type AgentSkillBadgesProps = {
  agentId: string;
};

export function AgentSkillBadges({ agentId }: AgentSkillBadgesProps): ReactElement {
  const { skills, agentSkills, assignSkill, hydrate, hydrateForAgent, removeSkill, scan } = useSkillStore();
  const assignments = agentSkills[agentId] ?? [];
  const assignedIds = new Set(assignments.map((assignment) => assignment.skill_id));

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
        {skills
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
          ))}
      </div>
    </div>
  );
}
