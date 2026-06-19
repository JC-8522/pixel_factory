import { create } from "zustand";
import type { AgentRecord } from "../../shared/types/records";
import type { CreateAgentRequest, UpdateAgentPositionRequest } from "../../shared/ipc";

type AgentState = {
  agents: AgentRecord[];
  selectedAgentId: string | null;
  loading: boolean;
  hydrate(): Promise<void>;
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
