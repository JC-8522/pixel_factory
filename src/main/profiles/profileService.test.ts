/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient } from "../db/client";
import { createAgent, getAgent, upsertSkill } from "../db/repositories";
import {
  assignProfileSkill,
  createProfile,
  duplicateProfile,
  generateProfileSnapshot,
  getCapabilityMatrix,
  updateProfile
} from "./profileService";
import { exportProfile, importProfile } from "./profileImportExport";

const tempDirs: string[] = [];

const createTempDatabasePath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "local-codex-office-profiles-"));
  tempDirs.push(dir);
  return join(dir, "office.sqlite");
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("profileService", () => {
  it("creates profiles, assigns default skills, and builds capability matrix", async () => {
    const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    upsertSkill(client, {
      id: "skill-review",
      name: "Review",
      category: "quality",
      rootPath: "C:/skills/review",
      skillMdPath: "C:/skills/review/SKILL.md"
    });

    const profile = createProfile(client, {
      id: "profile-dev",
      name: "Developer",
      role: "Developer Agent",
      instructions: "Implement carefully.",
      defaultPermissionMode: "ask_before_edit",
      workspaceScope: { paths: ["C:/repo"] },
      validationPolicy: { requiresTests: true }
    });
    assignProfileSkill(client, { profileId: profile.id, skillId: "skill-review", required: true });

    const matrix = getCapabilityMatrix(client, profile.id);
    expect(matrix.profileName).toBe("Developer");
    expect(matrix.skills).toEqual([{ id: "skill-review", name: "Review", required: true, category: "quality" }]);
    expect(matrix.permissionPreset).toBe("ask_before_edit");

    client.close();
  });

  it("keeps agent profile snapshots immutable after profile updates", async () => {
    const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    const profile = createProfile(client, {
      id: "profile-architect",
      name: "Architect",
      role: "Architect",
      instructions: "Design the system."
    });
    const snapshot = generateProfileSnapshot(client, profile.id);

    createAgent(client, {
      id: "agent-architect",
      name: "Architect Agent",
      role: "Architect",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual",
      profileId: profile.id,
      profileSnapshot: snapshot
    });
    updateProfile(client, profile.id, { instructions: "Design and review the system." });

    const agent = getAgent(client, "agent-architect");
    expect(JSON.parse(agent?.profile_snapshot_json ?? "{}")).toMatchObject({
      instructions: "Design the system.",
      createdFromProfileUpdatedAt: profile.updated_at
    });

    client.close();
  });

  it("duplicates and exports/imports source-readable profiles", async () => {
    const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    createProfile(client, {
      id: "profile-qa",
      name: "QA",
      role: "QA Tester",
      communicationStyle: "precise"
    });

    const duplicated = duplicateProfile(client, "profile-qa", "profile-qa-copy");
    const exported = exportProfile(client, duplicated.id);
    const imported = importProfile(client, {
      id: "profile-qa-imported",
      name: exported.profile.name,
      role: exported.profile.role,
      communicationStyle: exported.profile.communicationStyle
    });

    expect(duplicated.name).toBe("QA Copy");
    expect(exported.format).toBe("local-codex-office.agent-profile");
    expect(imported.communication_style).toBe("precise");

    client.close();
  });
});
