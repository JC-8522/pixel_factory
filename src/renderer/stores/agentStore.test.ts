import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CodexOfficeApi } from "../../shared/ipc";
import type { AgentRecord } from "../../shared/types/records";
import { useAgentStore } from "./agentStore";

const agentRecord = (id: string, name: string): AgentRecord => ({
  id,
  name,
  role: "Frontend Engineer",
  profile_id: null,
  profile_snapshot_json: "{}",
  status: "idle",
  current_task: null,
  working_directory: "C:/repo",
  current_branch: null,
  last_command: null,
  runtime_kind: "mock",
  permission_mode: "ask",
  auto_run_mode: "manual",
  position_x: 0,
  position_y: 0,
  metadata_json: "{}",
  created_at: "2026-06-15T00:00:00.000Z",
  updated_at: "2026-06-15T00:00:00.000Z"
});

const installMockApi = (agents: AgentRecord[]): void => {
  const api = {
    agents: {
      list: vi.fn(async () => agents),
      get: vi.fn(),
      create: vi.fn(async (input) => agentRecord(input.id, input.name)),
      updatePosition: vi.fn(async (input) => ({ ...agents[0], id: input.agentId, position_x: input.x, position_y: input.y })),
      assignSkill: vi.fn()
    },
    runtime: {
      discoverAgents: vi.fn(async () => agents)
    }
  } as unknown as CodexOfficeApi;

  Object.defineProperty(window, "codexOffice", {
    configurable: true,
    value: api
  });
};

describe("useAgentStore", () => {
  beforeEach(() => {
    useAgentStore.getState().reset();
    installMockApi([agentRecord("agent-1", "Frontend")]);
  });

  it("hydrates agents through the preload API", async () => {
    await useAgentStore.getState().hydrate();

    expect(useAgentStore.getState().agents).toHaveLength(1);
    expect(useAgentStore.getState().agents[0]?.name).toBe("Frontend");
  });

  it("creates agents and notifies subscribers", async () => {
    const listener = vi.fn();
    const unsubscribe = useAgentStore.subscribe(listener);

    await useAgentStore.getState().createAgent({
      id: "agent-2",
      name: "Backend",
      role: "Backend Engineer",
      workingDirectory: "C:/repo",
      runtimeKind: "mock",
      permissionMode: "ask",
      autoRunMode: "manual"
    });

    expect(useAgentStore.getState().agents.map((agent) => agent.id)).toContain("agent-2");
    expect(listener).toHaveBeenCalled();

    unsubscribe();
  });
});
