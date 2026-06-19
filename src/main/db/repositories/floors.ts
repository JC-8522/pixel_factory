import type { DatabaseClient } from "../client";
import { boolToInt, jsonStringify, nowIso } from "./utils";

export type FloorRecord = {
  id: string;
  name: string;
  floor_index: number;
  layout_preset: string;
  is_visible: number;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

export type CreateFloorInput = {
  id: string;
  name: string;
  floorIndex: number;
  layoutPreset?: string;
  isVisible?: boolean;
  metadata?: unknown;
};

export const createFloor = (client: DatabaseClient, input: CreateFloorInput): FloorRecord => {
  const timestamp = nowIso();
  client.run(
    `INSERT INTO floors (
      id,
      name,
      floor_index,
      layout_preset,
      is_visible,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.name,
      input.floorIndex,
      input.layoutPreset ?? "mvp1_4x3",
      boolToInt(input.isVisible ?? true),
      jsonStringify(input.metadata, "{}"),
      timestamp,
      timestamp
    ]
  );

  return getFloor(client, input.id) as FloorRecord;
};

export const getFloor = (client: DatabaseClient, floorId: string): FloorRecord | null =>
  client.get<FloorRecord>("SELECT * FROM floors WHERE id = ?", [floorId]);

export const listFloors = (client: DatabaseClient): FloorRecord[] =>
  client.all<FloorRecord>("SELECT * FROM floors ORDER BY floor_index ASC, created_at ASC");
