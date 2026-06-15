import type { DatabaseClient } from "../client";
import { intToBool, jsonStringify, nowIso } from "./utils";

export type SkillRecord = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  root_path: string;
  skill_md_path: string;
  installed: number;
  metadata_json: string;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSkillInput = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  rootPath: string;
  skillMdPath: string;
  installed?: boolean;
  metadata?: unknown;
};

export const upsertSkill = (client: DatabaseClient, input: CreateSkillInput): SkillRecord => {
  const timestamp = nowIso();

  client.run(
    `INSERT INTO skills (
      id,
      name,
      description,
      category,
      root_path,
      skill_md_path,
      installed,
      metadata_json,
      last_scanned_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      category = excluded.category,
      root_path = excluded.root_path,
      skill_md_path = excluded.skill_md_path,
      installed = excluded.installed,
      metadata_json = excluded.metadata_json,
      last_scanned_at = excluded.last_scanned_at,
      updated_at = excluded.updated_at`,
    [
      input.id,
      input.name,
      input.description ?? null,
      input.category ?? null,
      input.rootPath,
      input.skillMdPath,
      input.installed === false ? 0 : 1,
      jsonStringify(input.metadata, "{}"),
      timestamp,
      timestamp,
      timestamp
    ]
  );

  return getSkill(client, input.id) as SkillRecord;
};

export const getSkill = (client: DatabaseClient, skillId: string): SkillRecord | null =>
  client.get<SkillRecord>("SELECT * FROM skills WHERE id = ?", [skillId]);

export const listSkills = (client: DatabaseClient): SkillRecord[] =>
  client.all<SkillRecord>("SELECT * FROM skills ORDER BY name ASC");

export const isSkillInstalled = (skill: SkillRecord): boolean => intToBool(skill.installed);

