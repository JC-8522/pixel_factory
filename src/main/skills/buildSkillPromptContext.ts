import type { DatabaseClient } from "../db/client";
import { getSkill, listAgentSkills, listProfileSkills, type SkillRecord } from "../db/repositories";

const isSkillRecord = (skill: SkillRecord | null): skill is SkillRecord => skill !== null;

const renderSkillPromptContext = (heading: string, skills: SkillRecord[]): string => {
  if (skills.length === 0) {
    return "";
  }

  return [heading, ...skills.map((skill) => `- ${skill.name}: ${skill.description ?? "No description provided."}`)].join("\n");
};

export const buildSkillPromptContext = (client: DatabaseClient, agentId: string): string => {
  const skills = listAgentSkills(client, agentId).map((assignment) => getSkill(client, assignment.skill_id)).filter(isSkillRecord);

  return renderSkillPromptContext("Assigned skills for this agent:", skills);
};

export const buildProfileSkillPromptContext = (client: DatabaseClient, profileId: string): string => {
  const skills = listProfileSkills(client, profileId)
    .map((assignment) => getSkill(client, assignment.skill_id))
    .filter(isSkillRecord);

  return renderSkillPromptContext("Assigned skills for this profile:", skills);
};
