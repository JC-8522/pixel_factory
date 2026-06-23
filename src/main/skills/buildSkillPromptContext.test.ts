/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import { assignSkillToAgent, assignSkillToProfile, createAgent, createAgentProfile, upsertSkill } from "../db/repositories";
import { buildProfileSkillPromptContext, buildSkillPromptContext } from "./buildSkillPromptContext";

const tempDirs: string[] = [];
let client: DatabaseClient | null = null;

afterEach(() => {
  client?.close();
  client = null;
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("buildSkillPromptContext", () => {
  it("renders assigned skill names and descriptions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "skill-context-"));
    tempDirs.push(dir);
    client = await createMigratedDatabaseClient({ filePath: join(dir, "db.sqlite") });

    createAgent(client, {
      id: "agent-1",
      name: "Dev",
      role: "Developer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual"
    });
    upsertSkill(client, {
      id: "skill-review",
      name: "Reviewer",
      description: "Reviews implementation quality",
      rootPath: "C:/skills/reviewer",
      skillMdPath: "C:/skills/reviewer/SKILL.md"
    });
    assignSkillToAgent(client, { agentId: "agent-1", skillId: "skill-review", assignedBy: "local-user" });

    expect(buildSkillPromptContext(client, "agent-1")).toContain("Reviewer: Reviews implementation quality");
  });

  it("renders profile skill names and descriptions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "skill-context-profile-"));
    tempDirs.push(dir);
    client = await createMigratedDatabaseClient({ filePath: join(dir, "db.sqlite") });

    createAgentProfile(client, {
      id: "profile-reviewer",
      name: "Review Profile",
      role: "Reviewer",
      instructions: "Audit the implementation carefully."
    });
    upsertSkill(client, {
      id: "skill-risk",
      name: "Risk Radar",
      description: "Highlights risky implementation details",
      rootPath: "C:/skills/risk-radar",
      skillMdPath: "C:/skills/risk-radar/SKILL.md"
    });
    assignSkillToProfile(client, { profileId: "profile-reviewer", skillId: "skill-risk", required: true });

    expect(buildProfileSkillPromptContext(client, "profile-reviewer")).toContain(
      "Risk Radar: Highlights risky implementation details"
    );
  });
});
