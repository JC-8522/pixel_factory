import { create } from "zustand";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { AgentRecord } from "../../shared/types/records";
import type { CreateAgentRequest, UpdateAgentPositionRequest } from "../../shared/ipc";

const statusFromRuntimeEvent = (event: AgentRuntimeEvent): string | null => {
  switch (event.type) {
    case "status_changed":
      return event.status;
    case "message_chunk":
    case "token_usage":
      return "thinking";
    case "command_started":
      return "running_command";
    case "command_completed":
      return event.exitCode === 0 ? "thinking" : "error";
    case "file_touched":
      return event.action === "read" ? "reading_files" : "editing_files";
    case "waiting_user_input":
      return "waiting_user_input";
    case "error":
      return "error";
    case "session_completed":
      return "completed";
    case "session_stopped":
      return "stopped";
    case "session_started":
      return "idle";
    default:
      return null;
  }
};

type AgentState = {
  agents: AgentRecord[];
  selectedAgentId: string | null;
  loading: boolean;
  hydrate(): Promise<void>;
  applyRuntimeEvent(event: AgentRuntimeEvent): void;
  createAgent(input: CreateAgentRequest): Promise<AgentRecord>;
  deleteAgent(agentId: string): Promise<AgentRecord | null>;
  updatePosition(input: UpdateAgentPositionRequest): Promise<AgentRecord>;
  selectAgent(agentId: string | null): void;
  reset(): void;
};

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgentId: null,
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    const agents = await window.codexOffice.agents.list();
    set({ agents, loading: false });
  },
  applyRuntimeEvent: (event) => {
    const nextStatus = statusFromRuntimeEvent(event);
    if (!nextStatus) {
      return;
    }

    set((state) => {
      let changed = false;
      const agents = state.agents.map((agent) => {
        if (agent.id !== event.agentId || agent.status === nextStatus) {
          return agent;
        }

        changed = true;
        return {
          ...agent,
          status: nextStatus
        };
      });

      return changed ? { agents } : state;
    });
  },
  createAgent: async (input) => {
    const agent = await window.codexOffice.agents.create(input);
    set((state) => ({ agents: [...state.agents.filter((item) => item.id !== agent.id), agent] }));
    return agent;
  },
  deleteAgent: async (agentId) => {
    const removed = await window.codexOffice.agents.delete(agentId);
    set((state) => ({
      agents: state.agents.filter((item) => item.id !== agentId),
      selectedAgentId: state.selectedAgentId === agentId ? null : state.selectedAgentId
    }));
    return removed;
  },
  updatePosition: async (input) => {
    const agent = await window.codexOffice.agents.updatePosition(input);
    set((state) => ({
      agents: state.agents.map((item) => (item.id === agent.id ? agent : item))
    }));
    return agent;
  },
  selectAgent: (agentId) => set({ selectedAgentId: agentId }),
  reset: () => set({ agents: [], selectedAgentId: null, loading: false })
}));
