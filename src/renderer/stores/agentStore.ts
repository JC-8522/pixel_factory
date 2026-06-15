import { create } from "zustand";
import type { AgentRecord } from "../../shared/types/records";
import type { CreateAgentRequest, UpdateAgentPositionRequest } from "../../shared/ipc";

type AgentState = {
  agents: AgentRecord[];
  selectedAgentId: string | null;
  loading: boolean;
  hydrate(): Promise<void>;
  createAgent(input: CreateAgentRequest): Promise<AgentRecord>;
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

