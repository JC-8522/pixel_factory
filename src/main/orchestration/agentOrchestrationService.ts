import type { CreateAgentRequest } from "../../shared/ipc";
import type { RuntimeKind } from "../../shared/types/agent";
import type { DatabaseClient } from "../db/client";
import { createSession, getSession, type AgentRecord, type SessionRecord } from "../db/repositories";
import type { RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { buildAgentRuntimeContext } from "../context/contextBuilder";
import { ensureRegisteredAgent, registerAgent } from "../agentRegistry/agentRegistryService";

const isRuntimeKind = (value: string): value is RuntimeKind => value === "mock" || value === "codex_cli";

export const createAgentThroughOrchestration = (client: DatabaseClient, input: CreateAgentRequest): AgentRecord =>
  registerAgent(client, input);

export const spawnAgentThroughOrchestration = async (
  client: DatabaseClient,
  runtimeRegistry: RuntimeRegistry,
  input: CreateAgentRequest,
  nextId: (prefix: string) => string
): Promise<SessionRecord> => {
  if (!isRuntimeKind(input.runtimeKind)) {
    throw new Error("Unsupported runtime kind.");
  }

  const agent = ensureRegisteredAgent(client, input, nextId);
  const session = createSession(client, {
    id: nextId(`session-${agent.id}`),
    agentId: agent.id,
    runtimeKind: input.runtimeKind,
    status: "running",
    workingDirectory: agent.working_directory,
    initialPrompt: input.currentTask,
    modelProfile: typeof input.profileSnapshot?.defaultModelProfile === "string" ? input.profileSnapshot.defaultModelProfile : null
  });

  const runtimeContext = buildAgentRuntimeContext(client, agent.id);
  await runtimeRegistry.spawn(input.runtimeKind, {
    agentId: agent.id,
    sessionId: session.id,
    workingDirectory: agent.working_directory,
    initialPrompt: input.currentTask,
    modelProfile: session.model_profile,
    permissionMode: input.permissionMode,
    skillPromptContext: runtimeContext.skillPromptContext
  });

  return getSession(client, session.id) ?? session;
};
