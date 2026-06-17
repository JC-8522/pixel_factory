/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import { createSession, createTokenUsage, upsertSkill } from "../db/repositories";
import { createIpcHandlers } from "./createIpcHandlers";

const tempDirs: string[] = [];

const createTempDatabasePath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "local-codex-office-ipc-"));
  tempDirs.push(dir);
  return join(dir, "office.sqlite");
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const createHandlers = async (): Promise<{ client: DatabaseClient; handlers: ReturnType<typeof createIpcHandlers> }> => {
  const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
  const handlers = createIpcHandlers({
    client,
    getAppInfo: () => ({ name: "Local Codex Office", version: "0.1.0", mode: "development" })
  });

  return { client, handlers };
};

describe("createIpcHandlers", () => {
  it("rejects invalid payloads before repository writes", async () => {
    const { client, handlers } = await createHandlers();

    expect(() => handlers.agentsCreate({ id: "", name: "Bad" })).toThrow("agent id");
    expect(() => handlers.tasksUpdateStatus({ taskId: "task-1", status: "unknown" })).toThrow("task status");
    expect(handlers.agentsList()).toEqual([]);

    client.close();
  });

  it("hydrates data through typed handler functions", async () => {
    const { client, handlers } = await createHandlers();

    upsertSkill(client, {
      id: "skill-testing",
      name: "Testing",
      rootPath: "C:/skills/testing",
      skillMdPath: "C:/skills/testing/SKILL.md"
    });

    const agent = handlers.agentsCreate({
      id: "agent-1",
      name: "QA",
      role: "QA Tester",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual"
    });
    const assignment = handlers.agentsAssignSkill({
      agentId: agent.id,
      skillId: "skill-testing",
      assignedBy: "local-user"
    });
    const task = handlers.tasksCreate({
      id: "task-1",
      title: "Verify IPC",
      requiredSkills: ["skill-testing"]
    });
    const assignedTask = handlers.tasksAssign({ taskId: task.id, agentId: agent.id });
    const session = createSession(client, {
      id: "session-1",
      agentId: agent.id,
      runtimeKind: "mock",
      status: "running",
      workingDirectory: "C:/repo"
    });
    createTokenUsage(client, {
      id: "usage-1",
      agentId: agent.id,
      sessionId: session.id,
      taskId: assignedTask.id,
      inputTokens: 30,
      outputTokens: 20,
      estimatedCost: 0.001,
      costCurrency: "USD",
      usageSource: "estimated"
    });

    expect(handlers.agentsList()).toHaveLength(1);
    expect(assignment.skill_id).toBe("skill-testing");
    expect(assignedTask.assigned_agent_id).toBe(agent.id);
    expect(handlers.eventsList({ agentId: agent.id }).map((event) => event.type)).toContain("agent_created");
    expect(handlers.tokenUsageListByAgent(agent.id)).toHaveLength(1);
    expect(handlers.tokenUsageSummaryByAgent(agent.id).total_tokens).toBe(50);

    client.close();
  });

  it("runs the mock runtime through IPC and persists streamed output", async () => {
    const { client, handlers } = await createHandlers();
    const session = await handlers.runtimeSpawnAgent({
      id: "agent-runtime",
      name: "Runtime",
      role: "Mock Agent",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual"
    });

    const response = await handlers.runtimeSendMessage(session.id, "please stream this response");
    const usage = handlers.tokenUsageSummaryByAgent("agent-runtime");
    const messages = handlers.messagesListBySession(session.id);
    const stoppedSession = await handlers.runtimeStopAgent(session.id);

    expect(messages.map((message) => message.role)).toEqual(["user", "agent"]);
    expect(response.content).toContain("please stream this response");
    expect(response.stream_state).toBe("complete");
    expect(usage.total_tokens).toBeGreaterThan(0);
    expect(usage.estimated_cost).toBeGreaterThan(0);
    expect(handlers.agentsGet("agent-runtime")?.status).toBe("stopped");
    expect(stoppedSession.status).toBe("stopped");
    expect(handlers.eventsList({ agentId: "agent-runtime" }).map((event) => event.type)).toEqual(
      expect.arrayContaining(["session_started", "message_chunk", "token_usage_recorded", "session_stopped"])
    );

    client.close();
  });

  it("manages agent profiles through IPC handlers", async () => {
    const { client, handlers } = await createHandlers();

    upsertSkill(client, {
      id: "skill-docs",
      name: "Documentation",
      rootPath: "C:/skills/docs",
      skillMdPath: "C:/skills/docs/SKILL.md"
    });

    const profile = handlers.profilesCreate({
      id: "profile-docs",
      name: "Docs Agent",
      role: "Documentation Writer",
      instructions: "Write clear docs.",
      defaultPermissionMode: "readonly",
      communicationStyle: "concise"
    });
    const assignment = handlers.profilesAssignSkill({
      profileId: profile.id,
      skillId: "skill-docs",
      required: true
    });
    const matrix = handlers.profilesCapabilityMatrix(profile.id);
    const snapshot = handlers.profilesGenerateSnapshot(profile.id);
    const exported = handlers.profilesExport(profile.id);

    expect(handlers.profilesList()).toHaveLength(1);
    expect(assignment.required).toBe(1);
    expect(matrix.skills[0]?.name).toBe("Documentation");
    expect(snapshot.defaultPermissionMode).toBe("readonly");
    expect(exported.profile.profileId).toBe(profile.id);

    client.close();
  });
});
