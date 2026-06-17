import type { DatabaseClient, SqlValue } from "../client";
import { boolToInt, jsonStringify, nowIso, nullable } from "./utils";

export type AgentProfileRecord = {
  id: string;
  name: string;
  description: string | null;
  role: string;
  persona: string | null;
  instructions: string | null;
  default_model_profile: string | null;
  default_permission_mode: string | null;
  default_auto_run_mode: string | null;
  workspace_scope_json: string;
  tool_access_json: string;
  memory_preferences_json: string;
  startup_workflow_json: string;
  validation_policy_json: string;
  collaboration_behavior_json: string;
  communication_style: string | null;
  risk_tolerance: string | null;
  output_preferences_json: string;
  visual_identity_json: string;
  source_pack_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentProfileSkillRecord = {
  profile_id: string;
  skill_id: string;
  required: number;
  created_at: string;
};

export type CreateAgentProfileInput = {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  persona?: string | null;
  instructions?: string | null;
  defaultModelProfile?: string | null;
  defaultPermissionMode?: string | null;
  defaultAutoRunMode?: string | null;
  workspaceScope?: unknown;
  toolAccess?: unknown;
  memoryPreferences?: unknown;
  startupWorkflow?: unknown;
  validationPolicy?: unknown;
  collaborationBehavior?: unknown;
  communicationStyle?: string | null;
  riskTolerance?: string | null;
  outputPreferences?: unknown;
  visualIdentity?: unknown;
  sourcePackId?: string | null;
};

export type UpdateAgentProfilePatch = Partial<Omit<CreateAgentProfileInput, "id">>;

const profileColumns = `
  id,
  name,
  description,
  role,
  persona,
  instructions,
  default_model_profile,
  default_permission_mode,
  default_auto_run_mode,
  workspace_scope_json,
  tool_access_json,
  memory_preferences_json,
  startup_workflow_json,
  validation_policy_json,
  collaboration_behavior_json,
  communication_style,
  risk_tolerance,
  output_preferences_json,
  visual_identity_json,
  source_pack_id,
  created_at,
  updated_at
`;

export const createAgentProfile = (client: DatabaseClient, input: CreateAgentProfileInput): AgentProfileRecord => {
  const timestamp = nowIso();
  client.run(
    `INSERT INTO agent_profiles (
      ${profileColumns}
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.name,
      nullable(input.description),
      input.role,
      nullable(input.persona),
      nullable(input.instructions),
      nullable(input.defaultModelProfile),
      nullable(input.defaultPermissionMode),
      nullable(input.defaultAutoRunMode),
      jsonStringify(input.workspaceScope, "{}"),
      jsonStringify(input.toolAccess, "{}"),
      jsonStringify(input.memoryPreferences, "{}"),
      jsonStringify(input.startupWorkflow, "[]"),
      jsonStringify(input.validationPolicy, "{}"),
      jsonStringify(input.collaborationBehavior, "{}"),
      nullable(input.communicationStyle),
      nullable(input.riskTolerance),
      jsonStringify(input.outputPreferences, "{}"),
      jsonStringify(input.visualIdentity, "{}"),
      nullable(input.sourcePackId),
      timestamp,
      timestamp
    ]
  );

  return getAgentProfile(client, input.id) as AgentProfileRecord;
};

export const getAgentProfile = (client: DatabaseClient, profileId: string): AgentProfileRecord | null =>
  client.get<AgentProfileRecord>(`SELECT ${profileColumns} FROM agent_profiles WHERE id = ?`, [profileId]);

export const listAgentProfiles = (client: DatabaseClient): AgentProfileRecord[] =>
  client.all<AgentProfileRecord>(`SELECT ${profileColumns} FROM agent_profiles ORDER BY name ASC`);

const profilePatchColumnMap = {
  name: "name",
  description: "description",
  role: "role",
  persona: "persona",
  instructions: "instructions",
  defaultModelProfile: "default_model_profile",
  defaultPermissionMode: "default_permission_mode",
  defaultAutoRunMode: "default_auto_run_mode",
  workspaceScope: "workspace_scope_json",
  toolAccess: "tool_access_json",
  memoryPreferences: "memory_preferences_json",
  startupWorkflow: "startup_workflow_json",
  validationPolicy: "validation_policy_json",
  collaborationBehavior: "collaboration_behavior_json",
  communicationStyle: "communication_style",
  riskTolerance: "risk_tolerance",
  outputPreferences: "output_preferences_json",
  visualIdentity: "visual_identity_json",
  sourcePackId: "source_pack_id"
} as const;

const jsonPatchKeys = new Set<keyof UpdateAgentProfilePatch>([
  "workspaceScope",
  "toolAccess",
  "memoryPreferences",
  "startupWorkflow",
  "validationPolicy",
  "collaborationBehavior",
  "outputPreferences",
  "visualIdentity"
]);

export const updateAgentProfile = (
  client: DatabaseClient,
  profileId: string,
  patch: UpdateAgentProfilePatch
): AgentProfileRecord => {
  const sets: string[] = [];
  const params: SqlValue[] = [];

  for (const [key, column] of Object.entries(profilePatchColumnMap) as [keyof UpdateAgentProfilePatch, string][]) {
    if (!(key in patch)) {
      continue;
    }

    sets.push(`${column} = ?`);
    const value = patch[key];
    params.push(jsonPatchKeys.has(key) ? jsonStringify(value, key === "startupWorkflow" ? "[]" : "{}") : nullable(value as string | null | undefined));
  }

  if (sets.length === 0) {
    const existing = getAgentProfile(client, profileId);
    if (!existing) {
      throw new Error(`Agent Profile not found: ${profileId}`);
    }
    return existing;
  }

  params.push(nowIso(), profileId);
  client.run(`UPDATE agent_profiles SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`, params);

  const updated = getAgentProfile(client, profileId);
  if (!updated) {
    throw new Error(`Agent Profile not found: ${profileId}`);
  }

  return updated;
};

export const deleteAgentProfile = (client: DatabaseClient, profileId: string): AgentProfileRecord | null => {
  const existing = getAgentProfile(client, profileId);
  client.run("DELETE FROM agent_profiles WHERE id = ?", [profileId]);
  return existing ?? null;
};

export const assignSkillToProfile = (
  client: DatabaseClient,
  input: { profileId: string; skillId: string; required: boolean }
): AgentProfileSkillRecord => {
  client.run(
    `INSERT INTO agent_profile_skills (profile_id, skill_id, required, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(profile_id, skill_id) DO UPDATE SET required = excluded.required`,
    [input.profileId, input.skillId, boolToInt(input.required), nowIso()]
  );

  return client.get<AgentProfileSkillRecord>(
    "SELECT * FROM agent_profile_skills WHERE profile_id = ? AND skill_id = ?",
    [input.profileId, input.skillId]
  ) as AgentProfileSkillRecord;
};

export const removeSkillFromProfile = (
  client: DatabaseClient,
  input: { profileId: string; skillId: string }
): AgentProfileSkillRecord | null => {
  const existing = client.get<AgentProfileSkillRecord>(
    "SELECT * FROM agent_profile_skills WHERE profile_id = ? AND skill_id = ?",
    [input.profileId, input.skillId]
  );
  client.run("DELETE FROM agent_profile_skills WHERE profile_id = ? AND skill_id = ?", [
    input.profileId,
    input.skillId
  ]);
  return existing ?? null;
};

export const listProfileSkills = (client: DatabaseClient, profileId: string): AgentProfileSkillRecord[] =>
  client.all<AgentProfileSkillRecord>(
    "SELECT * FROM agent_profile_skills WHERE profile_id = ? ORDER BY created_at ASC",
    [profileId]
  );
