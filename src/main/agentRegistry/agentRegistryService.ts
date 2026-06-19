import type { CreateAgentRequest } from "../../shared/ipc";
import type { DatabaseClient } from "../db/client";
import {
  assignSkillToAgent,
  createAgent,
  deleteAgent,
  getAgent,
  listAgentSkills,
  listAgents,
  removeSkillFromAgent,
  updateAgentPosition,
  type AgentRecord,
  type AgentSkillRecord
} from "../db/repositories";
import { recordAuditEvent } from "../audit/auditEngine";

const defaultDeskPosition = (agentCount: number): { x: number; y: number } => {
  const columns = 4;
  const startX = 110;
  const startY = 120;
  const gapX = 150;
  const gapY = 110;
  const index = Math.max(agentCount, 0);

  return {
    x: startX + (index % columns) * gapX,
    y: startY + Math.floor(index / columns) * gapY
  };
};

export const registerAgent = (client: DatabaseClient, input: CreateAgentRequest): AgentRecord => {
  const position = defaultDeskPosition(listAgents(client).length);
  const agent = createAgent(client, {
    id: input.id,
    name: input.name,
    role: input.role,
    workingDirectory: input.workingDirectory,
    runtimeKind: input.runtimeKind,
    permissionMode: input.permissionMode,
    autoRunMode: input.autoRunMode,
    profileId: input.profileId,
    profileSnapshot: input.profileSnapshot,
    currentTask: input.currentTask,
    metadata: input.metadata,
    positionX: position.x,
    positionY: position.y
  });

  recordAuditEvent(client, {
    id: `event-agent-created-${input.id}`,
    type: "agent_created",
    actorType: "user",
    actorId: "local-user",
    agentId: input.id,
    payload: { name: input.name, role: input.role }
  });

  return agent;
};

export const ensureRegisteredAgent = (
  client: DatabaseClient,
  input: CreateAgentRequest,
  nextId: (prefix: string) => string
): AgentRecord => {
  const existingAgent = getAgent(client, input.id);

  if (existingAgent) {
    return existingAgent;
  }

  const position = defaultDeskPosition(listAgents(client).length);
  const agent = createAgent(client, {
    id: input.id,
    name: input.name,
    role: input.role,
    workingDirectory: input.workingDirectory,
    runtimeKind: input.runtimeKind,
    permissionMode: input.permissionMode,
    autoRunMode: input.autoRunMode,
    profileId: input.profileId,
    profileSnapshot: input.profileSnapshot,
    currentTask: input.currentTask,
    metadata: input.metadata,
    positionX: position.x,
    positionY: position.y
  });

  recordAuditEvent(client, {
    id: nextId(`event-agent-created-${input.id}`),
    type: "agent_created",
    actorType: "user",
    actorId: "local-user",
    agentId: input.id,
    payload: { name: input.name, role: input.role }
  });

  return agent;
};

export const listRegisteredAgents = (client: DatabaseClient): AgentRecord[] => listAgents(client);

export const getRegisteredAgent = (client: DatabaseClient, agentId: string): AgentRecord | null =>
  getAgent(client, agentId);

export const unregisterAgent = (client: DatabaseClient, agentId: string): AgentRecord | null => {
  const removed = deleteAgent(client, agentId);

  if (removed) {
    recordAuditEvent(client, {
      id: `event-agent-deleted-${agentId}`,
      type: "agent_deleted",
      actorType: "user",
      actorId: "local-user",
      payload: { agentId, name: removed.name }
    });
  }

  return removed;
};

export const moveRegisteredAgent = (
  client: DatabaseClient,
  agentId: string,
  position: { x: number; y: number }
): AgentRecord => updateAgentPosition(client, agentId, position);

export const attachSkillToRegisteredAgent = (
  client: DatabaseClient,
  input: { agentId: string; skillId: string; assignedBy: string }
): AgentSkillRecord => {
  const assignment = assignSkillToAgent(client, input);
  recordAuditEvent(client, {
    id: `event-skill-${input.agentId}-${input.skillId}`,
    type: "skill_attached",
    actorType: "user",
    actorId: input.assignedBy,
    agentId: input.agentId,
    payload: { skillId: input.skillId }
  });
  return assignment;
};

export const detachSkillFromRegisteredAgent = (
  client: DatabaseClient,
  input: { agentId: string; skillId: string },
  nextId: (prefix: string) => string
): AgentSkillRecord | null => {
  const removed = removeSkillFromAgent(client, input);
  recordAuditEvent(client, {
    id: nextId(`event-skill-removed-${input.agentId}-${input.skillId}`),
    type: "skill_removed",
    actorType: "user",
    actorId: "local-user",
    agentId: input.agentId,
    payload: { skillId: input.skillId }
  });
  return removed;
};

export const listRegisteredAgentSkills = (client: DatabaseClient, agentId: string): AgentSkillRecord[] =>
  listAgentSkills(client, agentId);
