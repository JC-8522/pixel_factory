import type { DatabaseClient } from "../client";
import { boolToInt, jsonStringify, nowIso, nullable } from "./utils";

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  profile_id: string | null;
  profile_snapshot_json: string;
  status: string;
  current_task: string | null;
  working_directory: string;
  current_branch: string | null;
  last_command: string | null;
  runtime_kind: string;
  permission_mode: string;
  auto_run_mode: string;
  position_x: number;
  position_y: number;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

export type CreateAgentInput = {
  id: string;
  name: string;
  role: string;
  workingDirectory: string;
  runtimeKind: string;
  permissionMode: string;
  autoRunMode: string;
  profileId?: string | null;
  profileSnapshot?: unknown;
  currentTask?: string | null;
  currentBranch?: string | null;
  lastCommand?: string | null;
  positionX?: number;
  positionY?: number;
  metadata?: unknown;
};

export type AgentSkillRecord = {
  agent_id: string;
  skill_id: string;
  assigned_at: string;
  assigned_by: string;
};

export const createAgent = (client: DatabaseClient, input: CreateAgentInput): AgentRecord => {
  const timestamp = nowIso();

  client.run(
    `INSERT INTO agents (
      id,
      name,
      role,
      profile_id,
      profile_snapshot_json,
      status,
      current_task,
      working_directory,
      current_branch,
      last_command,
      runtime_kind,
      permission_mode,
      auto_run_mode,
      position_x,
      position_y,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.name,
      input.role,
      nullable(input.profileId),
      jsonStringify(input.profileSnapshot, "{}"),
      "idle",
      nullable(input.currentTask),
      input.workingDirectory,
      nullable(input.currentBranch),
      nullable(input.lastCommand),
      input.runtimeKind,
      input.permissionMode,
      input.autoRunMode,
      input.positionX ?? 0,
      input.positionY ?? 0,
      jsonStringify(input.metadata, "{}"),
      timestamp,
      timestamp
    ]
  );

  return getAgent(client, input.id) as AgentRecord;
};

export const getAgent = (client: DatabaseClient, agentId: string): AgentRecord | null =>
  client.get<AgentRecord>("SELECT * FROM agents WHERE id = ?", [agentId]);

export const listAgents = (client: DatabaseClient): AgentRecord[] =>
  client.all<AgentRecord>("SELECT * FROM agents ORDER BY created_at ASC");

export const deleteAgent = (client: DatabaseClient, agentId: string): AgentRecord | null => {
  const existing = getAgent(client, agentId);
  if (!existing) {
    return null;
  }

  client.transaction(() => {
    client.run("DELETE FROM token_usage WHERE session_id IN (SELECT id FROM sessions WHERE agent_id = ?)", [agentId]);
    client.run("DELETE FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE agent_id = ?)", [agentId]);
    client.run("DELETE FROM sessions WHERE agent_id = ?", [agentId]);
    client.run("DELETE FROM agent_skills WHERE agent_id = ?", [agentId]);
    client.run("DELETE FROM meeting_participants WHERE agent_id = ?", [agentId]);
    client.run("UPDATE tasks SET assigned_agent_id = NULL WHERE assigned_agent_id = ?", [agentId]);
    client.run("UPDATE meetings SET moderator_agent_id = NULL WHERE moderator_agent_id = ?", [agentId]);
    client.run("UPDATE meeting_messages SET agent_id = NULL WHERE agent_id = ?", [agentId]);
    client.run("UPDATE messages SET agent_id = NULL WHERE agent_id = ?", [agentId]);
    client.run("UPDATE token_usage SET agent_id = NULL WHERE agent_id = ?", [agentId]);
    client.run("UPDATE events SET agent_id = NULL WHERE agent_id = ?", [agentId]);
    client.run("DELETE FROM agents WHERE id = ?", [agentId]);
  });

  return existing;
};

export const updateAgentStatus = (client: DatabaseClient, agentId: string, status: string): AgentRecord => {
  client.run("UPDATE agents SET status = ?, updated_at = ? WHERE id = ?", [status, nowIso(), agentId]);
  const agent = getAgent(client, agentId);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  return agent;
};

export const updateAgentPosition = (
  client: DatabaseClient,
  agentId: string,
  position: { x: number; y: number }
): AgentRecord => {
  client.run("UPDATE agents SET position_x = ?, position_y = ?, updated_at = ? WHERE id = ?", [
    position.x,
    position.y,
    nowIso(),
    agentId
  ]);
  const agent = getAgent(client, agentId);

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  return agent;
};

export const assignSkillToAgent = (
  client: DatabaseClient,
  input: { agentId: string; skillId: string; assignedBy: string }
): AgentSkillRecord => {
  const assignedAt = nowIso();
  client.run(
    `INSERT INTO agent_skills (agent_id, skill_id, assigned_at, assigned_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(agent_id, skill_id) DO UPDATE SET assigned_at = excluded.assigned_at, assigned_by = excluded.assigned_by`,
    [input.agentId, input.skillId, assignedAt, input.assignedBy]
  );

  return client.get<AgentSkillRecord>("SELECT * FROM agent_skills WHERE agent_id = ? AND skill_id = ?", [
    input.agentId,
    input.skillId
  ]) as AgentSkillRecord;
};

export const assignSkillRequiredFlag = (
  client: DatabaseClient,
  input: { profileId: string; skillId: string; required: boolean }
): void => {
  client.run(
    `INSERT INTO agent_profile_skills (profile_id, skill_id, required, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(profile_id, skill_id) DO UPDATE SET required = excluded.required`,
    [input.profileId, input.skillId, boolToInt(input.required), nowIso()]
  );
};

export const listAgentSkills = (client: DatabaseClient, agentId: string): AgentSkillRecord[] =>
  client.all<AgentSkillRecord>("SELECT * FROM agent_skills WHERE agent_id = ? ORDER BY assigned_at ASC", [agentId]);

export const removeSkillFromAgent = (
  client: DatabaseClient,
  input: { agentId: string; skillId: string }
): AgentSkillRecord | null => {
  const existing = client.get<AgentSkillRecord>("SELECT * FROM agent_skills WHERE agent_id = ? AND skill_id = ?", [
    input.agentId,
    input.skillId
  ]);
  client.run("DELETE FROM agent_skills WHERE agent_id = ? AND skill_id = ?", [input.agentId, input.skillId]);
  return existing ?? null;
};
