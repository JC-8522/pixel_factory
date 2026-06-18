/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import {
  createProjectWorkspace,
  getActiveProjectWorkspaceId,
  getOfficeTheme,
  listProjectWorkspaces,
  replayTimelineEvents,
  selectProjectWorkspace,
  setOfficeTheme
} from "./v2IntegrationService";
import { createEvent } from "../db/repositories";

const tempDirs: string[] = [];

const createTempDatabasePath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "local-codex-office-v2-"));
  tempDirs.push(dir);
  return join(dir, "office.sqlite");
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("V2 integration service", () => {
  let client: DatabaseClient;

  afterEach(() => {
    client?.close();
  });

  it("creates and selects project workspaces", async () => {
    client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    const workspace = createProjectWorkspace(client, {
      id: "workspace-client-a",
      name: "Client A",
      rootPath: "C:/repo/client-a"
    });
    selectProjectWorkspace(client, workspace.id);

    expect(listProjectWorkspaces(client).map((item) => item.id)).toContain("workspace-client-a");
    expect(getActiveProjectWorkspaceId(client)).toBe("workspace-client-a");
  });

  it("persists office theme and replays event logs", async () => {
    client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    setOfficeTheme(client, "forest");
    createEvent(client, {
      id: "event-replay-1",
      type: "task_created",
      actorType: "user",
      actorId: "local-user"
    });

    expect(getOfficeTheme(client)).toBe("forest");
    expect(replayTimelineEvents(client, { limit: 5 }).map((event) => event.type)).toContain("task_created");
  });
});
