import type { DatabaseClient } from "../db/client";
import { getAgentProfile } from "../db/repositories";
import { buildProfileSkillPromptContext, buildSkillPromptContext } from "../skills/buildSkillPromptContext";

export type AgentRuntimeContext = {
  skillPromptContext: string;
};

const buildProfileInstructionContext = (client: DatabaseClient, profileId: string): string => {
  const profile = getAgentProfile(client, profileId);
  if (!profile) {
    return "";
  }

  const facts = [
    `- Name: ${profile.name}`,
    `- Role: ${profile.role}`,
    profile.description ? `- Description: ${profile.description}` : null,
    profile.persona ? `- Persona: ${profile.persona}` : null,
    profile.communication_style ? `- Communication style: ${profile.communication_style}` : null,
    profile.risk_tolerance ? `- Risk tolerance: ${profile.risk_tolerance}` : null,
    profile.instructions ? `- Instructions: ${profile.instructions}` : null
  ].filter((fact): fact is string => Boolean(fact));

  if (facts.length === 0) {
    return "";
  }

  return ["Selected execution profile:", ...facts].join("\n");
};

export const buildAgentRuntimeContext = (client: DatabaseClient, agentId: string, profileId?: string | null): AgentRuntimeContext => {
  if (!profileId) {
    return {
      skillPromptContext: buildSkillPromptContext(client, agentId)
    };
  }

  return {
    skillPromptContext: [buildProfileInstructionContext(client, profileId), buildProfileSkillPromptContext(client, profileId)]
      .filter((section) => section.trim().length > 0)
      .join("\n\n")
  };
};
