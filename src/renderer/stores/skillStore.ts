import { create } from "zustand";
import type { AssignSkillRequest } from "../../shared/ipc";
import type { AgentSkillRecord, SkillRecord } from "../../shared/types/records";

type SkillState = {
  skills: SkillRecord[];
  agentSkills: Record<string, AgentSkillRecord[]>;
  loading: boolean;
  hydrate(): Promise<void>;
  hydrateForAgent(agentId: string): Promise<void>;
  assignSkill(input: AssignSkillRequest): Promise<AgentSkillRecord>;
  reset(): void;
};

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  agentSkills: {},
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    const skills = await window.codexOffice.skills.list();
    set({ skills, loading: false });
  },
  hydrateForAgent: async (agentId) => {
    const assignments = await window.codexOffice.skills.listForAgent(agentId);
    set((state) => ({ agentSkills: { ...state.agentSkills, [agentId]: assignments } }));
  },
  assignSkill: async (input) => {
    const assignment = await window.codexOffice.agents.assignSkill(input);
    set((state) => ({
      agentSkills: {
        ...state.agentSkills,
        [input.agentId]: [
          ...(state.agentSkills[input.agentId] ?? []).filter((item) => item.skill_id !== assignment.skill_id),
          assignment
        ]
      }
    }));
    return assignment;
  },
  reset: () => set({ skills: [], agentSkills: {}, loading: false })
}));

