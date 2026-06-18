import { create } from "zustand";
import type { AgentPackInspection, AgentPackInstallResult } from "../../shared/ipc";
import type { AgentPackRecord } from "../../shared/types/records";

type AgentPackStore = {
  installedPacks: AgentPackRecord[];
  inspection: AgentPackInspection | null;
  installResult: AgentPackInstallResult | null;
  loading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  inspect: (folderPath: string) => Promise<AgentPackInspection>;
  install: (folderPath: string) => Promise<AgentPackInstallResult>;
  uninstall: (packId: string) => Promise<void>;
  clearError: () => void;
};

export const useAgentPackStore = create<AgentPackStore>((set, get) => ({
  installedPacks: [],
  inspection: null,
  installResult: null,
  loading: false,
  error: null,

  hydrate: async () => {
    const installedPacks = await window.codexOffice.agentPacks.listInstalled();
    set({ installedPacks });
  },

  inspect: async (folderPath) => {
    set({ loading: true, error: null, installResult: null });
    try {
      const inspection = await window.codexOffice.agentPacks.inspect(folderPath);
      set({ inspection, loading: false });
      return inspection;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, loading: false });
      throw error;
    }
  },

  install: async (folderPath) => {
    set({ loading: true, error: null });
    try {
      const installResult = await window.codexOffice.agentPacks.install(folderPath);
      const installedPacks = await window.codexOffice.agentPacks.listInstalled();
      set({ installResult, installedPacks, loading: false });
      return installResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({ error: message, loading: false });
      throw error;
    }
  },

  uninstall: async (packId) => {
    set({ loading: true, error: null });
    await window.codexOffice.agentPacks.uninstall(packId);
    await get().hydrate();
    set({ loading: false });
  },

  clearError: () => set({ error: null })
}));
