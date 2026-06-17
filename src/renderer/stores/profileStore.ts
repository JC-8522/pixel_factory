import { create } from "zustand";
import type { AgentProfileRecord, AgentProfileSkillRecord } from "../../shared/types/records";
import type {
  AgentCapabilityMatrix,
  AgentProfileExport,
  AgentProfileSnapshot,
  AssignProfileSkillRequest,
  CreateAgentProfileRequest,
  DuplicateAgentProfileRequest,
  UpdateAgentProfileRequest
} from "../../shared/ipc";

type ProfileState = {
  profiles: AgentProfileRecord[];
  selectedProfileId: string | null;
  profileSkills: Record<string, AgentProfileSkillRecord[]>;
  capabilityMatrix: AgentCapabilityMatrix | null;
  exportedProfile: AgentProfileExport | null;
  loading: boolean;
  hydrate(): Promise<void>;
  selectProfile(profileId: string | null): Promise<void>;
  createProfile(input: CreateAgentProfileRequest): Promise<AgentProfileRecord>;
  updateProfile(input: UpdateAgentProfileRequest): Promise<AgentProfileRecord>;
  duplicateProfile(input: DuplicateAgentProfileRequest): Promise<AgentProfileRecord>;
  deleteProfile(profileId: string): Promise<AgentProfileRecord | null>;
  assignSkill(input: AssignProfileSkillRequest): Promise<AgentProfileSkillRecord>;
  removeSkill(input: Omit<AssignProfileSkillRequest, "required">): Promise<AgentProfileSkillRecord | null>;
  generateSnapshot(profileId: string): Promise<AgentProfileSnapshot>;
  exportProfile(profileId: string): Promise<AgentProfileExport>;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [],
  selectedProfileId: null,
  profileSkills: {},
  capabilityMatrix: null,
  exportedProfile: null,
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    const profiles = await window.codexOffice.profiles.list();
    set({ profiles, loading: false });
  },
  selectProfile: async (profileId) => {
    if (!profileId) {
      set({ selectedProfileId: null, capabilityMatrix: null, exportedProfile: null });
      return;
    }

    const [skills, capabilityMatrix] = await Promise.all([
      window.codexOffice.profiles.listSkills(profileId),
      window.codexOffice.profiles.capabilityMatrix(profileId)
    ]);
    set((state) => ({
      selectedProfileId: profileId,
      profileSkills: { ...state.profileSkills, [profileId]: skills },
      capabilityMatrix,
      exportedProfile: null
    }));
  },
  createProfile: async (input) => {
    const profile = await window.codexOffice.profiles.create(input);
    set((state) => ({ profiles: [...state.profiles, profile].sort((a, b) => a.name.localeCompare(b.name)) }));
    await get().selectProfile(profile.id);
    return profile;
  },
  updateProfile: async (input) => {
    const profile = await window.codexOffice.profiles.update(input);
    set((state) => ({
      profiles: state.profiles.map((item) => (item.id === profile.id ? profile : item))
    }));
    await get().selectProfile(profile.id);
    return profile;
  },
  duplicateProfile: async (input) => {
    const profile = await window.codexOffice.profiles.duplicate(input);
    set((state) => ({ profiles: [...state.profiles, profile].sort((a, b) => a.name.localeCompare(b.name)) }));
    await get().selectProfile(profile.id);
    return profile;
  },
  deleteProfile: async (profileId) => {
    const deleted = await window.codexOffice.profiles.delete(profileId);
    set((state) => ({
      profiles: state.profiles.filter((profile) => profile.id !== profileId),
      selectedProfileId: state.selectedProfileId === profileId ? null : state.selectedProfileId,
      capabilityMatrix: state.selectedProfileId === profileId ? null : state.capabilityMatrix
    }));
    return deleted;
  },
  assignSkill: async (input) => {
    const assignment = await window.codexOffice.profiles.assignSkill(input);
    await get().selectProfile(input.profileId);
    return assignment;
  },
  removeSkill: async (input) => {
    const removed = await window.codexOffice.profiles.removeSkill(input);
    await get().selectProfile(input.profileId);
    return removed;
  },
  generateSnapshot: (profileId) => window.codexOffice.profiles.generateSnapshot(profileId),
  exportProfile: async (profileId) => {
    const exportedProfile = await window.codexOffice.profiles.export(profileId);
    set({ exportedProfile });
    return exportedProfile;
  }
}));
