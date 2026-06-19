import type { CreateWorkstationRequest, OfficeSnapshot } from "../../shared/ipc";
import {
  MVP1_FLOOR_ID,
  MVP1_LAYOUT_PRESET,
  MVP1_MAX_WORKSTATIONS,
  getDefaultWorkstationName,
  getOfficeSlotCenter,
  getOfficeSlotDefinition
} from "../../shared/office";
import type { DatabaseClient } from "../db/client";
import {
  assignWorkstationAgent,
  createFloor,
  createWorkstation,
  getAgent,
  getFloor,
  getWorkstation,
  getWorkstationByAssignedAgent,
  getWorkstationBySlot,
  listFloors,
  listWorkstations,
  type FloorRecord,
  type WorkstationRecord
} from "../db/repositories";
import { updateAgentPosition } from "../db/repositories/agents";

export const ensureDefaultOfficeFloor = (client: DatabaseClient): FloorRecord => {
  const existing = getFloor(client, MVP1_FLOOR_ID);
  if (existing) {
    return existing;
  }

  return createFloor(client, {
    id: MVP1_FLOOR_ID,
    name: "Pixel Office",
    floorIndex: 0,
    layoutPreset: MVP1_LAYOUT_PRESET,
    isVisible: true,
    metadata: {
      workspace: "mvp1",
      slotCount: MVP1_MAX_WORKSTATIONS
    }
  });
};

export const getOfficeSnapshot = (client: DatabaseClient): OfficeSnapshot => {
  ensureDefaultOfficeFloor(client);

  return {
    floors: listFloors(client),
    workstations: listWorkstations(client)
  };
};

export const createOfficeWorkstation = (
  client: DatabaseClient,
  input: CreateWorkstationRequest
): WorkstationRecord => {
  const floor =
    input.floorId === MVP1_FLOOR_ID ? ensureDefaultOfficeFloor(client) : getFloor(client, input.floorId);
  if (!floor) {
    throw new Error(`Floor not found: ${input.floorId}`);
  }

  if (!getOfficeSlotDefinition(input.slotKey)) {
    throw new Error(`Unknown workstation slot: ${input.slotKey}`);
  }

  if (getWorkstationBySlot(client, input.floorId, input.slotKey)) {
    throw new Error(`Workstation slot already occupied: ${input.slotKey}`);
  }

  if (listWorkstations(client, input.floorId).length >= MVP1_MAX_WORKSTATIONS) {
    throw new Error(`Floor capacity reached. Maximum workstations: ${MVP1_MAX_WORKSTATIONS}.`);
  }

  return createWorkstation(client, {
    id: input.id,
    floorId: input.floorId,
    slotKey: input.slotKey,
    name: input.name?.trim() || getDefaultWorkstationName(input.slotKey),
    metadata: input.metadata
  });
};

export const assignAgentToWorkstation = (
  client: DatabaseClient,
  input: { agentId: string; workstationId: string }
): WorkstationRecord => {
  const agent = getAgent(client, input.agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${input.agentId}`);
  }

  const workstation = getWorkstation(client, input.workstationId);
  if (!workstation) {
    throw new Error(`Workstation not found: ${input.workstationId}`);
  }

  if (workstation.assigned_agent_id && workstation.assigned_agent_id !== input.agentId) {
    throw new Error("Workstation already has an assigned agent.");
  }

  const existingAssignment = getWorkstationByAssignedAgent(client, input.agentId);
  if (existingAssignment && existingAssignment.id !== input.workstationId) {
    assignWorkstationAgent(client, existingAssignment.id, null);
  }

  const position = getOfficeSlotCenter(workstation.slot_key);
  if (position) {
    updateAgentPosition(client, input.agentId, position);
  }

  return assignWorkstationAgent(client, input.workstationId, input.agentId);
};

export const assignAgentToOfficeWorkstation = assignAgentToWorkstation;
