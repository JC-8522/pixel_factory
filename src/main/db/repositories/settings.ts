import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso } from "./utils";

export type SettingRecord = {
  key: string;
  value_json: string;
  updated_at: string;
};

export const setSetting = (client: DatabaseClient, key: string, value: unknown): SettingRecord => {
  client.run(
    `INSERT INTO settings (key, value_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [key, jsonStringify(value, "{}"), nowIso()]
  );

  return getSetting(client, key) as SettingRecord;
};

export const getSetting = (client: DatabaseClient, key: string): SettingRecord | null =>
  client.get<SettingRecord>("SELECT * FROM settings WHERE key = ?", [key]);

export const listSettings = (client: DatabaseClient): SettingRecord[] =>
  client.all<SettingRecord>("SELECT * FROM settings ORDER BY key ASC");
