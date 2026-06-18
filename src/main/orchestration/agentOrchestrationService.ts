import type { CreateAgentRequest } from "../../shared/ipc";
import type { RuntimeKind } from "../../shared/types/agent";
import type { JsonObject } from "../../shared/types/records";
import type { DatabaseClient } from "../db/client";
import { createSession, getSession, type AgentRecord, type SessionRecord } from "../db/repositories";
import type { RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { buildAgentRuntimeContext } from "../context/contextBuilder";
import {
  attachSkillToRegisteredAgent,
  ensureRegisteredAgent,
  registerAgent
} from "../agentRegistry/agentRegistryService";
import { generateProfileSnapshot, type AgentProfileSnapshot } from "../profiles/profileService";
import { routeSessionMessage } from "../messageRouter/messageRouter";
import type { PermissionPolicyEngine } from "../security/permissionPolicy";

const isRuntimeKind = (value: string): value is RuntimeKind => value === "mock" || value === "codex_cli";

const snapshotAsJson = (snapshot: AgentProfileSnapshot): JsonObject => snapshot as unknown as JsonObject;

const selectedSkillIds = (input: CreateAgentRequest, snapshot: AgentProfileSnapshot | null): string[] => {
  if (input.skillIds) {
    return [...new Set(input.skillIds)];
  }

  return snapshot ? [...new Set(snapshot.defaultSkills.map((skill) => skill.skillId))] : [];
};

const prepareCreateAgentInput = (client: DatabaseClient, input: CreateAgentRequest): CreateAgentRequest => {
  const snapshot = input.profileId ? generateProfileSnapshot(client, input.profileId) : null;

  return {
    ...input,
    profileSnapshot: snapshot ? snapshotAsJson(snapshot) : undefined,
    permissionMode: input.permissionMode || snapshot?.defaultPermissionMode || "ask",
    autoRunMode: input.autoRunMode || snapshot?.defaultAutoRunMode || "manual",
    modelProfile: input.modelProfile || snapshot?.defaultModelProfile || null,
    skillIds: selectedSkillIds(input, snapshot),
    metadata: {
      ...(input.metadata ?? {}),
      createdVia: "create_agent_flow",
      profileSnapshotGeneratedBy: snapshot ? "main_process" : undefined
    }
  };
};

const applySkillAssignments = (client: DatabaseClient, input: CreateAgentRequest): void => {
  for (const skillId of input.skillIds ?? []) {
    attachSkillToRegisteredAgent(client, {
      agentId: input.id,
      skillId,
      assignedBy: "local-user"
    });
  }
};

export const createAgentThroughOrchestration = (client: DatabaseClient, input: CreateAgentRequest): AgentRecord => {
  const prepared = prepareCreateAgentInput(client, input);
  const agent = registerAgent(client, prepared);
  applySkillAssignments(client, prepared);
  return agent;
};

export const spawnAgentThroughOrchestration = async (
  client: DatabaseClient,
  runtimeRegistry: RuntimeRegistry,
  permissionPolicy: PermissionPolicyEngine,
  input: CreateAgentRequest,
  nextId: (prefix: string) => string
): Promise<SessionRecord> => {
  if (!isRuntimeKind(input.runtimeKind)) {
    throw new Error("Unsupported runtime kind.");
  }
  const runtimeKind = input.runtimeKind;

  const prepared = prepareCreateAgentInput(client, input);
  const agent = ensureRegisteredAgent(client, prepared, nextId);
  applySkillAssignments(client, prepared);
  const session = createSession(client, {
    id: nextId(`session-${agent.id}`),
    agentId: agent.id,
    runtimeKind,
    status: "running",
    workingDirectory: agent.working_directory,
    initialPrompt: prepared.currentTask,
    modelProfile: prepared.modelProfile ?? null
  });

  const runtimeContext = buildAgentRuntimeContext(client, agent.id);
  await runtimeRegistry.spawn(runtimeKind, {
    agentId: agent.id,
    sessionId: session.id,
    workingDirectory: agent.working_directory,
    initialPrompt: null,
    modelProfile: session.model_profile,
    permissionMode: prepared.permissionMode,
    skillPromptContext: runtimeContext.skillPromptContext
  });

  if (prepared.currentTask?.trim()) {
    await routeSessionMessage(
      client,
      runtimeRegistry,
      permissionPolicy,
      { sessionId: session.id, message: prepared.currentTask },
      nextId
    );
  }

  return getSession(client, session.id) ?? session;
};
