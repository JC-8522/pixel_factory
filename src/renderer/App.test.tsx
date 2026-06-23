import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import type { CodexOfficeApi, ProjectWorkspace } from "../shared/ipc";
import type { AppInfo } from "../shared/types/app";
import type { AgentRecord, EventRecord, FloorRecord, PermissionRuleRecord, WorkstationRecord } from "../shared/types/records";
import { MVP1_FLOOR_ID } from "../shared/office";
import { App } from "./App";
import { useAgentStore } from "./stores/agentStore";
import { useIntegrationStore } from "./stores/integrationStore";
import { useOfficeStore } from "./stores/officeStore";
import { useProfileStore } from "./stores/profileStore";

vi.mock("./components/AgentConversationWorkspace", () => ({
  AgentConversationWorkspace: ({
    agent,
    onClose,
    onDelete
  }: {
    agent: AgentRecord;
    onClose?: () => void;
    onDelete?: (agentId: string) => Promise<void> | void;
  }) => (
    <section aria-label="Mock conversation workspace">
      <strong>{agent.name}</strong>
      {onClose ? (
        <button onClick={onClose} type="button">
          Office
        </button>
      ) : null}
      {onDelete ? (
        <button onClick={() => void onDelete(agent.id)} type="button">
          Remove
        </button>
      ) : null}
    </section>
  )
}));

const NOW = "2026-06-21T10:00:00.000Z";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const appInfo: AppInfo = {
  name: "Local Codex Office",
  version: "0.1.0",
  mode: "development",
  localCodex: {
    status: "ready",
    sourcePath: "C:/Codex/codex.exe",
    launchPath: "C:/Codex/codex.exe",
    version: "codex-cli 0.1.0",
    message: "Local Codex is ready.",
    guidance: []
  }
};

const floor: FloorRecord = {
  id: MVP1_FLOOR_ID,
  name: "Main Floor",
  floor_index: 0,
  layout_preset: "mvp1_4x3",
  is_visible: 1,
  metadata_json: "{}",
  created_at: NOW,
  updated_at: NOW
};

const workspaces: ProjectWorkspace[] = [
  {
    id: "workspace-main",
    name: "Pixel Factory",
    rootPath: "C:/repo/pixel_factory",
    createdAt: NOW
  }
];

const createAgentRecord = (id: string, name: string): AgentRecord => ({
  id,
  name,
  role: "Codex Agent",
  profile_id: null,
  profile_snapshot_json: "{}",
  status: "idle",
  current_task: "Ready to help.",
  working_directory: ".",
  current_branch: null,
  last_command: null,
  runtime_kind: "codex_cli",
  permission_mode: "ask",
  auto_run_mode: "manual",
  position_x: 0,
  position_y: 0,
  metadata_json: "{}",
  created_at: NOW,
  updated_at: NOW
});

const createWorkstationRecord = (id: string, slotKey: string, assignedAgentId: string | null = null): WorkstationRecord => ({
  id,
  floor_id: MVP1_FLOOR_ID,
  slot_key: slotKey,
  name: slotKey === "ws-01" ? "Design" : slotKey,
  assigned_agent_id: assignedAgentId,
  metadata_json: "{}",
  created_at: NOW,
  updated_at: NOW
});

type MockState = {
  agents: AgentRecord[];
  workstations: WorkstationRecord[];
};

const createMockApi = (initial?: Partial<MockState>): CodexOfficeApi => {
  const state: MockState = {
    agents: initial?.agents ? clone(initial.agents) : [],
    workstations: initial?.workstations ? clone(initial.workstations) : []
  };

  return {
    app: {
      getInfo: vi.fn(async () => clone(appInfo)),
      pickWorkingDirectory: vi.fn(async () => "C:/repo/pixel_factory")
    },
    office: {
      getSnapshot: vi.fn(async () => ({
        floors: [clone(floor)],
        workstations: clone(state.workstations)
      })),
      createWorkstation: vi.fn(async (input) => {
        const workstation = createWorkstationRecord(input.id, input.slotKey);
        state.workstations.push(workstation);
        return clone(workstation);
      })
    },
    agents: {
      list: vi.fn(async () => clone(state.agents)),
      get: vi.fn(async (agentId: string) => clone(state.agents.find((agent) => agent.id === agentId) ?? null)),
      create: vi.fn(async (input) => {
        const agent = createAgentRecord(input.id, input.name);
        agent.current_task = input.currentTask ?? agent.current_task;
        agent.working_directory = input.workingDirectory;
        agent.permission_mode = input.permissionMode;
        state.agents.push(agent);
        if (input.workstationId) {
          state.workstations = state.workstations.map((workstation) =>
            workstation.id === input.workstationId
              ? { ...workstation, assigned_agent_id: agent.id, updated_at: NOW }
              : workstation
          );
        }
        return clone(agent);
      }),
      delete: vi.fn(async (agentId: string) => {
        const removed = state.agents.find((agent) => agent.id === agentId) ?? null;
        state.agents = state.agents.filter((agent) => agent.id !== agentId);
        state.workstations = state.workstations.map((workstation) =>
          workstation.assigned_agent_id === agentId
            ? { ...workstation, assigned_agent_id: null, updated_at: NOW }
            : workstation
        );
        return clone(removed);
      }),
      updatePosition: vi.fn(),
      assignSkill: vi.fn(),
      removeSkill: vi.fn()
    },
    profiles: {
      list: vi.fn(async () => []),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      duplicate: vi.fn(),
      delete: vi.fn(),
      assignSkill: vi.fn(),
      removeSkill: vi.fn(),
      listSkills: vi.fn(async () => []),
      generateSnapshot: vi.fn(),
      capabilityMatrix: vi.fn(),
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
      listByAgent: vi.fn(async () => [])
    },
    messages: {
      listBySession: vi.fn(async () => []),
      create: vi.fn()
    },
    skills: {
      scan: vi.fn(async () => []),
      list: vi.fn(async () => []),
      get: vi.fn(async () => null),
      listForAgent: vi.fn(async () => [])
    },
    tasks: {
      list: vi.fn(async () => []),
      create: vi.fn(),
      assign: vi.fn(),
      updateStatus: vi.fn()
    },
    meetings: {
      list: vi.fn(async () => []),
      create: vi.fn(),
      listParticipants: vi.fn(async () => []),
      listMessages: vi.fn(async () => []),
      sendMessage: vi.fn(),
      finish: vi.fn()
    },
    events: {
      list: vi.fn(async () => [] as EventRecord[]),
      get: vi.fn(async () => null)
    },
    tokenUsage: {
      listByAgent: vi.fn(async () => []),
      summaryByAgent: vi.fn()
    },
    integrations: {
      status: vi.fn(async () => ({
        attach: {
          runtimeKind: "codex_cli_attached",
          status: "disabled",
          reason: "Disabled in tests",
          controllable: false,
          detectedSessions: 0
        },
        mcp: {
          runtimeKind: "mcp",
          configured: false,
          status: "not_configured",
          reason: "Disabled in tests"
        },
        github: { configured: false, status: "not_configured", reason: "Disabled in tests" },
        plugins: { configured: false, status: "not_configured", reason: "Disabled in tests" }
      }))
    },
    workspaces: {
      list: vi.fn(async () => clone(workspaces)),
      create: vi.fn(),
      select: vi.fn(async (workspaceId: string) => clone(workspaces.find((workspace) => workspace.id === workspaceId) ?? workspaces[0]!)),
      getActive: vi.fn(async () => "workspace-main")
    },
    conversations: {
      getThread: vi.fn(),
      createThread: vi.fn(),
      switchThread: vi.fn(),
      renameThread: vi.fn(),
      archiveThread: vi.fn(),
      restoreThread: vi.fn(),
      sendMessage: vi.fn(),
      saveComposer: vi.fn(),
      saveDraft: vi.fn()
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
      getRequest: vi.fn(async () => null),
      getPendingForAgent: vi.fn(async () => null),
      decide: vi.fn(),
      listRules: vi.fn(async () => [] as PermissionRuleRecord[]),
      revokeRule: vi.fn(async () => null)
    },
    runtime: {
      discoverAgents: vi.fn(async () => clone(state.agents)),
      spawnAgent: vi.fn(),
      sendMessage: vi.fn(),
      stopAgent: vi.fn(),
      onEvent: vi.fn(() => () => void 0)
    }
  } as unknown as CodexOfficeApi;
};

const resetStores = (): void => {
  useAgentStore.getState().reset();
  useOfficeStore.getState().reset();
  useIntegrationStore.setState({
    workspaces: [],
    activeWorkspaceId: "default",
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

const flushUi = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const click = async (element: Element): Promise<void> => {
  await act(async () => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });
};

const findButton = (container: HTMLElement, label: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (!button) {
    throw new Error(`Missing button ${label}`);
  }
  return button as HTMLButtonElement;
};

const findButtonByAria = (container: HTMLElement, label: string): HTMLButtonElement => {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!button) {
    throw new Error(`Missing button ${label}`);
  }
  return button as HTMLButtonElement;
};

const mountApp = async (api: CodexOfficeApi): Promise<{ container: HTMLElement; root: Root }> => {
  Object.defineProperty(window, "codexOffice", {
    configurable: true,
    value: api
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<App />);
  });
  await flushUi();

  return { container, root };
};

const unmountApp = async (root: Root, container: HTMLElement): Promise<void> => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
};

describe("App office flow", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
      configurable: true,
      value: true
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    resetStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    resetStores();
    // @ts-expect-error test-only cleanup
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it("creates an agent from an empty workstation, enters the workspace, and can reopen it from the office", async () => {
    const api = createMockApi();
    const { container, root } = await mountApp(api);

    expect(container.querySelector('main[data-scene="office"]')).toBeTruthy();

    await click(findButtonByAria(container, "Design workstation"));
    await flushUi();
    expect(container.textContent).toContain("Create New Agent?");

    await click(findButton(container, "Set Up Workspace"));
    await flushUi();
    expect(container.textContent).toContain("Create Agent");

    await click(findButton(container, "Create Agent"));
    await flushUi();
    expect(container.textContent).toContain("Design");
    expect(container.querySelector('main[data-scene="conversation"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Conversation scene"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Mock conversation workspace"]')).toBeTruthy();

    await click(findButton(container, "Office"));
    await flushUi();
    expect(container.querySelector('main[data-scene="office"]')).toBeTruthy();
    expect(container.querySelector('[aria-label="Office view"]')).toBeTruthy();

    await click(findButtonByAria(container, "Design at Design"));
    await flushUi();
    expect(container.querySelector('[aria-label="Mock conversation workspace"]')).toBeTruthy();
    expect(container.textContent).toContain("Design");

    await unmountApp(root, container);
  });

  it("deletes an agent and frees the workstation for another create flow", async () => {
    const api = createMockApi({
      agents: [createAgentRecord("agent-1", "Agent 1")],
      workstations: [createWorkstationRecord("workstation-1", "ws-01", "agent-1")]
    });
    const { container, root } = await mountApp(api);

    await click(findButtonByAria(container, "Agent 1 at Design"));
    await flushUi();
    expect(container.querySelector('[aria-label="Mock conversation workspace"]')).toBeTruthy();

    await click(findButton(container, "Remove"));
    await flushUi();
    expect(window.confirm).toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Office view"]')).toBeTruthy();

    await click(findButtonByAria(container, "Design workstation"));
    await flushUi();
    expect(container.textContent).toContain("Create New Agent?");

    await unmountApp(root, container);
  });

  it("keeps the conversation workspace open when office slot selection changes independently", async () => {
    const api = createMockApi({
      agents: [createAgentRecord("agent-1", "Agent 1")],
      workstations: [createWorkstationRecord("workstation-1", "ws-01", "agent-1")]
    });
    const { container, root } = await mountApp(api);

    await click(findButtonByAria(container, "Agent 1 at Design"));
    await flushUi();
    expect(container.querySelector('[aria-label="Mock conversation workspace"]')).toBeTruthy();
    expect(container.querySelector('main[data-scene="conversation"]')).toBeTruthy();

    await act(async () => {
      useOfficeStore.getState().selectSlot(null);
    });
    await flushUi();

    expect(container.querySelector('[aria-label="Mock conversation workspace"]')).toBeTruthy();
    expect(container.querySelector('main[data-scene="conversation"]')).toBeTruthy();

    await unmountApp(root, container);
  });

  it("opens permissions from the office menu and clears pending office selection", async () => {
    const api = createMockApi();
    const { container, root } = await mountApp(api);

    await click(findButton(container, "Office"));
    await flushUi();
    expect(container.textContent).toContain("Permissions");
    expect(container.textContent).toContain("Clear Selection");

    await click(findButton(container, "Permissions"));
    await flushUi();
    expect(container.textContent).toContain("Office Permissions");
    expect(container.textContent).toContain("Governance / Audit");

    await click(findButtonByAria(container, "Close office permissions"));
    await flushUi();
    expect(container.textContent).not.toContain("Office Permissions");

    await click(findButtonByAria(container, "Design workstation"));
    await flushUi();
    expect(container.textContent).toContain("Create New Agent?");

    await click(findButton(container, "Office"));
    await flushUi();
    await click(findButton(container, "Clear Selection"));
    await flushUi();
    expect(container.textContent).not.toContain("Create New Agent?");
    expect(container.querySelector('[aria-label="Office view"]')).toBeTruthy();

    await unmountApp(root, container);
  });
});
