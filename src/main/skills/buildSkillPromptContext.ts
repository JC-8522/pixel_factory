import type { DatabaseClient } from "../db/client";
import { getSkill, listAgentSkills, type SkillRecord } from "../db/repositories";

const isSkillRecord = (skill: SkillRecord | null): skill is SkillRecord => skill !== null;

export const buildSkillPromptContext = (client: DatabaseClient, agentId: string): string => {
  const skills = listAgentSkills(client, agentId)
    .map((assignment) => getSkill(client, assignment.skill_id))
    .filter(isSkillRecord);

  if (skills.length === 0) {
    return "";
  }

  return [
    "Assigned skills for this agent:",
    ...skills.map((skill) => `- ${skill.name}: ${skill.description ?? "No description provided."}`)
  ].join("\n");
};
