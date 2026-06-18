import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";
import type { PermissionRuleRecord } from "../../../shared/types/records";

export type CreatePermissionRuleInput = {
  id: string;
  projectPath: string;
  ruleKind: string;
  commandPattern: string;
  decision: string;
  expiresAt?: string | null;
  metadata?: unknown;
};

export const createPermissionRule = (
  client: DatabaseClient,
  input: CreatePermissionRuleInput
): PermissionRuleRecord => {
  client.run(
    `INSERT INTO permission_rules (
      id,
      project_path,
      rule_kind,
      command_pattern,
      decision,
      created_at,
      expires_at,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.projectPath,
      input.ruleKind,
      input.commandPattern,
      input.decision,
      nowIso(),
      nullable(input.expiresAt),
      jsonStringify(input.metadata, "{}")
    ]
  );

  return getPermissionRule(client, input.id) as PermissionRuleRecord;
};

export const getPermissionRule = (client: DatabaseClient, ruleId: string): PermissionRuleRecord | null =>
  client.get<PermissionRuleRecord>("SELECT * FROM permission_rules WHERE id = ?", [ruleId]);

export const listPermissionRules = (client: DatabaseClient, projectPath?: string): PermissionRuleRecord[] => {
  if (projectPath) {
    return client.all<PermissionRuleRecord>(
      "SELECT * FROM permission_rules WHERE project_path = ? ORDER BY created_at DESC",
      [projectPath]
    );
  }

  return client.all<PermissionRuleRecord>(
    "SELECT * FROM permission_rules ORDER BY created_at DESC"
  );
};

export const deletePermissionRule = (client: DatabaseClient, ruleId: string): PermissionRuleRecord | null => {
  const existing = getPermissionRule(client, ruleId);
  if (!existing) {
    return null;
  }

  client.run("DELETE FROM permission_rules WHERE id = ?", [ruleId]);
  return existing;
};
