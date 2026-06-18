/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createMigratedDatabaseClient, type DatabaseClient } from "./client";
import { createAgent, assignSkillToAgent, updateAgentStatus } from "./repositories/agents";
import { createEvent, listEvents } from "./repositories/events";
import {
  addMeetingMessage,
  addMeetingParticipant,
  completeMeeting,
  createMeeting,
  listMeetingMessages
} from "./repositories/meetings";
import { appendMessageContent, createMessage, listMessagesBySession } from "./repositories/messages";
import { createSession, endSession, listSessionsForAgent } from "./repositories/sessions";
import { getSetting, setSetting } from "./repositories/settings";
import { upsertSkill } from "./repositories/skills";
import { assignTask, createTask, linkTaskEvent, updateTaskStatus } from "./repositories/tasks";
import { createTokenUsage, listTokenUsageByAgent, summarizeTokenUsageByAgent } from "./repositories/tokenUsage";

const tempDirs: string[] = [];

const createTempDatabasePath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "local-codex-office-db-"));
  tempDirs.push(dir);
  return join(dir, "office.sqlite");
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("database client and migrations", () => {
  it("creates a file database and runs migrations idempotently", async () => {
    const filePath = createTempDatabasePath();
    const client = await createMigratedDatabaseClient({ filePath });
    client.migrate();
    client.save();
    client.close();

    const reopened = await createMigratedDatabaseClient({ filePath });
    const migrations = reopened.all<{ version: number; name: string }>(
      "SELECT version, name FROM schema_migrations ORDER BY version"
    );
    const sessionColumns = reopened.all<{ name: string }>("PRAGMA table_info(sessions)").map((column) => column.name);
    const messageColumns = reopened.all<{ name: string }>("PRAGMA table_info(messages)").map((column) => column.name);

    expect(migrations).toEqual([
      { version: 1, name: "initial_schema" },
      { version: 2, name: "schema_backfill" }
    ]);
    expect(sessionColumns).toEqual(expect.arrayContaining(["input_tokens", "output_tokens", "total_tokens"]));
    expect(messageColumns).toEqual(expect.arrayContaining(["input_tokens", "output_tokens", "total_tokens"]));
    reopened.close();
  });

  it("enforces foreign keys", async () => {
    const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });

    expect(() =>
      createSession(client, {
        id: "session-missing-agent",
        agentId: "missing-agent",
        runtimeKind: "mock",
        status: "running",
        workingDirectory: "C:/repo"
      })
    ).toThrow();

    client.close();
  });
});

describe("repositories", () => {
  let client: DatabaseClient;

  afterEach(() => {
    client?.close();
  });

  it("persists representative records across core tables", async () => {
    client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });

    const skill = upsertSkill(client, {
      id: "skill-react",
      name: "React UI Engineer",
      description: "Builds React UI",
      category: "frontend",
      rootPath: "C:/skills/react-ui-engineer",
      skillMdPath: "C:/skills/react-ui-engineer/SKILL.md",
      metadata: { source: "local" }
    });

    const agent = createAgent(client, {
      id: "agent-frontend",
      name: "Frontend",
      role: "Frontend Engineer",
      workingDirectory: "C:/repo/pixel_factory",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual",
      profileSnapshot: { communicationStyle: "concise" },
      currentTask: "Build shell"
    });

    const assignment = assignSkillToAgent(client, {
      agentId: agent.id,
      skillId: skill.id,
      assignedBy: "user"
    });

    const session = createSession(client, {
      id: "session-1",
      agentId: agent.id,
      runtimeKind: "mock",
      status: "running",
      workingDirectory: agent.working_directory,
      initialPrompt: "Start work",
      modelProfile: "default"
    });

    const userMessage = createMessage(client, {
      id: "message-user-1",
      sessionId: session.id,
      agentId: agent.id,
      role: "user",
      content: "Please inspect the shell."
    });
    const agentMessage = appendMessageContent(
      client,
      createMessage(client, {
        id: "message-agent-1",
        sessionId: session.id,
        agentId: agent.id,
        role: "agent",
        content: "",
        streamState: "streaming"
      }).id,
      "Inspection complete."
    );

    const task = assignTask(
      client,
      createTask(client, {
        id: "task-1",
        title: "Build scaffold",
        description: "Create Electron project foundation",
        requiredSkills: [skill.id],
        createdFrom: userMessage.id
      }).id,
      agent.id
    );

    const event = createEvent(client, {
      id: "event-1",
      type: "task_assigned",
      actorType: "user",
      actorId: "local-user",
      agentId: agent.id,
      sessionId: session.id,
      taskId: task.id,
      payload: { taskTitle: task.title }
    });
    const taskEvent = linkTaskEvent(client, task.id, event.id);
    const usage = createTokenUsage(client, {
      id: "usage-1",
      agentId: agent.id,
      sessionId: session.id,
      messageId: agentMessage.id,
      taskId: task.id,
      modelProfile: "default",
      inputTokens: 120,
      outputTokens: 80,
      estimatedCost: 0.004,
      costCurrency: "USD",
      usageSource: "reported"
    });

    const meeting = createMeeting(client, {
      id: "meeting-1",
      title: "Architecture review",
      goal: "Review the local office scaffold",
      moderatorAgentId: agent.id,
      outputFormat: "decision_note"
    });
    const participant = addMeetingParticipant(client, {
      meetingId: meeting.id,
      agentId: agent.id,
      role: "moderator"
    });
    const meetingMessage = addMeetingMessage(client, {
      id: "meeting-message-1",
      meetingId: meeting.id,
      agentId: agent.id,
      role: "moderator",
      content: "The scaffold is ready."
    });
    const completedMeeting = completeMeeting(client, meeting.id, "Proceed to database implementation.");

    const completedTask = updateTaskStatus(client, {
      taskId: task.id,
      status: "done",
      resultSummary: "Scaffold created and verified."
    });
    const completedSession = endSession(client, {
      sessionId: session.id,
      status: "completed",
      exitCode: 0
    });
    const completedAgent = updateAgentStatus(client, agent.id, "completed");
    const setting = setSetting(client, "localUserRole", { localUserRole: "manager" });

    expect(assignment.skill_id).toBe(skill.id);
    expect(listSessionsForAgent(client, agent.id)).toHaveLength(1);
    expect(listMessagesBySession(client, session.id).map((message) => message.id)).toEqual([
      userMessage.id,
      agentMessage.id
    ]);
    expect(agentMessage.content).toBe("Inspection complete.");
    expect(JSON.parse(event.payload_json)).toEqual({ taskTitle: "Build scaffold" });
    expect(taskEvent.event_id).toBe(event.id);
    expect(usage.total_tokens).toBe(200);
    expect(listTokenUsageByAgent(client, agent.id)).toHaveLength(1);
    expect(summarizeTokenUsageByAgent(client, agent.id).total_tokens).toBe(200);
    expect(summarizeTokenUsageByAgent(client, agent.id).estimated_cost).toBeCloseTo(0.004);
    expect(listMessagesBySession(client, session.id).find((message) => message.id === agentMessage.id)?.total_tokens).toBe(200);
    expect(listEvents(client, { taskId: task.id })).toHaveLength(1);
    expect(participant.role).toBe("moderator");
    expect(listMeetingMessages(client, meeting.id)).toEqual([meetingMessage]);
    expect(completedMeeting.status).toBe("completed");
    expect(completedTask.status).toBe("done");
    expect(completedSession.status).toBe("completed");
    expect(completedSession.total_tokens).toBe(200);
    expect(completedSession.usage_source).toBe("reported");
    expect(completedAgent.status).toBe("completed");
    expect(JSON.parse(setting.value_json)).toEqual({ localUserRole: "manager" });
    expect(getSetting(client, "localUserRole")?.key).toBe("localUserRole");
  });
});
