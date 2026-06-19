import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type WorkstationRecord = {
  id: string;
  floor_id: string;
  slot_key: string;
  name: string | null;
  assigned_agent_id: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

export type CreateWorkstationInput = {
  id: string;
  floorId: string;
  slotKey: string;
  name?: string | null;
  metadata?: unknown;
};

export const createWorkstation = (client: DatabaseClient, input: CreateWorkstationInput): WorkstationRecord => {
  const timestamp = nowIso();
  client.run(
    `INSERT INTO workstations (
      id,
      floor_id,
      slot_key,
      name,
      assigned_agent_id,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.floorId,
      input.slotKey,
      nullable(input.name ?? null),
      null,
      jsonStringify(input.metadata, "{}"),
      timestamp,
      timestamp
    ]
  );

  return getWorkstation(client, input.id) as WorkstationRecord;
};

export const getWorkstation = (client: DatabaseClient, workstationId: string): WorkstationRecord | null =>
  client.get<WorkstationRecord>("SELECT * FROM workstations WHERE id = ?", [workstationId]);

export const getWorkstationBySlot = (
  client: DatabaseClient,
  floorId: string,
  slotKey: string
): WorkstationRecord | null =>
  client.get<WorkstationRecord>("SELECT * FROM workstations WHERE floor_id = ? AND slot_key = ?", [floorId, slotKey]);

export const getWorkstationByAssignedAgent = (
  client: DatabaseClient,
  agentId: string
): WorkstationRecord | null =>
  client.get<WorkstationRecord>("SELECT * FROM workstations WHERE assigned_agent_id = ?", [agentId]);

export const listWorkstations = (client: DatabaseClient, floorId?: string): WorkstationRecord[] => {
  if (floorId) {
    return client.all<WorkstationRecord>(
      "SELECT * FROM workstations WHERE floor_id = ? ORDER BY slot_key ASC, created_at ASC",
      [floorId]
    );
  }

  return client.all<WorkstationRecord>("SELECT * FROM workstations ORDER BY floor_id ASC, slot_key ASC, created_at ASC");
};

export const assignWorkstationAgent = (
  client: DatabaseClient,
  workstationId: string,
  agentId: string | null
): WorkstationRecord => {
  client.run("UPDATE workstations SET assigned_agent_id = ?, updated_at = ? WHERE id = ?", [
    nullable(agentId),
    nowIso(),
    workstationId
  ]);

  const workstation = getWorkstation(client, workstationId);
  if (!workstation) {
    throw new Error(`Workstation not found: ${workstationId}`);
  }

  return workstation;
};

export const releaseAgentWorkstation = (client: DatabaseClient, agentId: string): WorkstationRecord | null => {
  const workstation = getWorkstationByAssignedAgent(client, agentId);
  if (!workstation) {
    return null;
  }

  return assignWorkstationAgent(client, workstation.id, null);
};
