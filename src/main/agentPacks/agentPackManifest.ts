import type { CreateAgentProfileRequest } from "../../shared/ipc";
import type { JsonObject } from "../../shared/types/records";

export const AGENT_PACK_FORMAT = "local-codex-office.agent-pack" as const;
export const AGENT_PACK_MANIFEST_FILE = "agent-pack.json" as const;

export type AgentPackAuthor = {
  name: string;
  url?: string | null;
};

export type AgentPackSkillDependency = {
  id: string;
  name?: string | null;
  version?: string | null;
  required?: boolean;
};

export type AgentPackBundledSkill = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  path: string;
  required?: boolean;
};

export type AgentPackScript = {
  name: string;
  path: string;
  description?: string | null;
};

export type AgentPackAsset = {
  path: string;
  type?: string | null;
  description?: string | null;
};

export type AgentPackWorkflowTemplate = {
  id: string;
  name: string;
  description?: string | null;
  template: JsonObject;
};

export type AgentPackValidationTest = {
  id: string;
  name: string;
  path?: string | null;
  description?: string | null;
};

export type AgentPackManifest = {
  format: typeof AGENT_PACK_FORMAT;
  version: 1;
  id: string;
  name: string;
  description?: string | null;
  author?: AgentPackAuthor | string | null;
  license?: string | null;
  homepage?: string | null;
  profiles?: CreateAgentProfileRequest[];
  skillDependencies?: AgentPackSkillDependency[];
  bundledSkills?: AgentPackBundledSkill[];
  scripts?: AgentPackScript[];
  assets?: AgentPackAsset[];
  permissionManifest?: JsonObject;
  workflowTemplates?: AgentPackWorkflowTemplate[];
  validationTests?: AgentPackValidationTest[];
  metadata?: JsonObject;
};

export type ParsedAgentPackManifest = {
  manifest: AgentPackManifest | null;
  errors: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const asOptionalString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
};

const asObjectArray = (value: unknown, label: string, errors: string[]): Record<string, unknown>[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array`);
    return [];
  }
  return value.filter((item, index): item is Record<string, unknown> => {
    if (!isRecord(item)) {
      errors.push(`${label}[${index}] must be an object`);
      return false;
    }
    return true;
  });
};

const parseProfile = (value: Record<string, unknown>, index: number, errors: string[]): CreateAgentProfileRequest | null => {
  if (!isString(value.id)) errors.push(`profiles[${index}].id is required`);
  if (!isString(value.name)) errors.push(`profiles[${index}].name is required`);
  if (!isString(value.role)) errors.push(`profiles[${index}].role is required`);
  if (!isString(value.id) || !isString(value.name) || !isString(value.role)) return null;

  const jsonObject = (input: unknown): JsonObject | undefined => (isRecord(input) ? input : undefined);
  const jsonArray = (input: unknown): unknown[] | undefined => (Array.isArray(input) ? input : undefined);

  return {
    id: value.id,
    name: value.name,
    role: value.role,
    description: asOptionalString(value.description),
    persona: asOptionalString(value.persona),
    instructions: asOptionalString(value.instructions),
    defaultModelProfile: asOptionalString(value.defaultModelProfile),
    defaultPermissionMode: asOptionalString(value.defaultPermissionMode),
    defaultAutoRunMode: asOptionalString(value.defaultAutoRunMode),
    workspaceScope: jsonObject(value.workspaceScope),
    toolAccess: jsonObject(value.toolAccess),
    memoryPreferences: jsonObject(value.memoryPreferences),
    startupWorkflow: jsonArray(value.startupWorkflow),
    validationPolicy: jsonObject(value.validationPolicy),
    collaborationBehavior: jsonObject(value.collaborationBehavior),
    communicationStyle: asOptionalString(value.communicationStyle),
    riskTolerance: asOptionalString(value.riskTolerance),
    outputPreferences: jsonObject(value.outputPreferences),
    visualIdentity: jsonObject(value.visualIdentity),
    sourcePackId: asOptionalString(value.sourcePackId)
  };
};

export const parseAgentPackManifest = (raw: unknown): ParsedAgentPackManifest => {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { manifest: null, errors: ["Manifest must be a JSON object"] };
  }

  if (raw.format !== AGENT_PACK_FORMAT) errors.push(`format must be ${AGENT_PACK_FORMAT}`);
  if (raw.version !== 1) errors.push("version must be 1");
  if (!isString(raw.id)) errors.push("id is required");
  if (!isString(raw.name)) errors.push("name is required");

  const profiles = asObjectArray(raw.profiles, "profiles", errors)
    .map((profile, index) => parseProfile(profile, index, errors))
    .filter((profile): profile is CreateAgentProfileRequest => Boolean(profile));

  const bundledSkills = asObjectArray(raw.bundledSkills, "bundledSkills", errors)
    .map((skill, index): AgentPackBundledSkill | null => {
      if (!isString(skill.id)) errors.push(`bundledSkills[${index}].id is required`);
      if (!isString(skill.name)) errors.push(`bundledSkills[${index}].name is required`);
      if (!isString(skill.path)) errors.push(`bundledSkills[${index}].path is required`);
      if (!isString(skill.id) || !isString(skill.name) || !isString(skill.path)) return null;
      return {
        id: skill.id,
        name: skill.name,
        path: skill.path,
        description: asOptionalString(skill.description),
        category: asOptionalString(skill.category),
        required: Boolean(skill.required)
      };
    })
    .filter((skill): skill is AgentPackBundledSkill => Boolean(skill));

  const manifest: AgentPackManifest | null =
    errors.length > 0 || !isString(raw.id) || !isString(raw.name)
      ? null
      : {
          format: AGENT_PACK_FORMAT,
          version: 1,
          id: raw.id,
          name: raw.name,
          description: asOptionalString(raw.description),
          author: isRecord(raw.author)
            ? { name: isString(raw.author.name) ? raw.author.name : "Unknown", url: asOptionalString(raw.author.url) }
            : asOptionalString(raw.author),
          license: asOptionalString(raw.license),
          homepage: asOptionalString(raw.homepage),
          profiles,
          skillDependencies: asObjectArray(raw.skillDependencies, "skillDependencies", errors)
            .filter((dependency) => isString(dependency.id))
            .map((dependency) => ({
              id: dependency.id as string,
              name: asOptionalString(dependency.name),
              version: asOptionalString(dependency.version),
              required: dependency.required !== false
            })),
          bundledSkills,
          scripts: asObjectArray(raw.scripts, "scripts", errors)
            .filter((script) => isString(script.name) && isString(script.path))
            .map((script) => ({
              name: script.name as string,
              path: script.path as string,
              description: asOptionalString(script.description)
            })),
          assets: asObjectArray(raw.assets, "assets", errors)
            .filter((asset) => isString(asset.path))
            .map((asset) => ({
              path: asset.path as string,
              type: asOptionalString(asset.type),
              description: asOptionalString(asset.description)
            })),
          permissionManifest: isRecord(raw.permissionManifest) ? raw.permissionManifest : {},
          workflowTemplates: asObjectArray(raw.workflowTemplates, "workflowTemplates", errors)
            .filter((workflow) => isString(workflow.id) && isString(workflow.name) && isRecord(workflow.template))
            .map((workflow) => ({
              id: workflow.id as string,
              name: workflow.name as string,
              description: asOptionalString(workflow.description),
              template: workflow.template as JsonObject
            })),
          validationTests: asObjectArray(raw.validationTests, "validationTests", errors)
            .filter((test) => isString(test.id) && isString(test.name))
            .map((test) => ({
              id: test.id as string,
              name: test.name as string,
              path: asOptionalString(test.path),
              description: asOptionalString(test.description)
            })),
          metadata: isRecord(raw.metadata) ? raw.metadata : {}
        };

  return { manifest, errors };
};

export const stringifyAgentPackAuthor = (author: AgentPackManifest["author"]): string | null => {
  if (!author) return null;
  return typeof author === "string" ? author : author.name;
};
