import type { JsonObject } from "../../shared/types/records";
import type { DatabaseClient } from "../db/client";
import {
  assignSkillToProfile,
  createAgentProfile,
  deleteAgentProfile,
  getAgentProfile,
  listAgentProfiles,
  listProfileSkills,
  removeSkillFromProfile,
  updateAgentProfile,
  type AgentProfileRecord,
  type AgentProfileSkillRecord,
  type CreateAgentProfileInput,
  type SkillRecord,
  getSkill
} from "../db/repositories";
import { recordAuditEvent } from "../audit/auditEngine";

const parseJson = (value: string, fallback: JsonObject | unknown[] = {}): JsonObject | unknown[] => {
  try {
    return JSON.parse(value) as JsonObject | unknown[];
  } catch {
    return fallback;
  }
};

export type AgentProfileSnapshot = {
  profileId: string;
  name: string;
  role: string;
  description: string | null;
  persona: string | null;
  instructions: string | null;
  defaultModelProfile: string | null;
  defaultPermissionMode: string | null;
  defaultAutoRunMode: string | null;
  workspaceScope: JsonObject;
  toolAccess: JsonObject;
  memoryPreferences: JsonObject;
  startupWorkflow: unknown[];
  validationPolicy: JsonObject;
  collaborationBehavior: JsonObject;
  communicationStyle: string | null;
  riskTolerance: string | null;
  outputPreferences: JsonObject;
  visualIdentity: JsonObject;
  defaultSkills: Array<{ skillId: string; required: boolean }>;
  createdFromProfileUpdatedAt: string;
};

export type AgentCapabilityMatrix = {
  profileId: string;
  profileName: string;
  role: string;
  skills: Array<{ id: string; name: string; required: boolean; category: string | null }>;
  permissionPreset: string | null;
  workspaceScope: JsonObject;
  toolAccess: JsonObject;
  validationPolicy: JsonObject;
  collaborationBehavior: JsonObject;
};

export const createProfile = (
  client: DatabaseClient,
  input: CreateAgentProfileInput
): AgentProfileRecord => {
  const profile = createAgentProfile(client, input);
  recordAuditEvent(client, {
    id: `event-profile-created-${profile.id}`,
    type: "agent_profile_created",
    actorType: "user",
    actorId: "local-user",
    payload: { profileId: profile.id, name: profile.name, role: profile.role }
  });
  return profile;
};

export const updateProfile = (
  client: DatabaseClient,
  profileId: string,
  patch: Parameters<typeof updateAgentProfile>[2]
): AgentProfileRecord => {
  const profile = updateAgentProfile(client, profileId, patch);
  recordAuditEvent(client, {
    id: `event-profile-updated-${profile.id}-${Date.now()}`,
    type: "agent_profile_updated",
    actorType: "user",
    actorId: "local-user",
    payload: { profileId: profile.id, changedFields: Object.keys(patch) }
  });
  return profile;
};

export const duplicateProfile = (
  client: DatabaseClient,
  profileId: string,
  newProfileId: string
): AgentProfileRecord => {
  const source = getAgentProfile(client, profileId);
  if (!source) {
    throw new Error(`Agent Profile not found: ${profileId}`);
  }

  const profile = createAgentProfile(client, {
    id: newProfileId,
    name: `${source.name} Copy`,
    description: source.description,
    role: source.role,
    persona: source.persona,
    instructions: source.instructions,
    defaultModelProfile: source.default_model_profile,
    defaultPermissionMode: source.default_permission_mode,
    defaultAutoRunMode: source.default_auto_run_mode,
    workspaceScope: parseJson(source.workspace_scope_json),
    toolAccess: parseJson(source.tool_access_json),
    memoryPreferences: parseJson(source.memory_preferences_json),
    startupWorkflow: parseJson(source.startup_workflow_json, []),
    validationPolicy: parseJson(source.validation_policy_json),
    collaborationBehavior: parseJson(source.collaboration_behavior_json),
    communicationStyle: source.communication_style,
    riskTolerance: source.risk_tolerance,
    outputPreferences: parseJson(source.output_preferences_json),
    visualIdentity: parseJson(source.visual_identity_json),
    sourcePackId: source.source_pack_id
  });

  for (const skill of listProfileSkills(client, profileId)) {
    assignSkillToProfile(client, { profileId: profile.id, skillId: skill.skill_id, required: skill.required === 1 });
  }

  recordAuditEvent(client, {
    id: `event-profile-duplicated-${profile.id}`,
    type: "agent_profile_duplicated",
    actorType: "user",
    actorId: "local-user",
    payload: { sourceProfileId: profileId, profileId: profile.id }
  });

  return profile;
};

export const removeProfile = (client: DatabaseClient, profileId: string): AgentProfileRecord | null => {
  const removed = deleteAgentProfile(client, profileId);
  if (removed) {
    recordAuditEvent(client, {
      id: `event-profile-deleted-${profileId}-${Date.now()}`,
      type: "agent_profile_deleted",
      actorType: "user",
      actorId: "local-user",
      payload: { profileId }
    });
  }
  return removed;
};

export const assignProfileSkill = (
  client: DatabaseClient,
  input: { profileId: string; skillId: string; required: boolean }
): AgentProfileSkillRecord => {
  const assignment = assignSkillToProfile(client, input);
  recordAuditEvent(client, {
    id: `event-profile-skill-${input.profileId}-${input.skillId}`,
    type: "agent_profile_skill_attached",
    actorType: "user",
    actorId: "local-user",
    payload: { profileId: input.profileId, skillId: input.skillId, required: input.required }
  });
  return assignment;
};

export const removeProfileSkill = (
  client: DatabaseClient,
  input: { profileId: string; skillId: string }
): AgentProfileSkillRecord | null => removeSkillFromProfile(client, input);

export const generateProfileSnapshot = (client: DatabaseClient, profileId: string): AgentProfileSnapshot => {
  const profile = getAgentProfile(client, profileId);
  if (!profile) {
    throw new Error(`Agent Profile not found: ${profileId}`);
  }

  return {
    profileId: profile.id,
    name: profile.name,
    role: profile.role,
    description: profile.description,
    persona: profile.persona,
    instructions: profile.instructions,
    defaultModelProfile: profile.default_model_profile,
    defaultPermissionMode: profile.default_permission_mode,
    defaultAutoRunMode: profile.default_auto_run_mode,
    workspaceScope: parseJson(profile.workspace_scope_json) as JsonObject,
    toolAccess: parseJson(profile.tool_access_json) as JsonObject,
    memoryPreferences: parseJson(profile.memory_preferences_json) as JsonObject,
    startupWorkflow: parseJson(profile.startup_workflow_json, []) as unknown[],
    validationPolicy: parseJson(profile.validation_policy_json) as JsonObject,
    collaborationBehavior: parseJson(profile.collaboration_behavior_json) as JsonObject,
    communicationStyle: profile.communication_style,
    riskTolerance: profile.risk_tolerance,
    outputPreferences: parseJson(profile.output_preferences_json) as JsonObject,
    visualIdentity: parseJson(profile.visual_identity_json) as JsonObject,
    defaultSkills: listProfileSkills(client, profile.id).map((skill) => ({
      skillId: skill.skill_id,
      required: skill.required === 1
    })),
    createdFromProfileUpdatedAt: profile.updated_at
  };
};

export const getCapabilityMatrix = (client: DatabaseClient, profileId: string): AgentCapabilityMatrix => {
  const snapshot = generateProfileSnapshot(client, profileId);
  const skills = snapshot.defaultSkills
    .map((assignment) => {
      const skill = getSkill(client, assignment.skillId) as SkillRecord | null;
      return skill
        ? { id: skill.id, name: skill.name, required: assignment.required, category: skill.category }
        : null;
    })
    .filter((skill): skill is { id: string; name: string; required: boolean; category: string | null } => Boolean(skill));

  return {
    profileId: snapshot.profileId,
    profileName: snapshot.name,
    role: snapshot.role,
    skills,
    permissionPreset: snapshot.defaultPermissionMode,
    workspaceScope: snapshot.workspaceScope,
    toolAccess: snapshot.toolAccess,
    validationPolicy: snapshot.validationPolicy,
    collaborationBehavior: snapshot.collaborationBehavior
  };
};

export const listProfiles = listAgentProfiles;
export const getProfile = getAgentProfile;
export const listProfileSkillAssignments = listProfileSkills;
