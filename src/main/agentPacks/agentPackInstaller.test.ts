/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import { createAgentProfile, listAgentProfiles, upsertSkill } from "../db/repositories";
import { inspectAgentPack } from "./agentPackInspector";
import { installAgentPack, uninstallAgentPack } from "./agentPackInstaller";

const tempDirs: string[] = [];
const fixtureRoot = resolve("fixtures", "agent-packs");

const createTempDatabasePath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "local-codex-office-agent-pack-"));
  tempDirs.push(dir);
  return join(dir, "office.sqlite");
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("agent pack inspection", () => {
  it("inspects a valid source-readable pack without executing declared scripts", () => {
    const inspection = inspectAgentPack(join(fixtureRoot, "founder-engineering-pack"));

    expect(inspection.validationStatus).toBe("warning");
    expect(inspection.scriptExecution).toBe("not_executed");
    expect(inspection.summary.name).toBe("Founder Engineering Pack");
    expect(inspection.summary.profiles).toBe(1);
    expect(inspection.summary.bundledSkills).toBe(1);
    expect(inspection.validationWarnings).toEqual(
      expect.arrayContaining(["Script declared but not executed during inspection: optional-validation"])
    );
  });

  it("returns validation errors for malformed packs", () => {
    const inspection = inspectAgentPack(join(fixtureRoot, "malformed-pack"));

    expect(inspection.validationStatus).toBe("invalid");
    expect(inspection.validationErrors).toEqual(
      expect.arrayContaining(["id is required", "profiles[0].role is required"])
    );
  });
});

describe("agent pack installation", () => {
  let client: DatabaseClient;

  afterEach(() => {
    client?.close();
  });

  it("installs reviewed profiles and bundled skills as normal local records", async () => {
    client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    const result = installAgentPack(client, join(fixtureRoot, "founder-engineering-pack"));

    expect(result.pack.id).toBe("founder-engineering-pack");
    expect(result.installedProfileIds).toEqual(["pack-founder-engineer"]);
    expect(result.installedSkillIds).toEqual(["pack-review-loop"]);

    const profiles = listAgentProfiles(client);
    expect(profiles.map((profile) => profile.id)).toContain("pack-founder-engineer");
    expect(profiles.find((profile) => profile.id === "pack-founder-engineer")?.source_pack_id).toBe(
      "founder-engineering-pack"
    );

    const events = client.all<{ type: string }>("SELECT type FROM events ORDER BY created_at ASC");
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["agent_pack_permission_manifest_reviewed", "agent_pack_installed"])
    );
  });

  it("uninstalls pack-owned content without deleting user-created profiles", async () => {
    client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    upsertSkill(client, {
      id: "user-skill",
      name: "User Skill",
      rootPath: "C:/skills/user-skill",
      skillMdPath: "C:/skills/user-skill/SKILL.md"
    });
    createAgentProfile(client, {
      id: "user-profile",
      name: "User Profile",
      role: "Manager",
      sourcePackId: null
    });

    installAgentPack(client, join(fixtureRoot, "founder-engineering-pack"));
    const removed = uninstallAgentPack(client, "founder-engineering-pack");

    expect(removed?.id).toBe("founder-engineering-pack");
    expect(listAgentProfiles(client).map((profile) => profile.id)).toEqual(["user-profile"]);
  });
});
