import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso } from "./utils";

export type AgentPackRecord = {
  id: string;
  name: string;
  description: string | null;
  author: string | null;
  version: string | null;
  source_type: string | null;
  source_uri: string | null;
  installed_path: string | null;
  checksum: string | null;
  signature_status: string | null;
  permission_manifest_json: string;
  validation_status: string | null;
  metadata_json: string;
  installed_at: string;
  updated_at: string;
};

export type UpsertAgentPackInput = {
  id: string;
  name: string;
  description?: string | null;
  author?: string | null;
  version?: string | null;
  sourceType?: string | null;
  sourceUri?: string | null;
  installedPath?: string | null;
  checksum?: string | null;
  signatureStatus?: string | null;
  permissionManifest?: unknown;
  validationStatus?: string | null;
  metadata?: unknown;
};

const agentPackColumns = `
  id,
  name,
  description,
  author,
  version,
  source_type,
  source_uri,
  installed_path,
  checksum,
  signature_status,
  permission_manifest_json,
  validation_status,
  metadata_json,
  installed_at,
  updated_at
`;

export const upsertAgentPack = (client: DatabaseClient, input: UpsertAgentPackInput): AgentPackRecord => {
  const timestamp = nowIso();

  client.run(
    `INSERT INTO agent_packs (
      ${agentPackColumns}
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      author = excluded.author,
      version = excluded.version,
      source_type = excluded.source_type,
      source_uri = excluded.source_uri,
      installed_path = excluded.installed_path,
      checksum = excluded.checksum,
      signature_status = excluded.signature_status,
      permission_manifest_json = excluded.permission_manifest_json,
      validation_status = excluded.validation_status,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at`,
    [
      input.id,
      input.name,
      input.description ?? null,
      input.author ?? null,
      input.version ?? null,
      input.sourceType ?? null,
      input.sourceUri ?? null,
      input.installedPath ?? null,
      input.checksum ?? null,
      input.signatureStatus ?? null,
      jsonStringify(input.permissionManifest, "{}"),
      input.validationStatus ?? null,
      jsonStringify(input.metadata, "{}"),
      timestamp,
      timestamp
    ]
  );

  return getAgentPack(client, input.id) as AgentPackRecord;
};

export const getAgentPack = (client: DatabaseClient, packId: string): AgentPackRecord | null =>
  client.get<AgentPackRecord>(`SELECT ${agentPackColumns} FROM agent_packs WHERE id = ?`, [packId]);

export const listAgentPacks = (client: DatabaseClient): AgentPackRecord[] =>
  client.all<AgentPackRecord>(`SELECT ${agentPackColumns} FROM agent_packs ORDER BY installed_at DESC`);

export const deleteAgentPack = (client: DatabaseClient, packId: string): AgentPackRecord | null => {
  const existing = getAgentPack(client, packId);
  client.run("DELETE FROM agent_packs WHERE id = ?", [packId]);
  return existing ?? null;
};
