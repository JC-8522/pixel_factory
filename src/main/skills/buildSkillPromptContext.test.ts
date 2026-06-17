/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import { assignSkillToAgent, createAgent, upsertSkill } from "../db/repositories";
import { buildSkillPromptContext } from "./buildSkillPromptContext";

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
});
