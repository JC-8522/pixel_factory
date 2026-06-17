import type { DatabaseClient } from "../db/client";
import { buildSkillPromptContext } from "../skills/buildSkillPromptContext";

export type AgentRuntimeContext = {
  skillPromptContext: string;
};

export const buildAgentRuntimeContext = (client: DatabaseClient, agentId: string): AgentRuntimeContext => ({
  skillPromptContext: buildSkillPromptContext(client, agentId)
});
