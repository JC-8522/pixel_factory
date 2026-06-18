import { join, resolve } from "node:path";
import type { DatabaseClient } from "../db/client";
import {
  assignSkillToProfile,
  createAgentProfile,
  deleteAgentPack,
  deleteAgentProfile,
  getAgentPack,
  listAgentPacks,
  upsertAgentPack,
  upsertSkill,
  type AgentPackRecord
} from "../db/repositories";
import { recordAuditEvent } from "../audit/auditEngine";
import { inspectAgentPack, type AgentPackInspection } from "./agentPackInspector";
import { stringifyAgentPackAuthor } from "./agentPackManifest";

export type AgentPackInstallResult = {
  pack: AgentPackRecord;
  installedProfileIds: string[];
  installedSkillIds: string[];
};

const eventId = (prefix: string, packId: string): string => `event-${prefix}-${packId}-${Date.now()}`;

export const inspectAgentPackForInstall = (client: DatabaseClient, folderPath: string): AgentPackInspection => {
  const inspection = inspectAgentPack(folderPath);
  recordAuditEvent(client, {
    id: eventId("agent-pack-inspected", inspection.summary.id ?? "unknown"),
    type: "agent_pack_inspected",
    actorType: "user",
    actorId: "local-user",
    severity: inspection.validationStatus === "invalid" ? "warning" : "info",
    payload: {
      path: inspection.path,
      packId: inspection.summary.id,
      validationStatus: inspection.validationStatus,
      errors: inspection.validationErrors,
      warnings: inspection.validationWarnings,
      scriptExecution: inspection.scriptExecution
    }
  });
  return inspection;
};

export const installAgentPack = (client: DatabaseClient, folderPath: string): AgentPackInstallResult => {
  const inspection = inspectAgentPack(folderPath);
  if (!inspection.manifest || inspection.validationStatus === "invalid") {
    recordAuditEvent(client, {
      id: eventId("agent-pack-install-rejected", inspection.summary.id ?? "unknown"),
      type: "agent_pack_install_rejected",
      actorType: "user",
      actorId: "local-user",
      severity: "warning",
      payload: { path: folderPath, errors: inspection.validationErrors }
    });
    throw new Error(`Agent Pack is not installable: ${inspection.validationErrors.join("; ")}`);
  }

  const manifest = inspection.manifest;
  const existingProfiles = client.all<{ id: string }>("SELECT id FROM agent_profiles WHERE source_pack_id = ?", [
    manifest.id
  ]);
  for (const profile of existingProfiles) {
    deleteAgentProfile(client, profile.id);
  }

  const pack = upsertAgentPack(client, {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    author: stringifyAgentPackAuthor(manifest.author),
    version: manifest.metadata?.version ? String(manifest.metadata.version) : null,
    sourceType: "local-folder",
    sourceUri: resolve(folderPath),
    installedPath: resolve(folderPath),
    checksum: inspection.checksum,
    signatureStatus: inspection.signatureStatus,
    permissionManifest: manifest.permissionManifest ?? {},
    validationStatus: inspection.validationStatus,
    metadata: {
      license: manifest.license,
      homepage: manifest.homepage,
      assets: manifest.assets ?? [],
      scripts: manifest.scripts ?? [],
      workflowTemplates: manifest.workflowTemplates ?? [],
      validationTests: manifest.validationTests ?? [],
      skillDependencies: manifest.skillDependencies ?? [],
      warnings: inspection.validationWarnings
    }
  });

  const installedSkillIds: string[] = [];
  for (const skill of manifest.bundledSkills ?? []) {
    const skillPath = join(resolve(folderPath), skill.path);
    const installedSkill = upsertSkill(client, {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category ?? "agent-pack",
      rootPath: skillPath,
      skillMdPath: join(skillPath, "SKILL.md"),
      installed: true,
      metadata: { sourcePackId: manifest.id, required: skill.required === true }
    });
    installedSkillIds.push(installedSkill.id);
  }

  const installedProfileIds: string[] = [];
  for (const profile of manifest.profiles ?? []) {
    const created = createAgentProfile(client, {
      ...profile,
      sourcePackId: manifest.id
    });
    installedProfileIds.push(created.id);

    for (const skill of manifest.bundledSkills ?? []) {
      if (skill.required) {
        assignSkillToProfile(client, { profileId: created.id, skillId: skill.id, required: true });
      }
    }
  }

  recordAuditEvent(client, {
    id: eventId("agent-pack-permission-reviewed", manifest.id),
    type: "agent_pack_permission_manifest_reviewed",
    actorType: "user",
    actorId: "local-user",
    payload: {
      packId: manifest.id,
      permissionManifest: manifest.permissionManifest ?? {},
      reviewStatus: inspection.permissionReview.status
    }
  });

  recordAuditEvent(client, {
    id: eventId("agent-pack-installed", manifest.id),
    type: "agent_pack_installed",
    actorType: "user",
    actorId: "local-user",
    payload: { packId: manifest.id, installedProfileIds, installedSkillIds }
  });

  return { pack, installedProfileIds, installedSkillIds };
};

export const uninstallAgentPack = (client: DatabaseClient, packId: string): AgentPackRecord | null => {
  const existing = getAgentPack(client, packId);
  if (!existing) return null;

  const profiles = client.all<{ id: string }>("SELECT id FROM agent_profiles WHERE source_pack_id = ?", [packId]);
  for (const profile of profiles) {
    deleteAgentProfile(client, profile.id);
  }

  const skills = client.all<{ id: string; metadata_json: string }>("SELECT id, metadata_json FROM skills");
  for (const skill of skills) {
    try {
      const metadata = JSON.parse(skill.metadata_json) as { sourcePackId?: string };
      if (metadata.sourcePackId === packId) {
        client.run("DELETE FROM skills WHERE id = ?", [skill.id]);
      }
    } catch {
      // Keep unknown user-created skill records.
    }
  }

  const removed = deleteAgentPack(client, packId);
  recordAuditEvent(client, {
    id: eventId("agent-pack-uninstalled", packId),
    type: "agent_pack_uninstalled",
    actorType: "user",
    actorId: "local-user",
    payload: {
      packId,
      removedProfileIds: profiles.map((profile) => profile.id)
    }
  });
  return removed;
};

export const listInstalledAgentPacks = listAgentPacks;
