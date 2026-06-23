import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type {
  CodexOfficeApi,
  PermissionRequestRecord,
  ProjectWorkspace
} from "../../shared/ipc";
import type {
  ConversationAttachmentRef,
  ConversationComposerContext,
  ConversationEntryView,
  ConversationProcessStageView,
  ConversationRecordGroupView,
  ConversationRunView,
  ConversationTimelineEntry,
  ConversationVisibleFlowBlockView,
  ConversationThreadSummary,
  ConversationThreadView
} from "../../shared/types/conversation";
import type { AgentRecord, AgentProfileRecord } from "../../shared/types/records";
import { useIntegrationStore } from "../stores/integrationStore";
import { useProfileStore } from "../stores/profileStore";
import { AgentConversationWorkspace } from "./AgentConversationWorkspace";

const NOW = "2026-06-21T08:00:00.000Z";

type MockController = {
  api: CodexOfficeApi;
  calls: {
    createThread: ReturnType<typeof vi.fn>;
    switchThread: ReturnType<typeof vi.fn>;
    renameThread: ReturnType<typeof vi.fn>;
    archiveThread: ReturnType<typeof vi.fn>;
    restoreThread: ReturnType<typeof vi.fn>;
    saveComposer: ReturnType<typeof vi.fn>;
    saveDraft: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    getPendingForAgent: ReturnType<typeof vi.fn>;
    getRequest: ReturnType<typeof vi.fn>;
    decide: ReturnType<typeof vi.fn>;
    stopAgent: ReturnType<typeof vi.fn>;
    workspacesSelect: ReturnType<typeof vi.fn>;
  };
  setQueuePermissionRequest(value: boolean): void;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const createAgent = (): AgentRecord => ({
  id: "agent-1",
  name: "UI Builder",
  role: "Frontend Engineer",
  profile_id: null,
  profile_snapshot_json: "{}",
  status: "idle",
  current_task: null,
  working_directory: "C:/repo/pixel_factory",
  current_branch: "main",
  last_command: null,
  runtime_kind: "mock",
  permission_mode: "ask",
  auto_run_mode: "manual",
  position_x: 40,
  position_y: 120,
  metadata_json: "{}",
  created_at: NOW,
  updated_at: NOW
});

const createProfile = (
  id: string,
  name: string,
  defaults?: Partial<AgentProfileRecord>
): AgentProfileRecord => ({
  id,
  name,
  description: null,
  role: "Engineer",
  persona: null,
  instructions: null,
  default_model_profile: "5.4 High",
  default_permission_mode: "workspace_write",
  default_auto_run_mode: "manual",
  workspace_scope_json: "{}",
  tool_access_json: "{}",
  memory_preferences_json: "{}",
  startup_workflow_json: "[]",
  validation_policy_json: "{}",
  collaboration_behavior_json: "{}",
  communication_style: null,
  risk_tolerance: null,
  output_preferences_json: "{}",
  visual_identity_json: "{}",
  source_pack_id: null,
  created_at: NOW,
  updated_at: NOW,
  ...defaults
});

const createWorkspaces = (): ProjectWorkspace[] => [
  {
    id: "workspace-main",
    name: "Pixel Factory",
    rootPath: "C:/repo/pixel_factory",
    createdAt: NOW
  },
  {
    id: "workspace-lab",
    name: "Lab",
    rootPath: "C:/repo/lab",
    createdAt: NOW
  }
];

const createComposer = (
  overrides?: Partial<ConversationComposerContext>
): ConversationComposerContext => ({
  workspaceId: "workspace-main",
  workspaceRoot: "C:/repo/pixel_factory",
  mode: "local",
  branch: "main",
  profileId: null,
  profileLabel: null,
  modelProfile: "5.4 High",
  approvalMode: "workspace_write",
  ...overrides
});

const createEntry = (
  id: string,
  role: ConversationEntryView["role"],
  kind: ConversationEntryView["kind"],
  content: string,
  attachments: ConversationAttachmentRef[] = []
): ConversationEntryView => ({
  id,
  sessionId: id.startsWith("entry") ? "run-1" : null,
  role,
  kind,
  streamState: "complete",
  createdAt: NOW,
  parentMessageId: null,
  blocks: [
    ...(content ? [{ type: "markdown" as const, text: content }] : []),
    ...(attachments.length > 0 ? [{ type: "attachments" as const, attachments }] : [])
  ],
  attachments,
  content
});

const createRun = (
  id: string,
  status: string,
  initialPrompt: string,
  overrides?: Partial<ConversationRunView>
): ConversationRunView => {
  const entries = overrides?.entries ?? [
    createEntry(`${id}-prompt`, "user", "user_prompt", initialPrompt),
    createEntry(`${id}-reply`, "agent", "assistant_response", "Visible outcome")
  ];

  return {
    id,
    status,
    startedAt: NOW,
    endedAt: status === "running" ? null : NOW,
    initialPrompt,
    context: createComposer(),
    entries,
    process: [],
    processStages: [],
    recordGroups: [],
    visibleFlowBlocks: [],
    summary: {
      commandCount: 1,
      commands: ["pnpm test"],
      reviewedFiles: ["src/renderer/App.tsx"],
      changedFiles: ["src/renderer/components/AgentConversationWorkspace.tsx"],
      approvalRequestCount: 0,
      waitingForApproval: false,
      durationMs: 3000,
      totalTokens: 1200,
      reasoningTokens: 300,
      estimatedCost: 0.02
    },
    ...overrides
  };
};

const buildThreadSummary = (
  thread: Omit<ConversationThreadView, "availableThreads">
): ConversationThreadSummary => {
  const blockedRunCount = thread.runs.filter(
    (run) => run.summary.waitingForApproval || run.status === "waiting_user_input"
  ).length;
  const recoveryRunCount = thread.runs.filter((run) =>
    ["failed", "error", "stopped"].includes(run.status)
  ).length;
  const activeRunCount = thread.runs.filter(
    (run) => !["completed", "failed", "error", "stopped"].includes(run.status)
  ).length;

  return {
    id: thread.threadId,
    title: thread.title,
    startedAt: thread.runs[0]?.startedAt ?? null,
    lastUpdatedAt: thread.runs.at(-1)?.endedAt ?? thread.runs.at(-1)?.startedAt ?? NOW,
    runCount: thread.runs.length,
    latestStatus: thread.runs.at(-1)?.status ?? null,
    blockedRunCount,
    recoveryRunCount,
    activeRunCount,
    archived: thread.title.startsWith("[ARCHIVED] "),
    archivedAt: thread.title.startsWith("[ARCHIVED] ") ? NOW : null
  };
};

const withSummaries = (
  threads: Array<Omit<ConversationThreadView, "availableThreads">>,
  currentThreadId: string
): ConversationThreadView => {
  const current = threads.find((thread) => thread.threadId === currentThreadId);
  if (!current) {
    throw new Error(`Missing thread ${currentThreadId}`);
  }

  return {
    ...clone(current),
    availableThreads: threads.map((thread) => buildThreadSummary(thread))
  };
};

const createThread = (
  threadId: string,
  title: string,
  options?: Partial<Omit<ConversationThreadView, "agentId" | "threadId" | "title" | "composer" | "availableThreads">> & {
    composer?: Partial<ConversationComposerContext>;
  }
): Omit<ConversationThreadView, "availableThreads"> => ({
  agentId: "agent-1",
  threadId,
  title,
  composer: createComposer(options?.composer),
  draft: options?.draft ?? "",
  runs: options?.runs ?? [],
  totalEntries: options?.totalEntries ?? (options?.runs ?? []).reduce((sum, run) => sum + run.entries.length, 0)
});

const configureStores = (workspaces: ProjectWorkspace[]): void => {
  useIntegrationStore.setState({
    workspaces,
    activeWorkspaceId: workspaces[0]?.id ?? "default",
    theme: "default",
    status: null,
    replayEvents: [],
    loading: false
  });
  useProfileStore.setState({
    profiles: [],
    selectedProfileId: null,
    profileSkills: {},
    capabilityMatrix: null,
    exportedProfile: null,
    loading: false
  });
};

const createMockController = (options?: {
  threads?: Array<Omit<ConversationThreadView, "availableThreads">>;
  currentThreadId?: string;
  profiles?: AgentProfileRecord[];
  workspaces?: ProjectWorkspace[];
  queuePermissionRequest?: boolean;
}): MockController => {
  const workspaces = options?.workspaces ?? createWorkspaces();
  const profiles = options?.profiles ?? [
    createProfile("profile-default", "Default profile"),
    createProfile("profile-qa", "QA profile", {
      default_model_profile: "5.4 Medium",
      default_permission_mode: "ask"
    })
  ];

  const threadList = options?.threads ?? [
    createThread("thread-1", "Current thread", {
      runs: [createRun("run-1", "completed", "Review the latest UI polish.")]
    }),
    createThread("thread-2", "Second thread", {
      draft: "Saved follow-up",
      composer: { branch: "feature/qa" }
    })
  ];

  const state = {
    workspaces,
    profiles,
    threads: threadList,
    currentThreadId: options?.currentThreadId ?? threadList[0]!.threadId,
    pendingRequest: null as PermissionRequestRecord | null,
    queuePermissionRequest: options?.queuePermissionRequest ?? false
  };

  const currentView = (): ConversationThreadView => withSummaries(state.threads, state.currentThreadId);
  const updateThread = (
    threadId: string,
    updater: (thread: Omit<ConversationThreadView, "availableThreads">) => Omit<ConversationThreadView, "availableThreads">
  ): void => {
    state.threads = state.threads.map((thread) =>
      thread.threadId === threadId ? updater(clone(thread)) : thread
    );
  };

  const findThread = (threadId: string): Omit<ConversationThreadView, "availableThreads"> => {
    const thread = state.threads.find((item) => item.threadId === threadId);
    if (!thread) {
      throw new Error(`Missing thread ${threadId}`);
    }
    return thread;
  };

  const calls = {
    createThread: vi.fn(async () => {
      const source = findThread(state.currentThreadId);
      const nextId = `thread-${state.threads.length + 1}`;
      const nextThread = createThread(nextId, "New thread", {
        composer: source.composer,
        draft: "",
        runs: []
      });
      state.threads = [...state.threads, nextThread];
      state.currentThreadId = nextId;
      return currentView();
    }),
    switchThread: vi.fn(async ({ threadId }: { agentId: string; threadId: string }) => {
      state.currentThreadId = threadId;
      return currentView();
    }),
    renameThread: vi.fn(
      async ({ threadId, title }: { agentId: string; threadId: string; title: string }) => {
        updateThread(threadId, (thread) => ({ ...thread, title }));
        return currentView();
      }
    ),
    archiveThread: vi.fn(async ({ threadId }: { agentId: string; threadId: string }) => {
      updateThread(threadId, (thread) => ({
        ...thread,
        title: thread.title.startsWith("[ARCHIVED] ") ? thread.title : `[ARCHIVED] ${thread.title}`
      }));
      return currentView();
    }),
    restoreThread: vi.fn(async ({ threadId }: { agentId: string; threadId: string }) => {
      updateThread(threadId, (thread) => ({
        ...thread,
        title: thread.title.replace(/^\[ARCHIVED\]\s*/, "")
      }));
      return currentView();
    }),
    saveComposer: vi.fn(
      async ({ threadId, composer }: { agentId: string; threadId?: string; composer: ConversationComposerContext }) => {
        updateThread(threadId ?? state.currentThreadId, (thread) => ({ ...thread, composer: clone(composer) }));
        return clone(composer);
      }
    ),
    saveDraft: vi.fn(async ({ threadId, draft }: { agentId: string; threadId?: string; draft: string }) => {
      updateThread(threadId ?? state.currentThreadId, (thread) => ({ ...thread, draft }));
      return draft;
    }),
    sendMessage: vi.fn(
      async ({
        content,
        attachments,
        composer
      }: {
        agentId: string;
        threadId?: string;
        content: string;
        attachments?: ConversationAttachmentRef[];
        composer: ConversationComposerContext;
      }) => {
        const runId = `run-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
        if (state.queuePermissionRequest) {
          state.queuePermissionRequest = false;
          const pendingRun = createRun(runId, "waiting_user_input", content, {
            endedAt: null,
            context: clone(composer),
            entries: [createEntry(`${runId}-prompt`, "user", "user_prompt", content, attachments ?? [])],
            summary: {
              commandCount: 1,
              commands: ["rm build-output"],
              reviewedFiles: [],
              changedFiles: [],
              approvalRequestCount: 1,
              waitingForApproval: true,
              durationMs: null,
              totalTokens: 10,
              reasoningTokens: 0,
              estimatedCost: null
            }
          });
          updateThread(state.currentThreadId, (thread) => ({
            ...thread,
            composer: clone(composer),
            draft: "",
            runs: [...thread.runs, pendingRun],
            totalEntries: thread.totalEntries + pendingRun.entries.length
          }));
          state.pendingRequest = {
            id: "request-1",
            agentId: "agent-1",
            sessionId: runId,
            projectPath: composer.workspaceRoot,
            command: "rm -rf build-output",
            redactedCommand: "rm build-output",
            riskKinds: ["delete"],
            reasons: ["Deletes generated output."],
            riskLevel: "review",
            createdAt: NOW
          };
          return {
            status: "permission_required" as const,
            requestId: "request-1",
            thread: currentView()
          };
        }

        const completedRun = createRun(runId, "completed", content, {
          context: clone(composer),
          entries: [
            createEntry(`${runId}-prompt`, "user", "user_prompt", content, attachments ?? []),
            createEntry(`${runId}-reply`, "agent", "assistant_response", "Delivered visible result.")
          ]
        });

        updateThread(state.currentThreadId, (thread) => ({
          ...thread,
          composer: clone(composer),
          draft: "",
          runs: [...thread.runs, completedRun],
          totalEntries: thread.totalEntries + completedRun.entries.length
        }));
        state.pendingRequest = null;

        return {
          status: "sent" as const,
          thread: currentView()
        };
      }
    ),
    getPendingForAgent: vi.fn(async () => clone(state.pendingRequest)),
    getRequest: vi.fn(async () => clone(state.pendingRequest)),
    decide: vi.fn(async ({ requestId, decision }: { requestId: string; decision: string }) => {
      const result = {
        requestId,
        status: decision === "deny" ? "denied" : "approved"
      } as const;
      if (decision === "deny") {
        state.pendingRequest = null;
      }
      if (decision !== "deny") {
        state.pendingRequest = null;
      }
      return result;
    }),
    stopAgent: vi.fn(async (runId: string) => {
      updateThread(state.currentThreadId, (thread) => ({
        ...thread,
        runs: thread.runs.map((run) =>
          run.id === runId ? { ...run, status: "stopped", endedAt: NOW } : run
        )
      }));
      return {
        id: runId,
        agent_id: "agent-1",
        runtime_kind: "mock",
        external_session_id: null,
        process_id: null,
        status: "stopped",
        started_at: NOW,
        ended_at: NOW,
        working_directory: "C:/repo/pixel_factory",
        initial_prompt: null,
        model_profile: null,
        exit_code: null,
        error_message: null,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cached_tokens: 0,
        reasoning_tokens: 0,
        estimated_cost: null,
        cost_currency: null,
        usage_source: null,
        metadata_json: "{}"
      };
    }),
    workspacesSelect: vi.fn(async (workspaceId: string) => {
      useIntegrationStore.setState({ activeWorkspaceId: workspaceId });
      return state.workspaces.find((workspace) => workspace.id === workspaceId) ?? state.workspaces[0]!;
    })
  };

  const api = {
    app: {
      getInfo: vi.fn(),
      pickWorkingDirectory: vi.fn()
    },
    office: {
      getSnapshot: vi.fn(),
      createWorkstation: vi.fn()
    },
    agents: {
      list: vi.fn(async () => [createAgent()]),
      get: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      updatePosition: vi.fn(),
      assignSkill: vi.fn(),
      removeSkill: vi.fn()
    },
    profiles: {
      list: vi.fn(async () => clone(state.profiles)),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      duplicate: vi.fn(),
      delete: vi.fn(),
      assignSkill: vi.fn(),
      removeSkill: vi.fn(),
      listSkills: vi.fn(async () => []),
      generateSnapshot: vi.fn(),
      capabilityMatrix: vi.fn(async () => ({
        profileId: "profile-default",
        profileName: "Default profile",
        role: "Engineer",
        skills: [],
        permissionPreset: "workspace_write",
        workspaceScope: {},
        toolAccess: {},
        validationPolicy: {},
        collaborationBehavior: {}
      })),
      export: vi.fn(),
      importProfile: vi.fn()
    },
    agentPacks: {
      inspect: vi.fn(),
      install: vi.fn(),
      uninstall: vi.fn(),
      listInstalled: vi.fn(),
      validate: vi.fn()
    },
    sessions: {
      listByAgent: vi.fn()
    },
    messages: {
      listBySession: vi.fn(),
      create: vi.fn()
    },
    skills: {
      scan: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      listForAgent: vi.fn()
    },
    tasks: {
      list: vi.fn(),
      create: vi.fn(),
      assign: vi.fn(),
      updateStatus: vi.fn()
    },
    meetings: {
      list: vi.fn(),
      create: vi.fn(),
      listParticipants: vi.fn(),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
      finish: vi.fn()
    },
    events: {
      list: vi.fn(),
      get: vi.fn()
    },
    tokenUsage: {
      listByAgent: vi.fn(),
      summaryByAgent: vi.fn()
    },
    integrations: {
      status: vi.fn()
    },
    workspaces: {
      list: vi.fn(async () => clone(state.workspaces)),
      create: vi.fn(),
      select: calls.workspacesSelect,
      getActive: vi.fn(async () => state.workspaces[0]!.id)
    },
    conversations: {
      getThread: vi.fn(async () => currentView()),
      createThread: calls.createThread,
      switchThread: calls.switchThread,
      renameThread: calls.renameThread,
      archiveThread: calls.archiveThread,
      restoreThread: calls.restoreThread,
      sendMessage: calls.sendMessage,
      saveComposer: calls.saveComposer,
      saveDraft: calls.saveDraft
    },
    officeTheme: {
      get: vi.fn(async () => "default"),
      set: vi.fn(async () => "default")
    },
    timeline: {
      replay: vi.fn(async () => [])
    },
    settings: {
      get: vi.fn(async () => ({})),
      update: vi.fn(async () => ({}))
    },
    permissions: {
      getRequest: calls.getRequest,
      getPendingForAgent: calls.getPendingForAgent,
      decide: calls.decide,
      listRules: vi.fn(async () => []),
      revokeRule: vi.fn()
    },
    runtime: {
      discoverAgents: vi.fn(async () => [createAgent()]),
      spawnAgent: vi.fn(),
      sendMessage: vi.fn(),
      stopAgent: calls.stopAgent,
      onEvent: vi.fn(() => () => void 0)
    }
  } as unknown as CodexOfficeApi;

  Object.defineProperty(window, "codexOffice", {
    configurable: true,
    value: api
  });

  configureStores(workspaces);

  return {
    api,
    calls,
    setQueuePermissionRequest(value: boolean) {
      state.queuePermissionRequest = value;
    }
  };
};

const getButton = (container: HTMLElement, label: string): HTMLButtonElement => {
  const match = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === label
  );
  if (!match) {
    throw new Error(`Unable to find button "${label}"`);
  }
  return match as HTMLButtonElement;
};

const getButtonContaining = (container: HTMLElement, label: string): HTMLButtonElement => {
  const match = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label)
  );
  if (!match) {
    throw new Error(`Unable to find button containing "${label}"`);
  }
  return match as HTMLButtonElement;
};

const getRoleButton = (container: HTMLElement, label: string): HTMLElement => {
  const match = Array.from(container.querySelectorAll('[role="button"]')).find((element) =>
    element.textContent?.includes(label)
  );
  if (!match) {
    throw new Error(`Unable to find role button "${label}"`);
  }
  return match as HTMLElement;
};

const getTextarea = (container: HTMLElement): HTMLTextAreaElement => {
  const textarea = container.querySelector("textarea");
  if (!textarea) {
    throw new Error("Missing composer textarea");
  }
  return textarea as HTMLTextAreaElement;
};

const getChipSelect = (container: HTMLElement, label: string): HTMLSelectElement => {
  const chip = Array.from(container.querySelectorAll("label.conversation-context-chip")).find((node) =>
    node.textContent?.includes(label)
  );
  const select = chip?.querySelector("select");
  if (!select) {
    throw new Error(`Missing select for ${label}`);
  }
  return select as HTMLSelectElement;
};

const click = async (element: Element): Promise<void> => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
};

const setElementValue = (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void => {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : element instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  descriptor?.set?.call(element, value);
};

const changeValue = async (
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): Promise<void> => {
  await act(async () => {
    setElementValue(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
  });
};

const flushUi = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await vi.runOnlyPendingTimersAsync();
    await Promise.resolve();
  });
};

const mountWorkspace = async (
  controller: MockController,
  options?: { includeDelete?: boolean }
) => {
  const onClose = vi.fn();
  const onDelete = vi.fn(async (_agentId: string) => void 0);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <AgentConversationWorkspace
        agent={createAgent()}
        onClose={onClose}
        onDelete={options?.includeDelete === false ? void 0 : onDelete}
      />
    );
  });
  await flushUi();

  return {
    container,
    root,
    onClose,
    onDelete,
    controller
  };
};

const unmountWorkspace = async (root: Root, container: HTMLElement): Promise<void> => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
};

describe("AgentConversationWorkspace", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true
    });
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    Object.defineProperty(window, "URL", {
      configurable: true,
      value: {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn()
      }
    });
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => void 0)
      }
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    // @ts-expect-error test-only cleanup
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it("renders external scene actions and keeps thread controls working", async () => {
    const controller = createMockController();
    const view = await mountWorkspace(controller);

    await click(getButton(view.container, "Office"));
    expect(view.onClose).toHaveBeenCalledTimes(1);

    await click(getButton(view.container, "More"));
    await click(getButton(view.container, "Remove"));
    expect(view.onDelete).toHaveBeenCalledWith("agent-1");

    await click(getButton(view.container, "More"));
    await click(getButton(view.container, "Rename"));
    const renameInput = view.container.querySelector(".conversation-thread-title-input") as HTMLInputElement;
    expect(renameInput).toBeTruthy();
    await changeValue(renameInput, "Renamed thread");
    await click(getButton(view.container, "Save"));
    await flushUi();
    expect(controller.calls.renameThread).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-1",
      title: "Renamed thread"
    });
    expect(view.container.querySelector(".conversation-thread-title-input")).toBeNull();

    await click(getButton(view.container, "More"));
    await click(getButton(view.container, "Archive"));
    await flushUi();
    expect(controller.calls.archiveThread).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-1"
    });
    await click(getButton(view.container, "More"));
    expect(getButton(view.container, "Restore")).toBeTruthy();

    await click(getButton(view.container, "Restore"));
    await flushUi();
    expect(controller.calls.restoreThread).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-1"
    });

    await click(getButton(view.container, "History"));
    await flushUi();
    expect(view.container.textContent).toContain("Renamed thread");
    await click(getRoleButton(view.container, "Second thread"));
    await flushUi();
    expect(controller.calls.switchThread).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-2"
    });
    expect(view.container.textContent).toContain("Second thread");

    await click(getButton(view.container, "New thread"));
    await flushUi();
    expect(controller.calls.createThread).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("New thread");

    await unmountWorkspace(view.root, view.container);
  });

  it("supports composer controls, workspace/profile changes, and attachments", async () => {
    const controller = createMockController({
      threads: [createThread("thread-1", "New thread")]
    });
    const originalCreateElement = document.createElement.bind(document);
    const attachment = new File(["hello"], "brief.txt", { type: "text/plain" });

    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === "input") {
        const input = element as HTMLInputElement;
        input.click = () => {
          Object.defineProperty(input, "files", {
            configurable: true,
            value: [attachment]
          });
          input.dispatchEvent(new Event("change"));
        };
      }
      return element;
    }) as typeof document.createElement);

    const view = await mountWorkspace(controller, { includeDelete: false });

    expect(view.container.textContent).toContain("Start the first run.");
    expect(view.container.textContent).toContain("Start with the brief");
    expect(view.container.textContent).toContain("Use an example");
    expect(getButton(view.container, "History")).toBeTruthy();
    expect(view.container.textContent).not.toContain("Open another thread without leaving this workspace.");

    await click(getButton(view.container, "History"));
    await flushUi();
    expect(view.container.textContent).toContain("Thread history");
    expect(view.container.textContent).toContain("Open another thread without leaving this workspace.");

    const workspaceSelect = getChipSelect(view.container, "Workspace");
    await changeValue(workspaceSelect, "workspace-lab");
    await flushUi();
    expect(controller.calls.workspacesSelect).toHaveBeenCalledWith("workspace-lab");
    expect(controller.calls.saveComposer).toHaveBeenCalled();

    const profileSelect = getChipSelect(view.container, "Profile");
    await changeValue(profileSelect, "profile-qa");
    await flushUi();
    expect(controller.calls.saveComposer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        composer: expect.objectContaining({
          profileId: "profile-qa",
          profileLabel: "QA profile",
          modelProfile: "5.4 Medium",
          approvalMode: "ask"
        })
      })
    );

    await click(getButton(view.container, "Attach"));
    await flushUi();
    expect(view.container.textContent).toContain("brief.txt");

    await click(getButton(view.container, "Goal"));
    await flushUi();
    expect(view.container.textContent).toContain("Goal entry slot reserved");

    await click(getButton(view.container, "Voice"));
    await flushUi();
    expect(view.container.textContent).toContain("Voice entry slot reserved");

    await click(getButton(view.container, "Dismiss"));
    await flushUi();
    expect(view.container.textContent).not.toContain("Voice entry slot reserved");

    const removeAttachmentButton = view.container.querySelector(
      '[aria-label="Remove brief.txt"]'
    ) as HTMLButtonElement | null;
    expect(removeAttachmentButton).toBeTruthy();
    await click(removeAttachmentButton as HTMLButtonElement);
    await flushUi();
    expect(view.container.textContent).not.toContain("brief.txt");

    const textarea = getTextarea(view.container);
    await changeValue(textarea, "Ship the Codex-style composer polish.");
    await flushUi();
    await click(getButton(view.container, "Run"));
    await flushUi();
    expect(controller.calls.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        content: "Ship the Codex-style composer polish."
      })
    );
    expect(getTextarea(view.container).value).toBe("");

    await unmountWorkspace(view.root, view.container);
  });

  it("preserves merged composer context across rapid control changes", async () => {
    const controller = createMockController({
      threads: [createThread("thread-1", "New thread")]
    });
    const view = await mountWorkspace(controller, { includeDelete: false });

    const workspaceSelect = getChipSelect(view.container, "Workspace");
    const modeSelect = getChipSelect(view.container, "Mode");
    const profileSelect = getChipSelect(view.container, "Profile");
    const branchInput = Array.from(view.container.querySelectorAll("label.conversation-context-chip"))
      .find((node) => node.textContent?.includes("Branch"))
      ?.querySelector("input") as HTMLInputElement;
    const modelSelect = getChipSelect(view.container, "Model");
    const approvalSelect = getChipSelect(view.container, "Approval");

    await act(async () => {
      setElementValue(workspaceSelect, "workspace-lab");
      workspaceSelect.dispatchEvent(new Event("input", { bubbles: true }));
      workspaceSelect.dispatchEvent(new Event("change", { bubbles: true }));

      setElementValue(profileSelect, "profile-qa");
      profileSelect.dispatchEvent(new Event("input", { bubbles: true }));
      profileSelect.dispatchEvent(new Event("change", { bubbles: true }));

      setElementValue(modeSelect, "attached");
      modeSelect.dispatchEvent(new Event("input", { bubbles: true }));
      modeSelect.dispatchEvent(new Event("change", { bubbles: true }));

      setElementValue(branchInput, "codex/merged-context");
      branchInput.dispatchEvent(new Event("input", { bubbles: true }));
      branchInput.dispatchEvent(new Event("change", { bubbles: true }));
      branchInput.dispatchEvent(new FocusEvent("blur", { bubbles: true }));

      setElementValue(modelSelect, "codex-balanced");
      modelSelect.dispatchEvent(new Event("input", { bubbles: true }));
      modelSelect.dispatchEvent(new Event("change", { bubbles: true }));

      setElementValue(approvalSelect, "workspace_write");
      approvalSelect.dispatchEvent(new Event("input", { bubbles: true }));
      approvalSelect.dispatchEvent(new Event("change", { bubbles: true }));

      await Promise.resolve();
    });
    await flushUi();

    expect(controller.calls.saveComposer).toHaveBeenLastCalledWith(
      expect.objectContaining({
        agentId: "agent-1",
        composer: expect.objectContaining({
          workspaceId: "workspace-lab",
          workspaceRoot: "C:/repo/lab",
          profileId: "profile-qa",
          profileLabel: "QA profile",
          mode: "attached",
          branch: "codex/merged-context",
          modelProfile: "codex-balanced",
          approvalMode: "workspace_write"
        })
      })
    );

    await unmountWorkspace(view.root, view.container);
  });

  it("ignores stale composer save responses that resolve out of order", async () => {
    const controller = createMockController({
      threads: [createThread("thread-1", "New thread")],
      profiles: [
        createProfile("profile-default", "Default profile"),
        createProfile("profile-controls", "Controls profile", {
          default_model_profile: "5.4 Low",
          default_permission_mode: "on_request"
        })
      ]
    });
    const pendingSaves: Array<{
      composer: ConversationComposerContext;
      resolve: (value: ConversationComposerContext) => void;
    }> = [];

    controller.calls.saveComposer.mockImplementation(
      ({ composer }: { agentId: string; threadId?: string; composer: ConversationComposerContext }) =>
        new Promise<ConversationComposerContext>((resolve) => {
          pendingSaves.push({ composer: clone(composer), resolve });
        })
    );

    const view = await mountWorkspace(controller, { includeDelete: false });

    const workspaceSelect = getChipSelect(view.container, "Workspace");
    const profileSelect = getChipSelect(view.container, "Profile");
    const modeSelect = getChipSelect(view.container, "Mode");
    const modelSelect = getChipSelect(view.container, "Model");
    const approvalSelect = getChipSelect(view.container, "Approval");

    await act(async () => {
      setElementValue(workspaceSelect, "workspace-lab");
      workspaceSelect.dispatchEvent(new Event("input", { bubbles: true }));
      workspaceSelect.dispatchEvent(new Event("change", { bubbles: true }));

      setElementValue(profileSelect, "profile-controls");
      profileSelect.dispatchEvent(new Event("input", { bubbles: true }));
      profileSelect.dispatchEvent(new Event("change", { bubbles: true }));

      setElementValue(modeSelect, "attached");
      modeSelect.dispatchEvent(new Event("input", { bubbles: true }));
      modeSelect.dispatchEvent(new Event("change", { bubbles: true }));

      await Promise.resolve();
    });
    await flushUi();

    expect(pendingSaves).toHaveLength(3);

    await act(async () => {
      pendingSaves[2]?.resolve(clone(pendingSaves[2]!.composer));
      await Promise.resolve();
      pendingSaves[0]?.resolve(clone(pendingSaves[0]!.composer));
      await Promise.resolve();
      pendingSaves[1]?.resolve(clone(pendingSaves[1]!.composer));
      await Promise.resolve();
    });
    await flushUi();

    expect(getChipSelect(view.container, "Workspace").value).toBe("workspace-lab");
    expect(getChipSelect(view.container, "Profile").value).toBe("profile-controls");
    expect(getChipSelect(view.container, "Mode").value).toBe("attached");
    expect(getChipSelect(view.container, "Model").value).toBe("5.4 Low");
    expect(getChipSelect(view.container, "Approval").value).toBe("on_request");

    await unmountWorkspace(view.root, view.container);
  });

  it("handles approval flows from the inline chat controls", async () => {
    const controller = createMockController({
      threads: [createThread("thread-1", "New thread")],
      queuePermissionRequest: true
    });
    const view = await mountWorkspace(controller);

    await changeValue(getTextarea(view.container), "Delete build output and continue.");
    await flushUi();
    await click(getButton(view.container, "Run"));
    await flushUi();

    expect(controller.calls.sendMessage).toHaveBeenCalledTimes(1);
    expect(view.container.textContent).toContain("Allow once");
    expect(view.container.textContent).toContain("rm build-output");

    await click(getButton(view.container, "Allow once"));
    await flushUi();

    expect(controller.calls.decide).toHaveBeenCalledWith({
      requestId: "request-1",
      decision: "allow_once"
    });
    expect(controller.calls.sendMessage).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).not.toContain("Allow once");

    await unmountWorkspace(view.root, view.container);
  });

  it("supports the remaining approval decisions without throwing", async () => {
    const allowProjectController = createMockController({
      threads: [createThread("thread-1", "Approval thread")],
      queuePermissionRequest: true
    });
    const allowProjectView = await mountWorkspace(allowProjectController);

    await changeValue(getTextarea(allowProjectView.container), "Approve this cleanup for the project.");
    await flushUi();
    await click(getButton(allowProjectView.container, "Run"));
    await flushUi();
    await click(getButton(allowProjectView.container, "Allow for project"));
    await flushUi();

    expect(allowProjectController.calls.decide).toHaveBeenCalledWith({
      requestId: "request-1",
      decision: "allow_project"
    });
    expect(allowProjectController.calls.sendMessage).toHaveBeenCalledTimes(2);

    await unmountWorkspace(allowProjectView.root, allowProjectView.container);

    const denyController = createMockController({
      threads: [createThread("thread-1", "Deny thread")],
      queuePermissionRequest: true
    });
    const denyView = await mountWorkspace(denyController);

    await changeValue(getTextarea(denyView.container), "Deny this cleanup.");
    await flushUi();
    await click(getButton(denyView.container, "Run"));
    await flushUi();
    await click(getButton(denyView.container, "Deny"));
    await flushUi();

    expect(denyController.calls.decide).toHaveBeenCalledWith({
      requestId: "request-1",
      decision: "deny"
    });
    expect(denyController.calls.sendMessage).toHaveBeenCalledTimes(1);
    expect(denyView.container.textContent).toContain("The blocked action was denied.");

    await unmountWorkspace(denyView.root, denyView.container);
  });

  it("supports recovery actions for failed runs", async () => {
    const failedRun = createRun("run-failed", "failed", "Fix the broken regression.");
    const controller = createMockController({
      threads: [
        createThread("thread-1", "Recovery thread", {
          runs: [failedRun]
        })
      ]
    });
    const view = await mountWorkspace(controller);

    await click(getButton(view.container, "Continue"));
    await flushUi();
    expect(getTextarea(view.container).value).toContain("The previous run ended with an error.");
    expect(view.container.textContent).toContain("Dismiss");

    await click(getButton(view.container, "Dismiss"));
    await flushUi();
    expect(view.container.textContent).not.toContain("Continuation brief prepared");

    await click(getButton(view.container, "Reuse brief"));
    await flushUi();
    expect(getTextarea(view.container).value).toBe("Fix the broken regression.");

    await click(getButton(view.container, "Retry"));
    await flushUi();
    expect(controller.calls.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Fix the broken regression."
      })
    );

    await unmountWorkspace(view.root, view.container);
  });

  it("shows only thinking while a new send is launching from a recovery thread", async () => {
    const failedRun = createRun("run-failed", "failed", "Fix the broken regression.");
    const controller = createMockController({
      threads: [
        createThread("thread-1", "Recovery thread", {
          runs: [failedRun]
        })
      ]
    });
    const baseSend = controller.calls.sendMessage.getMockImplementation();
    const releaseSendRef: { current: (() => void) | null } = { current: null };
    controller.calls.sendMessage.mockImplementationOnce(async (input) => {
      await new Promise<void>((resolve) => {
        releaseSendRef.current = resolve;
      });
      return await baseSend?.(input);
    });
    const view = await mountWorkspace(controller);

    await changeValue(getTextarea(view.container), "Continue from the failed run.");
    await click(getButton(view.container, "Run"));
    await flushUi();

    expect(view.container.textContent).toContain("Thinking");
    expect(view.container.textContent).not.toContain("Run ended early.");
    expect(view.container.textContent).not.toContain("Retry");
    expect(view.container.textContent).not.toContain("Reuse brief");

    if (releaseSendRef.current) {
      releaseSendRef.current();
    }
    await flushUi();

    await unmountWorkspace(view.root, view.container);
  });

  it("supports active-run guidance and archived-thread restore actions", async () => {
    const liveRun = createRun("run-live", "running", "Monitor the QA pass.", {
      endedAt: null
    });
    const liveController = createMockController({
      threads: [
        createThread("thread-1", "Live guidance thread", {
          runs: [liveRun]
        })
      ]
    });
    const liveView = await mountWorkspace(liveController, { includeDelete: false });

    expect(liveView.container.textContent).toContain("Thinking");
    expect(liveView.container.textContent).not.toContain("Details");
    expect(liveView.container.textContent).not.toContain("Summary");
    expect(liveView.container.textContent).not.toContain("Activity");
    expect(liveView.container.textContent).not.toContain("Workspace actions");
    expect(liveView.container.textContent).not.toContain("Reviewed");
    expect(liveView.container.textContent).not.toContain("Changed");

    expect(liveView.container.textContent).not.toContain("Copy");
    expect(window.navigator.clipboard.writeText).not.toHaveBeenCalled();

    await unmountWorkspace(liveView.root, liveView.container);

    const archivedController = createMockController({
      threads: [
        createThread("thread-1", "[ARCHIVED] Archived thread", {
          runs: [createRun("run-archived", "completed", "Keep the archived summary visible.")]
        })
      ]
    });
    const archivedView = await mountWorkspace(archivedController, { includeDelete: false });

    await click(getButton(archivedView.container, "Restore thread"));
    await flushUi();

    expect(archivedController.calls.restoreThread).toHaveBeenCalledWith({
      agentId: "agent-1",
      threadId: "thread-1"
    });
    expect(archivedView.container.textContent).toContain("Archive");

    await unmountWorkspace(archivedView.root, archivedView.container);
  });

  it("renders a simple completed run in minimal chat mode by default", async () => {
    const minimalEntries = [
      createEntry("run-minimal-prompt", "user", "user_prompt", "Reply with the exact phrase: controls baseline ready."),
      createEntry(
        "run-minimal-reply",
        "agent",
        "assistant_response",
        "Mock agent received: Reply with the exact phrase: controls baseline ready.. I can stream deterministic responses for runtime testing."
      )
    ];
    const minimalRecordGroup: ConversationRecordGroupView = {
      id: "minimal-group",
      kind: "assistant_response",
      title: "Visible outcome",
      detail: "Latest visible outcome block.",
      facts: ["1 block"],
      items: [
        {
          entryId: minimalEntries[1]!.id,
          runEntryIndex: 1,
          entry: minimalEntries[1]!
        }
      ]
    };
    const minimalPromptGroup: ConversationRecordGroupView = {
      id: "minimal-prompt-group",
      kind: "user_prompt",
      title: "Run brief",
      detail: "Submitted brief for this run.",
      facts: ["1 block"],
      items: [
        {
          entryId: minimalEntries[0]!.id,
          runEntryIndex: 0,
          entry: minimalEntries[0]!
        }
      ]
    };
    const minimalVisibleFlowBlocks: ConversationVisibleFlowBlockView[] = [
      {
        id: "minimal-flow-process",
        kind: "process_summary",
        kicker: "Process",
        title: "Run resolved",
        detail: "Run resolved and handed back a visible result.",
        facts: ["1 workspace action", "1 changed"],
        tone: "working"
      },
      {
        id: "minimal-flow-prompt",
        kind: "message_group",
        kicker: "Run brief",
        title: "Submitted brief for this run.",
        detail: "Latest user brief block.",
        facts: ["1 block"],
        tone: "working",
        group: minimalPromptGroup
      },
      {
        id: "minimal-flow-message",
        kind: "message_group",
        kicker: "Visible outcome",
        title: "Manager-visible output",
        detail: "Latest visible outcome block.",
        facts: ["1 block"],
        tone: "neutral",
        group: minimalRecordGroup
      }
    ];
    const controller = createMockController({
      threads: [
        createThread("thread-1", "Minimal thread", {
          runs: [
            createRun("run-minimal", "completed", "Reply with the exact phrase: controls baseline ready.", {
              entries: minimalEntries,
              visibleFlowBlocks: minimalVisibleFlowBlocks
            })
          ]
        })
      ]
    });
    const view = await mountWorkspace(controller, { includeDelete: false });

    const minimalRun = view.container.querySelector('.conversation-run-thread[data-layout="minimal"]');
    expect(minimalRun).not.toBeNull();
    expect(minimalRun?.querySelector(".conversation-run-divider")).toBeNull();
    expect(minimalRun?.querySelector(".conversation-run-minimal-bar")).toBeNull();
    expect(minimalRun?.querySelector(".conversation-run-minimal-footer")).not.toBeNull();
    expect(minimalRun?.querySelector(".conversation-run-actions-minimal")).not.toBeNull();
    expect(minimalRun?.querySelector(".conversation-message-rail")).toBeNull();
    expect(minimalRun?.querySelector(".conversation-message-actor")).toBeNull();
    expect(minimalRun?.querySelectorAll(".conversation-run-visible-entry-flat").length).toBe(2);
    expect(view.container.textContent).toContain("Reply with the exact phrase: controls baseline ready.");
    expect(view.container.textContent).toContain("Mock agent received: Reply with the exact phrase: controls baseline ready.");
    expect(view.container.textContent).toContain("1,200 tokens / 300 reasoning");
    expect(view.container.textContent).not.toContain("Copy");
    expect(view.container.textContent).not.toContain("Run resolved and handed back a visible result.");
    expect(view.container.textContent).not.toContain("Visible work");
    expect(view.container.textContent).not.toContain("Run flow");
    expect(view.container.textContent).not.toContain("Details");
    expect(view.container.textContent).not.toContain("Process");

    await unmountWorkspace(view.root, view.container);
  });

  it("stops live runs from the run rail without throwing", async () => {
    const liveRun = createRun("run-live", "running", "Monitor the QA pass.", {
      endedAt: null
    });
    const controller = createMockController({
      threads: [
        createThread("thread-1", "Live thread", {
          runs: [liveRun]
        })
      ]
    });
    const view = await mountWorkspace(controller);

    await click(getButton(view.container, "Stop"));
    await flushUi();

    expect(controller.calls.stopAgent).toHaveBeenCalledWith("run-live");
    expect(view.container.textContent).toContain("Run stopped early");

    await unmountWorkspace(view.root, view.container);
  });

  it("keeps completed runs visually minimal even when rich process metadata exists", async () => {
    const outcomeAttachment: ConversationAttachmentRef = {
      id: "attachment-1",
      name: "qa-report.md",
      mimeType: "text/markdown",
      size: 128,
      source: "local_draft",
      filePath: "C:/repo/qa-report.md"
    };
    const detailedEntries = [
      createEntry("run-detail-prompt", "user", "user_prompt", "Audit the QA output and summarize the state."),
      createEntry("run-detail-reply", "agent", "assistant_response", "Visible manager-facing outcome.", [outcomeAttachment])
    ];
    const processItem: ConversationTimelineEntry = {
      id: "timeline-1",
      eventType: "command_completed",
      stage: "commands",
      activityKind: "running_command",
      label: "Command completed",
      title: "Validated the renderer suite",
      detail: "Vitest finished successfully for the manager-visible workspace checks.",
      facts: ["vitest", "7 tests"],
      tone: "working",
      createdAt: NOW,
      status: "completed",
      command: "pnpm vitest run src/renderer/App.test.tsx src/renderer/components/AgentConversationWorkspace.test.tsx",
      filePath: "src/renderer/components/AgentConversationWorkspace.tsx",
      fileAction: "edited",
      exitCode: 0,
      approvalDecision: null,
      riskKinds: [],
      response: null,
      usage: {
        totalTokens: 1200,
        reasoningTokens: 300,
        estimatedCost: 0.02
      }
    };
    const processStage: ConversationProcessStageView = {
      id: "stage-1",
      title: "Validation",
      kicker: "Workspace action",
      summary: "One visible command completed successfully for this run.",
      tone: "working",
      stateLabel: "Completed",
      latestAt: NOW,
      items: [processItem]
    };
    const recordGroup: ConversationRecordGroupView = {
      id: "group-1",
      kind: "assistant_response",
      title: "Visible outcome",
      detail: "1 visible response captured in this stretch of the run.",
      facts: ["2 blocks", "1 attachment"],
      items: [
        {
          entryId: detailedEntries[1]!.id,
          runEntryIndex: 1,
          entry: detailedEntries[1]!
        }
      ]
    };
    const visibleFlowBlocks: ConversationVisibleFlowBlockView[] = [
      {
        id: "flow-1",
        kind: "process_summary",
        kicker: "Process",
        title: "Validation completed",
        detail: "The renderer checks finished and the run produced a visible outcome.",
        facts: ["vitest", "7 tests"],
        tone: "working"
      },
      {
        id: "flow-2",
        kind: "message_group",
        kicker: "Visible outcome",
        title: "Manager-visible output",
        detail: "Latest visible outcome block.",
        facts: ["1 block"],
        tone: "neutral",
        group: recordGroup
      }
    ];
    const detailedRun = createRun("run-detail", "completed", "Audit the QA output and summarize the state.", {
      entries: detailedEntries,
      process: [processItem],
      processStages: [processStage],
      recordGroups: [recordGroup],
      visibleFlowBlocks
    });
    const controller = createMockController({
      threads: [
        createThread("thread-1", "Detailed thread", {
          runs: [detailedRun]
        })
      ]
    });
    const view = await mountWorkspace(controller, { includeDelete: false });

    expect(view.container.textContent).not.toContain("Details");
    expect(view.container.textContent).not.toContain("Process");
    expect(view.container.textContent).not.toContain("Activity");
    expect(view.container.textContent).not.toContain("Workspace actions");
    expect(view.container.textContent).not.toContain("Reviewed");
    expect(view.container.textContent).not.toContain("Changed");
    expect(view.container.textContent).not.toContain("App.tsx");
    expect(view.container.textContent).not.toContain("pnpm vitest run src/renderer/App.test.tsx");
    expect(view.container.textContent).toContain("Visible manager-facing outcome.");
    expect(view.container.textContent).toContain("1,200 tokens / 300 reasoning");
    expect(view.container.querySelector(".conversation-message-rail")).toBeNull();
    expect(view.container.querySelector(".conversation-message-actor")).toBeNull();

    await unmountWorkspace(view.root, view.container);
  });
});
