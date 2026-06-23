/**
 * @vitest-environment node
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MVP1_FLOOR_ID } from "../../shared/office";
import type { ConversationThreadView } from "../../shared/types/conversation";
import type { AgentRuntimeEvent, RuntimeSessionDescriptor, SendRuntimeMessageInput, SpawnRuntimeInput } from "../../shared/types/agent";
import { createMigratedDatabaseClient, type DatabaseClient } from "../db/client";
import { createSession, createTokenUsage, getWorkstation, listAgentSkills, upsertSkill } from "../db/repositories";
import { shouldStartFreshRun } from "../conversations/conversationThreadService";
import { createIpcHandlers } from "./createIpcHandlers";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "../runtime/AgentRuntime";
import { MockAgentRuntime } from "../runtime/MockAgentRuntime";
import { RuntimeRegistry } from "../runtime/RuntimeRegistry";

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

const createHandlers = async (
  options: {
    runtimeRegistry?: RuntimeRegistry;
  } = {}
): Promise<{ client: DatabaseClient; handlers: ReturnType<typeof createIpcHandlers> }> => {
  const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
  const handlers = createIpcHandlers({
    client,
    runtimeRegistry: options.runtimeRegistry,
    getAppInfo: () => ({
      name: "Local Codex Office",
      version: "0.1.0",
      mode: "development",
      localCodex: {
        status: "ready",
        sourcePath: "C:/Codex/codex.exe",
        launchPath: "C:/Codex/codex.exe",
        version: "codex-cli 0.1.0",
        message: "Local Codex is ready for agent creation.",
        guidance: []
      }
    })
  });

  return { client, handlers };
};

class HangingMockRuntime implements AgentRuntime {
  readonly kind = "mock" as const;
  private readonly handlers = new Set<RuntimeEventHandler>();

  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async spawn(input: SpawnRuntimeInput): Promise<RuntimeSessionDescriptor> {
    await this.emit({
      id: `${input.sessionId}-started`,
      type: "session_started",
      agentId: input.agentId,
      sessionId: input.sessionId,
      at: new Date().toISOString()
    });
    await this.emit({
      id: `${input.sessionId}-idle`,
      type: "status_changed",
      agentId: input.agentId,
      sessionId: input.sessionId,
      status: "idle",
      at: new Date().toISOString()
    });
    return {
      agentId: input.agentId,
      sessionId: input.sessionId,
      runtimeKind: this.kind
    };
  }

  async sendMessage(input: SendRuntimeMessageInput): Promise<void> {
    await this.emit({
      id: `${input.sessionId}-${input.inputMessageId}-thinking`,
      type: "status_changed",
      agentId: input.agentId,
      sessionId: input.sessionId,
      status: "thinking",
      at: new Date().toISOString()
    });
  }

  async stop(sessionId: string): Promise<void> {
    await this.emit({
      id: `${sessionId}-stopped`,
      type: "session_stopped",
      agentId: "agent-hanging",
      sessionId,
      at: new Date().toISOString()
    });
  }

  private async emit(event: AgentRuntimeEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}

class MockCodexCliRuntime implements AgentRuntime {
  readonly kind = "codex_cli" as const;

  private readonly runtime = new MockAgentRuntime();

  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent {
    return this.runtime.onEvent(handler);
  }

  async spawn(input: SpawnRuntimeInput): Promise<RuntimeSessionDescriptor> {
    await this.runtime.spawn(input);
    return {
      agentId: input.agentId,
      sessionId: input.sessionId,
      runtimeKind: this.kind
    };
  }

  async sendMessage(input: SendRuntimeMessageInput): Promise<void> {
    await this.runtime.sendMessage(input);
  }

  async stop(sessionId: string): Promise<void> {
    await this.runtime.stop(sessionId);
  }
}

describe("createIpcHandlers", () => {
  it("starts a fresh run when active context switches branch or workspace", () => {
    const activeSession = {
      id: "session-active",
      status: "running"
    } as Parameters<typeof shouldStartFreshRun>[0];

    const thread = {
      agentId: "agent-1",
      threadId: "thread-agent-1-default",
      title: "Review branch A",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/a",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      },
      draft: "",
      totalEntries: 0,
      availableThreads: [
        {
          id: "thread-agent-1-default",
          title: "Review branch A",
          startedAt: "2026-06-19T00:00:00.000Z",
          lastUpdatedAt: "2026-06-19T00:00:00.000Z",
          runCount: 1,
          latestStatus: "running",
          blockedRunCount: 0,
          recoveryRunCount: 0,
          activeRunCount: 1,
          archived: false,
          archivedAt: null
        }
      ],
      runs: [
        {
          id: "session-active",
          status: "running",
          startedAt: "2026-06-19T00:00:00.000Z",
          endedAt: null,
          initialPrompt: "Review branch A",
          context: {
            workspaceId: "workspace-a",
            workspaceRoot: "C:/repo",
            mode: "local",
            branch: "feature/a",
            modelProfile: "5.4 High",
            approvalMode: "workspace_write"
          },
          entries: [],
          process: [],
          processStages: [],
          recordGroups: [],
          visibleFlowBlocks: [],
          summary: {
            commandCount: 0,
            commands: [],
            reviewedFiles: [],
            changedFiles: [],
            approvalRequestCount: 0,
            waitingForApproval: false,
            durationMs: null,
            totalTokens: 0,
            reasoningTokens: 0,
            estimatedCost: null
          }
        }
      ]
    } satisfies ConversationThreadView;

    expect(
      shouldStartFreshRun(activeSession, thread.runs[0]!.context, thread)
    ).toBe(false);
    expect(
      shouldStartFreshRun(activeSession, { ...thread.runs[0]!.context, branch: "feature/b" }, thread)
    ).toBe(true);
    expect(
      shouldStartFreshRun(activeSession, { ...thread.runs[0]!.context, workspaceId: "workspace-b" }, thread)
    ).toBe(true);
  });

  it("keeps messages in the active run until branch context changes, then starts a new run", async () => {
    const client = await createMigratedDatabaseClient({ filePath: createTempDatabasePath() });
    const runtimeRegistry = new RuntimeRegistry([new HangingMockRuntime()]);
    const handlers = createIpcHandlers({
      client,
      runtimeRegistry,
      getAppInfo: () => ({
        name: "Local Codex Office",
        version: "0.1.0",
        mode: "development",
        localCodex: {
          status: "ready",
          sourcePath: "C:/Codex/codex.exe",
          launchPath: "C:/Codex/codex.exe",
          version: "codex-cli 0.1.0",
          message: "Local Codex is ready for agent creation.",
          guidance: []
        }
      })
    });

    handlers.agentsCreate({
      id: "agent-hanging",
      name: "Hanging Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-hanging",
      content: "First message on branch A",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/a",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-hanging",
      content: "Second message still on branch A",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/a",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    const threadBeforeBranchSwitch = handlers.conversationsGetThread("agent-hanging");
    expect(threadBeforeBranchSwitch.runs).toHaveLength(1);
    expect(threadBeforeBranchSwitch.runs[0]?.entries).toHaveLength(4);
    expect(threadBeforeBranchSwitch.runs[0]?.status).toBe("thinking");

    await handlers.conversationsSendMessage({
      agentId: "agent-hanging",
      content: "Third message on branch B",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/b",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    const threadAfterBranchSwitch = handlers.conversationsGetThread("agent-hanging");
    expect(threadAfterBranchSwitch.runs).toHaveLength(2);
    expect(threadAfterBranchSwitch.runs[0]?.context.branch).toBe("feature/a");
    expect(threadAfterBranchSwitch.runs[1]?.context.branch).toBe("feature/b");
    expect(threadAfterBranchSwitch.runs[1]?.entries).toHaveLength(2);

    runtimeRegistry.dispose();
    client.close();
  });

  it("starts a fresh run for each codex_cli follow-up in the same thread", async () => {
    const runtimeRegistry = new RuntimeRegistry([new MockCodexCliRuntime()]);
    const { client, handlers } = await createHandlers({ runtimeRegistry });

    handlers.agentsCreate({
      id: "agent-codex-thread",
      name: "Codex Thread Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "codex_cli",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-codex-thread",
      content: "First codex pass",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/codex-chat",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-codex-thread",
      content: "Second codex pass",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/codex-chat",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    const thread = handlers.conversationsGetThread("agent-codex-thread");
    expect(thread.runs).toHaveLength(2);
    expect(thread.runs[0]?.entries).toHaveLength(2);
    expect(thread.runs[1]?.entries).toHaveLength(2);

    runtimeRegistry.dispose();
    client.close();
  });

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

  it("creates office workstations, binds agents to them, and releases them on delete", async () => {
    const { client, handlers } = await createHandlers();

    const initialSnapshot = handlers.officeGetSnapshot();
    const workstation = handlers.officeCreateWorkstation({
      id: "ws-backend",
      floorId: MVP1_FLOOR_ID,
      slotKey: "ws-03"
    });
    const agent = handlers.agentsCreate({
      id: "agent-backend",
      name: "Backend",
      role: "Backend Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual",
      workstationId: workstation.id
    });

    expect(initialSnapshot.floors.map((floor) => floor.id)).toContain(MVP1_FLOOR_ID);
    expect(workstation.assigned_agent_id).toBeNull();
    expect(getWorkstation(client, workstation.id)?.assigned_agent_id).toBe(agent.id);

    await handlers.agentsDelete(agent.id);

    expect(getWorkstation(client, workstation.id)?.assigned_agent_id).toBeNull();
    expect(handlers.officeGetSnapshot().workstations.map((item) => item.id)).toContain(workstation.id);

    client.close();
  });

  it("deletes agents and cascades their session data through IPC handlers", async () => {
    const { client, handlers } = await createHandlers();

    const agent = handlers.agentsCreate({
      id: "agent-delete",
      name: "Cleanup",
      role: "QA Tester",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual"
    });
    const session = createSession(client, {
      id: "session-delete",
      agentId: agent.id,
      runtimeKind: "mock",
      status: "completed",
      workingDirectory: "C:/repo"
    });

    expect(handlers.sessionsListByAgent(agent.id)).toHaveLength(1);

    const removed = await handlers.agentsDelete(agent.id);

    expect(removed?.id).toBe(agent.id);
    expect(handlers.agentsGet(agent.id)).toBeNull();
    expect(handlers.sessionsListByAgent(agent.id)).toEqual([]);
    expect(handlers.messagesListBySession(session.id)).toEqual([]);

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
    expect(response.status).toBe("sent");
    if (response.status !== "sent") {
      throw new Error("Expected sent response");
    }
    expect(response.message.content).toContain("please stream this response");
    expect(response.message.stream_state).toBe("complete");
    expect(usage.total_tokens).toBeGreaterThan(0);
    expect(usage.estimated_cost).toBeGreaterThan(0);
    expect(handlers.agentsGet("agent-runtime")?.status).toBe("completed");
    expect(stoppedSession.status).toBe("completed");
    expect(handlers.eventsList({ agentId: "agent-runtime" }).map((event) => event.type)).toEqual(
      expect.arrayContaining(["session_started", "message_chunk", "token_usage_recorded", "session_completed"])
    );

    client.close();
  });

  it("projects conversation threads with persisted composer context, message blocks, and run summaries", async () => {
    const { client, handlers } = await createHandlers();

    handlers.agentsCreate({
      id: "agent-conversation",
      name: "Conversation Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    const savedComposer = handlers.conversationsSaveComposer({
      agentId: "agent-conversation",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/conversation",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });
    const savedDraft = handlers.conversationsSaveDraft({
      agentId: "agent-conversation",
      draft: "Keep this draft around until send."
    });
    const sendResult = await handlers.conversationsSendMessage({
      agentId: "agent-conversation",
      content: "Review the new workspace shell.",
      attachments: [
        {
          id: "attachment-1",
          name: "mockup.png",
          mimeType: "image/png",
          size: 1024,
          source: "local_draft",
          filePath: "C:/repo/mockup.png"
        }
      ],
      composer: savedComposer
    });

    expect(savedDraft).toBe("Keep this draft around until send.");
    expect(sendResult.status).toBe("sent");
    expect(sendResult.thread.draft).toBe("");
    const thread = handlers.conversationsGetThread("agent-conversation");
    const run = thread.runs[0];
    const userMessage = run?.entries.find((message) => message.role === "user");
    const assistantMessage = run?.entries.find((message) => message.role === "agent");

    expect(thread.composer.branch).toBe("feature/conversation");
    expect(thread.draft).toBe("");
    expect(thread.totalEntries).toBeGreaterThanOrEqual(2);
    expect(thread.runs).toHaveLength(1);
    expect(run?.context.workspaceId).toBe("workspace-a");
    expect(run?.status).toBe("completed");
    expect(run?.summary.totalTokens).toBeGreaterThan(0);
    expect(run?.summary.commands.length).toBeGreaterThan(0);
    expect(run?.summary.changedFiles.length).toBeGreaterThan(0);
    expect(run?.process.map((item) => item.eventType)).toEqual(
      expect.arrayContaining([
        "session_started",
        "status_changed",
        "command_started",
        "command_completed",
        "file_touched",
        "message_chunk",
        "token_usage_recorded",
        "session_completed"
      ])
    );
    expect(run?.process.find((item) => item.eventType === "status_changed")).toMatchObject({
      stage: "progress",
      activityKind: "thinking",
      label: "Thinking",
      title: "Thinking"
    });
    expect(run?.process.find((item) => item.eventType === "command_started")).toMatchObject({
      stage: "commands",
      activityKind: "running_command",
      label: "Workspace action",
      title: "Started a workspace action",
      facts: [],
      command: expect.any(String)
    });
    expect(run?.process.find((item) => item.eventType === "file_touched")).toMatchObject({
      stage: "files",
      activityKind: "editing_files",
      label: "Workspace changes",
      title: "Prepared a workspace change",
      facts: [],
      fileAction: "updated",
      filePath: expect.any(String)
    });
    expect(run?.process.find((item) => item.eventType === "token_usage_recorded")).toMatchObject({
      stage: "usage",
      title: "Updated run budget",
      usage: {
        totalTokens: expect.any(Number),
        reasoningTokens: expect.any(Number),
        estimatedCost: expect.any(Number)
      }
    });
    expect(run?.process.filter((item) => item.eventType === "message_chunk")).toHaveLength(1);
    expect(run?.process.find((item) => item.eventType === "message_chunk")).toMatchObject({
      stage: "response",
      title: "Published visible output",
      response: {
        updateCount: expect.any(Number),
        totalChars: expect.any(Number)
      }
    });
    expect(userMessage?.blocks.map((block) => block.type)).toEqual(["markdown", "attachments"]);
    expect(userMessage?.attachments[0]?.name).toBe("mockup.png");
    expect(userMessage?.attachments[0]?.filePath).toBe("C:/repo/mockup.png");
    expect(assistantMessage?.kind).toBe("assistant_response");
    expect(run?.processStages.map((stage) => stage.id)).toEqual(
      expect.arrayContaining(["thinking", "running_command", "editing_files", "response", "usage", "completed"])
    );
    expect(run?.processStages.find((stage) => stage.id === "running_command")).toMatchObject({
      kicker: "Workspace action",
      title: "Workspace action",
      stateLabel: "In motion"
    });
    expect(run?.processStages.find((stage) => stage.id === "response")).toMatchObject({
      title: "Visible outcome",
      summary: expect.stringContaining("visible outcome update")
    });
    expect(run?.recordGroups.map((group) => group.kind)).toEqual(["user_prompt", "assistant_response"]);
    expect(run?.recordGroups[0]).toMatchObject({
      title: "Run brief",
      items: [{ entryId: userMessage?.id, runEntryIndex: 0 }]
    });
    expect(run?.recordGroups[1]?.items[0]?.entry.kind).toBe("assistant_response");
    expect(run?.visibleFlowBlocks.map((block) => block.kind)).toEqual(
      expect.arrayContaining(["process_summary", "message_group"])
    );
    expect(run?.visibleFlowBlocks.find((block) => block.kind === "process_summary")).toMatchObject({
      kicker: "Process"
    });
    expect(run?.visibleFlowBlocks.find((block) => block.kind === "message_group")).toMatchObject({
      kicker: "Run brief"
    });

    client.close();
  });

  it("includes readable text attachment excerpts in runtime message context", async () => {
    const runtimeRegistry = new RuntimeRegistry([
      new MockAgentRuntime({
        responseFactory: (message) => `Echoed runtime context:\n${message}`
      })
    ]);
    const { client, handlers } = await createHandlers({ runtimeRegistry });
    const attachmentDir = mkdtempSync(join(tmpdir(), "local-codex-office-attachment-"));
    tempDirs.push(attachmentDir);
    const attachmentPath = join(attachmentDir, "notes.md");
    writeFileSync(attachmentPath, "# Review Notes\n\n- Check the composer shell\n- Keep approvals inline\n", "utf8");

    handlers.agentsCreate({
      id: "agent-attachment-context",
      name: "Attachment Context Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-attachment-context",
      content: "Use the attachment as context.",
      attachments: [
        {
          id: "attachment-text-1",
          name: "notes.md",
          mimeType: "text/markdown",
          size: 68,
          source: "local_draft",
          filePath: attachmentPath
        }
      ],
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "master",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    const thread = handlers.conversationsGetThread("agent-attachment-context");
    const run = thread.runs[0];
    const userMessage = run?.entries.find((message) => message.role === "user");
    const assistantMessage = run?.entries.find((message) => message.role === "agent");

    expect(run?.initialPrompt).toBe("Use the attachment as context.");
    expect(thread.totalEntries).toBeGreaterThanOrEqual(2);
    expect(userMessage?.content).toContain("Attachments:");
    expect(userMessage?.content).toContain("inline content");
    expect(userMessage?.content).toContain("# Review Notes");
    expect(userMessage?.content).toContain("Check the composer shell");
    expect(assistantMessage?.content).toContain("Echoed runtime context:");
    expect(run?.summary.durationMs).not.toBeNull();

    runtimeRegistry.dispose();
    client.close();
  });

  it("routes selected conversation profiles into runtime context and run projection", async () => {
    const runtimeRegistry = new RuntimeRegistry([
      new MockAgentRuntime({
        responseFactory: (_message, input) => `Echoed runtime context: ${input.skillPromptContext ?? "none"}`
      })
    ]);
    const { client, handlers } = await createHandlers({ runtimeRegistry });

    upsertSkill(client, {
      id: "skill-risk-radar",
      name: "Risk Radar",
      description: "Highlights risky implementation details",
      rootPath: "C:/skills/risk-radar",
      skillMdPath: "C:/skills/risk-radar/SKILL.md"
    });
    const profile = handlers.profilesCreate({
      id: "profile-conversation-risk",
      name: "Risk Reviewer",
      role: "Reviewer",
      instructions: "Call out risk before changing the workspace.",
      defaultModelProfile: "codex-balanced",
      defaultPermissionMode: "ask"
    });
    handlers.profilesAssignSkill({ profileId: profile.id, skillId: "skill-risk-radar", required: true });
    handlers.agentsCreate({
      id: "agent-profile-conversation",
      name: "Profile Conversation Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    const sendResult = await handlers.conversationsSendMessage({
      agentId: "agent-profile-conversation",
      content: "Audit the workspace before editing.",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/profile-pass",
        profileId: profile.id,
        profileLabel: profile.name,
        modelProfile: "codex-balanced",
        approvalMode: "ask"
      }
    });

    const thread = handlers.conversationsGetThread("agent-profile-conversation");
    const run = thread.runs[0];
    const assistantMessage = run?.entries.find((message) => message.role === "agent");

    expect(sendResult.status).toBe("sent");
    expect(thread.composer.profileId).toBe(profile.id);
    expect(thread.composer.profileLabel).toBe(profile.name);
    expect(run?.context.profileId).toBe(profile.id);
    expect(run?.context.profileLabel).toBe(profile.name);
    expect(run?.context.modelProfile).toBe("codex-balanced");
    expect(run?.context.approvalMode).toBe("ask");
    expect(assistantMessage?.content).toContain("Selected execution profile:");
    expect(assistantMessage?.content).toContain("Risk Reviewer");
    expect(assistantMessage?.content).toContain("Risk Radar: Highlights risky implementation details");

    runtimeRegistry.dispose();
    client.close();
  });

  it("persists unsent conversation drafts per agent thread", async () => {
    const { client, handlers } = await createHandlers();

    handlers.agentsCreate({
      id: "agent-draft",
      name: "Draft Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    const savedDraft = handlers.conversationsSaveDraft({
      agentId: "agent-draft",
      draft: "Compare the current workspace UI to Codex before sending."
    });
    const thread = handlers.conversationsGetThread("agent-draft");

    expect(savedDraft).toBe("Compare the current workspace UI to Codex before sending.");
    expect(thread.draft).toBe("Compare the current workspace UI to Codex before sending.");
    expect(thread.runs).toEqual([]);

    client.close();
  });

  it("creates and switches conversation threads with isolated drafts and runs", async () => {
    const { client, handlers } = await createHandlers();

    handlers.agentsCreate({
      id: "agent-threads",
      name: "Thread Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-threads",
      content: "Review the first implementation pass.",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/one",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });
    handlers.conversationsSaveDraft({
      agentId: "agent-threads",
      draft: "Follow up on the first thread."
    });

    const firstThread = handlers.conversationsGetThread("agent-threads");
    const secondThread = handlers.conversationsCreateThread("agent-threads");

    expect(secondThread.threadId).not.toBe(firstThread.threadId);
    expect(secondThread.title).toBe("New thread");
    expect(secondThread.runs).toEqual([]);
    expect(secondThread.draft).toBe("");
    expect(secondThread.composer.branch).toBe("feature/one");
    expect(secondThread.availableThreads).toHaveLength(2);

    handlers.conversationsSaveDraft({
      agentId: "agent-threads",
      draft: "Second thread draft."
    });

    handlers.conversationsSaveDraft({
      agentId: "agent-threads",
      threadId: firstThread.threadId,
      draft: "Pinned note for the first thread."
    });
    handlers.conversationsSaveComposer({
      agentId: "agent-threads",
      threadId: firstThread.threadId,
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/one-revisited",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    await handlers.conversationsSendMessage({
      agentId: "agent-threads",
      content: "Start a separate redesign thread.",
      composer: {
        workspaceId: "workspace-b",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/two",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    const currentSecondThread = handlers.conversationsGetThread("agent-threads");
    expect(currentSecondThread.runs).toHaveLength(1);
    expect(currentSecondThread.runs[0]?.context.branch).toBe("feature/two");
    expect(currentSecondThread.threadId).toBe(secondThread.threadId);

    const routedBackToFirst = await handlers.conversationsSendMessage({
      agentId: "agent-threads",
      threadId: firstThread.threadId,
      content: "Add another pass to the first thread.",
      composer: {
        workspaceId: "workspace-a",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "feature/one-revisited",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });

    expect(routedBackToFirst.thread.threadId).toBe(firstThread.threadId);
    expect(routedBackToFirst.thread.runs).toHaveLength(2);
    expect(handlers.conversationsGetThread("agent-threads").threadId).toBe(secondThread.threadId);

    const renamedCurrent = handlers.conversationsRenameThread({
      agentId: "agent-threads",
      threadId: secondThread.threadId,
      title: "Separate redesign lane"
    });

    expect(renamedCurrent.threadId).toBe(secondThread.threadId);
    expect(renamedCurrent.title).toBe("Separate redesign lane");
    expect(renamedCurrent.availableThreads.find((candidate) => candidate.id === secondThread.threadId)?.title).toBe(
      "Separate redesign lane"
    );

    const switchedBack = handlers.conversationsSwitchThread({
      agentId: "agent-threads",
      threadId: firstThread.threadId
    });

    expect(switchedBack.threadId).toBe(firstThread.threadId);
    expect(switchedBack.runs).toHaveLength(2);
    expect(switchedBack.composer.branch).toBe("feature/one-revisited");
    expect(switchedBack.runs[0]?.context.branch).toBe("feature/one");
    expect(switchedBack.runs[1]?.context.branch).toBe("feature/one-revisited");
    expect(switchedBack.draft).toBe("");
    expect(switchedBack.availableThreads).toHaveLength(2);
    expect(handlers.conversationsSwitchThread({ agentId: "agent-threads", threadId: secondThread.threadId }).title).toBe(
      "Separate redesign lane"
    );

    const archivedSecondThread = handlers.conversationsArchiveThread({
      agentId: "agent-threads",
      threadId: secondThread.threadId
    });

    expect(archivedSecondThread.threadId).toBe(firstThread.threadId);
    expect(
      archivedSecondThread.availableThreads.find((candidate) => candidate.id === secondThread.threadId)
    ).toMatchObject({
      archived: true
    });

    const restoredSecondThread = handlers.conversationsRestoreThread({
      agentId: "agent-threads",
      threadId: secondThread.threadId
    });

    expect(restoredSecondThread.threadId).toBe(secondThread.threadId);
    expect(restoredSecondThread.title).toBe("Separate redesign lane");
    expect(
      restoredSecondThread.availableThreads.find((candidate) => candidate.id === secondThread.threadId)
    ).toMatchObject({
      archived: false
    });

    client.close();
  });

  it("returns inline permission-required state for a fresh run when the first message is a risky command", async () => {
    const { client, handlers } = await createHandlers();

    handlers.agentsCreate({
      id: "agent-risky",
      name: "Risky Agent",
      role: "Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "workspace_write",
      autoRunMode: "manual"
    });

    const result = await handlers.conversationsSendMessage({
      agentId: "agent-risky",
      content: "rm build-output",
      composer: {
        workspaceId: "workspace-risk",
        workspaceRoot: "C:/repo",
        mode: "local",
        branch: "master",
        modelProfile: "5.4 High",
        approvalMode: "workspace_write"
      }
    });
    const threadAfterPermission = handlers.conversationsGetThread("agent-risky");

    expect(result.status).toBe("permission_required");
    if (result.status !== "permission_required") {
      throw new Error("Expected permission-required result");
    }

    expect(result.requestId).toContain("permission");
    expect(result.thread.runs).toHaveLength(1);
    expect(result.thread.totalEntries).toBe(0);
    expect(result.thread.runs[0]?.status).toBe("waiting_user_input");
    expect(result.thread.runs[0]?.entries).toEqual([]);
    expect(result.thread.runs[0]?.summary.waitingForApproval).toBe(true);
    expect(result.thread.runs[0]?.processStages.map((stage) => stage.id)).toEqual(["session", "waiting_user_input"]);
    expect(result.thread.runs[0]?.visibleFlowBlocks.map((block) => block.kind)).toEqual(["process_summary", "approval_summary"]);
    expect(result.thread.runs[0]?.visibleFlowBlocks.find((block) => block.kind === "approval_summary")).toMatchObject({
      kicker: "Approval",
      tone: "waiting"
    });
    expect(threadAfterPermission.draft).toBe("rm build-output");
    expect(handlers.agentsGet("agent-risky")?.status).toBe("waiting_user_input");
    expect(result.thread.runs[0]?.process.map((item) => item.eventType)).toEqual(
      expect.arrayContaining(["permission_requested", "waiting_user_input"])
    );
    expect(result.thread.runs[0]?.process.find((item) => item.eventType === "permission_requested")).toMatchObject({
      stage: "approval",
      activityKind: "waiting_user_input",
      label: "Waiting for approval",
      title: "Raised an approval check",
      riskKinds: expect.any(Array)
    });
    expect(result.thread.runs[0]?.process.find((item) => item.eventType === "waiting_user_input")).toMatchObject({
      stage: "approval",
      activityKind: "waiting_user_input",
      label: "Waiting for approval",
      title: "Blocked on approval",
      status: "waiting_user_input",
      command: expect.stringContaining("rm build-output")
    });
    expect(handlers.permissionsGetRequest(result.requestId)?.redactedCommand).toContain("rm build-output");
    expect(handlers.permissionsGetPendingForAgent("agent-risky")?.id).toBe(result.requestId);

    const denied = handlers.permissionsDecide({ requestId: result.requestId, decision: "deny" });
    expect(denied.status).toBe("denied");
    expect(handlers.agentsGet("agent-risky")?.status).toBe("idle");
    expect(handlers.permissionsGetPendingForAgent("agent-risky")).toBeNull();

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

  it("creates runtime agents from profiles with main-process snapshots, default skills, and initial task messages", async () => {
    const { client, handlers } = await createHandlers();

    upsertSkill(client, {
      id: "skill-product",
      name: "Product Design",
      rootPath: "C:/skills/product",
      skillMdPath: "C:/skills/product/SKILL.md"
    });

    const profile = handlers.profilesCreate({
      id: "profile-product",
      name: "Product Agent",
      role: "Product Strategist",
      instructions: "Think in product loops.",
      defaultModelProfile: "codex-balanced",
      defaultPermissionMode: "readonly",
      defaultAutoRunMode: "manual"
    });
    handlers.profilesAssignSkill({ profileId: profile.id, skillId: "skill-product", required: true });

    const session = await handlers.runtimeSpawnAgent({
      id: "agent-from-profile",
      name: "Product Pixel",
      role: "Product Strategist",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual",
      profileId: profile.id,
      profileSnapshot: { profileId: "spoofed", name: "Bad", role: "Bad" },
      currentTask: "Review the onboarding flow."
    });
    const agent = handlers.agentsGet("agent-from-profile");
    const snapshot = JSON.parse(agent?.profile_snapshot_json ?? "{}") as { profileId?: string; instructions?: string };
    const messages = handlers.messagesListBySession(session.id);

    expect(agent?.profile_id).toBe(profile.id);
    expect(snapshot.profileId).toBe(profile.id);
    expect(snapshot.instructions).toBe("Think in product loops.");
    expect(listAgentSkills(client, "agent-from-profile").map((skill) => skill.skill_id)).toEqual(["skill-product"]);
    expect(session.model_profile).toBe("codex-balanced");
    expect(messages.map((message) => message.role)).toEqual(["user", "agent"]);
    expect(messages[0]?.content).toBe("Review the onboarding flow.");
    expect(handlers.eventsList({ agentId: "agent-from-profile" }).map((event) => event.type)).toEqual(
      expect.arrayContaining(["agent_created", "skill_attached", "message_sent", "session_completed"])
    );

    client.close();
  });
});
