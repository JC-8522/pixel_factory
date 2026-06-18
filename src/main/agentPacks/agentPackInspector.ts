import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize, resolve } from "node:path";
import {
  AGENT_PACK_MANIFEST_FILE,
  parseAgentPackManifest,
  stringifyAgentPackAuthor,
  type AgentPackManifest
} from "./agentPackManifest";

export type AgentPackValidationStatus = "valid" | "invalid" | "warning";

export type AgentPackInspection = {
  path: string;
  manifestPath: string;
  manifest: AgentPackManifest | null;
  validationStatus: AgentPackValidationStatus;
  validationErrors: string[];
  validationWarnings: string[];
  checksum: string | null;
  signatureStatus: "not_provided" | "present_unverified";
  scriptExecution: "not_executed";
  permissionReview: {
    status: "none" | "review_required";
    manifest: Record<string, unknown>;
  };
  summary: {
    id: string | null;
    name: string | null;
    author: string | null;
    version: string | null;
    profiles: number;
    skillDependencies: number;
    bundledSkills: number;
    scripts: number;
    assets: number;
    workflowTemplates: number;
    validationTests: number;
  };
};

const isInside = (root: string, candidate: string): boolean => {
  const rootPath = resolve(root);
  const candidatePath = resolve(root, candidate);
  return candidatePath === rootPath || candidatePath.startsWith(`${rootPath}\\`) || candidatePath.startsWith(`${rootPath}/`);
};

const safeReadJson = (manifestPath: string): { value: unknown | null; errors: string[] } => {
  try {
    return { value: JSON.parse(readFileSync(manifestPath, "utf8")) as unknown, errors: [] };
  } catch (error) {
    return { value: null, errors: [`Cannot parse agent-pack.json: ${error instanceof Error ? error.message : String(error)}`] };
  }
};

const hashFile = (path: string): string => {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
};

export const inspectAgentPack = (folderPath: string): AgentPackInspection => {
  const packPath = resolve(folderPath);
  const manifestPath = join(packPath, AGENT_PACK_MANIFEST_FILE);
  const validationErrors: string[] = [];
  const validationWarnings: string[] = [];

  if (!existsSync(packPath) || !statSync(packPath).isDirectory()) {
    validationErrors.push("Agent Pack path must be an existing directory");
  }

  if (!existsSync(manifestPath)) {
    validationErrors.push(`Missing ${AGENT_PACK_MANIFEST_FILE}`);
  }

  const { value, errors: jsonErrors } = existsSync(manifestPath)
    ? safeReadJson(manifestPath)
    : { value: null, errors: [] };
  validationErrors.push(...jsonErrors);
  const parsed = value ? parseAgentPackManifest(value) : { manifest: null, errors: [] };
  validationErrors.push(...parsed.errors);

  const manifest = parsed.manifest;
  if (manifest) {
    for (const script of manifest.scripts ?? []) {
      if (!isInside(packPath, script.path)) {
        validationErrors.push(`Script path escapes pack root: ${script.path}`);
      } else {
        validationWarnings.push(`Script declared but not executed during inspection: ${script.name}`);
      }
    }

    for (const skill of manifest.bundledSkills ?? []) {
      const skillMdPath = join(packPath, normalize(skill.path), "SKILL.md");
      if (!isInside(packPath, skill.path) || !existsSync(skillMdPath)) {
        validationErrors.push(`Bundled skill is missing SKILL.md: ${skill.path}`);
      }
    }

    for (const asset of manifest.assets ?? []) {
      if (!isInside(packPath, asset.path) || !existsSync(join(packPath, asset.path))) {
        validationWarnings.push(`Asset path is listed but not found: ${asset.path}`);
      }
    }
  }

  const checksum = existsSync(manifestPath) ? hashFile(manifestPath) : null;
  const permissionManifest = manifest?.permissionManifest ?? {};
  const hasPermissions = Object.keys(permissionManifest).length > 0;
  const validationStatus: AgentPackValidationStatus =
    validationErrors.length > 0 ? "invalid" : validationWarnings.length > 0 ? "warning" : "valid";

  return {
    path: packPath,
    manifestPath,
    manifest,
    validationStatus,
    validationErrors,
    validationWarnings,
    checksum,
    signatureStatus: existsSync(join(packPath, "agent-pack.sig")) ? "present_unverified" : "not_provided",
    scriptExecution: "not_executed",
    permissionReview: {
      status: hasPermissions ? "review_required" : "none",
      manifest: permissionManifest
    },
    summary: {
      id: manifest?.id ?? null,
      name: manifest?.name ?? null,
      author: stringifyAgentPackAuthor(manifest?.author),
      version: manifest?.metadata?.version ? String(manifest.metadata.version) : null,
      profiles: manifest?.profiles?.length ?? 0,
      skillDependencies: manifest?.skillDependencies?.length ?? 0,
      bundledSkills: manifest?.bundledSkills?.length ?? 0,
      scripts: manifest?.scripts?.length ?? 0,
      assets: manifest?.assets?.length ?? 0,
      workflowTemplates: manifest?.workflowTemplates?.length ?? 0,
      validationTests: manifest?.validationTests?.length ?? 0
    }
  };
};
