import { create } from "zustand";
import type { AssignSkillRequest, ScanSkillsRequest } from "../../shared/ipc";
import type { AgentSkillRecord, SkillRecord } from "../../shared/types/records";

type SkillState = {
  skills: SkillRecord[];
  agentSkills: Record<string, AgentSkillRecord[]>;
  loading: boolean;
  scan(input?: ScanSkillsRequest): Promise<SkillRecord[]>;
  hydrate(): Promise<void>;
  hydrateForAgent(agentId: string): Promise<void>;
  assignSkill(input: AssignSkillRequest): Promise<AgentSkillRecord>;
  removeSkill(input: Omit<AssignSkillRequest, "assignedBy">): Promise<AgentSkillRecord | null>;
  reset(): void;
};

export const useSkillStore = create<SkillState>((set) => ({
  skills: [],
  agentSkills: {},
  loading: false,
  scan: async (input) => {
    set({ loading: true });
    const skills = await window.codexOffice.skills.scan(input);
    set({ skills, loading: false });
    return skills;
  },
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
  removeSkill: async (input) => {
    const removed = await window.codexOffice.agents.removeSkill(input);
    set((state) => ({
      agentSkills: {
        ...state.agentSkills,
        [input.agentId]: (state.agentSkills[input.agentId] ?? []).filter((item) => item.skill_id !== input.skillId)
      }
    }));
    return removed;
  },
  reset: () => set({ skills: [], agentSkills: {}, loading: false })
}));
