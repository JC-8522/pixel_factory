import type { CreateAgentRequest } from "../../shared/ipc";
import type { RuntimeKind } from "../../shared/types/agent";
import type { JsonObject } from "../../shared/types/records";
import type { DatabaseClient } from "../db/client";
import { createMessage, createSession, getSession, type AgentRecord, type SessionRecord } from "../db/repositories";
import type { RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { buildAgentRuntimeContext } from "../context/contextBuilder";
import {
  attachSkillToRegisteredAgent,
  ensureRegisteredAgent,
  registerAgent
} from "../agentRegistry/agentRegistryService";
import { recordAuditEvent } from "../audit/auditEngine";
import { generateProfileSnapshot, type AgentProfileSnapshot } from "../profiles/profileService";
import { routeSessionMessage } from "../messageRouter/messageRouter";
import type { PermissionPolicyEngine } from "../security/permissionPolicy";
import { assignAgentToOfficeWorkstation } from "../office/officeService";

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

const bindAgentToWorkstation = (client: DatabaseClient, input: CreateAgentRequest): void => {
  if (!input.workstationId) {
    return;
  }

  assignAgentToOfficeWorkstation(client, {
    workstationId: input.workstationId,
    agentId: input.id
  });
};

const registerPreparedAgent = (
  client: DatabaseClient,
  input: CreateAgentRequest,
  nextId?: (prefix: string) => string
): AgentRecord =>
  client.transaction(() => {
    const agent = nextId ? ensureRegisteredAgent(client, input, nextId) : registerAgent(client, input);
    applySkillAssignments(client, input);
    bindAgentToWorkstation(client, input);
    return agent;
  });

export const createAgentThroughOrchestration = (client: DatabaseClient, input: CreateAgentRequest): AgentRecord => {
  const prepared = prepareCreateAgentInput(client, input);
  return registerPreparedAgent(client, prepared);
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
  const agent = registerPreparedAgent(client, prepared, nextId);
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
  const initialPrompt = prepared.currentTask?.trim() ? prepared.currentTask : null;
  const spawnWithInitialExec = runtimeKind === "codex_cli" && Boolean(initialPrompt);
  const initialUserMessage = spawnWithInitialExec
    ? createMessage(client, {
        id: nextId(`message-user-${session.id}`),
        sessionId: session.id,
        agentId: agent.id,
        role: "user",
        content: initialPrompt!
      })
    : null;
  const initialResponseMessage = spawnWithInitialExec
    ? createMessage(client, {
        id: nextId(`message-agent-${session.id}`),
        sessionId: session.id,
        agentId: agent.id,
        role: "agent",
        content: "",
        streamState: "streaming",
        parentMessageId: initialUserMessage?.id ?? null
      })
    : null;

  if (initialUserMessage) {
    recordAuditEvent(client, {
      id: nextId(`event-message-${initialUserMessage.id}`),
      type: "message_sent",
      actorType: "user",
      actorId: "local-user",
      agentId: agent.id,
      sessionId: session.id,
      payload: { messageId: initialUserMessage.id, role: "user", route: "human_to_agent" }
    });
  }

  await runtimeRegistry.spawn(runtimeKind, {
    agentId: agent.id,
    sessionId: session.id,
    workingDirectory: agent.working_directory,
    initialPrompt: spawnWithInitialExec ? initialPrompt : null,
    inputMessageId: initialUserMessage?.id ?? null,
    responseMessageId: initialResponseMessage?.id ?? null,
    modelProfile: session.model_profile,
    permissionMode: prepared.permissionMode,
    skillPromptContext: runtimeContext.skillPromptContext
  });

  if (!spawnWithInitialExec && initialPrompt) {
    await routeSessionMessage(
      client,
      runtimeRegistry,
      permissionPolicy,
      { sessionId: session.id, message: initialPrompt },
      nextId
    );
  }

  return getSession(client, session.id) ?? session;
};
