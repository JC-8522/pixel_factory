import { create } from "zustand";
import type { CreateProjectWorkspaceRequest, OfficeTheme, ProjectWorkspace, V2IntegrationStatus } from "../../shared/ipc";
import type { EventRecord } from "../../shared/types/records";

type IntegrationStore = {
  workspaces: ProjectWorkspace[];
  activeWorkspaceId: string;
  theme: OfficeTheme;
  status: V2IntegrationStatus | null;
  replayEvents: EventRecord[];
  loading: boolean;
  hydrate: () => Promise<void>;
  createWorkspace: (input: CreateProjectWorkspaceRequest) => Promise<ProjectWorkspace>;
  selectWorkspace: (workspaceId: string) => Promise<void>;
  setTheme: (theme: OfficeTheme) => Promise<void>;
  refreshStatus: () => Promise<void>;
  replayTimeline: () => Promise<void>;
};

export const useIntegrationStore = create<IntegrationStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: "default",
  theme: "default",
  status: null,
  replayEvents: [],
  loading: false,

  hydrate: async () => {
    set({ loading: true });
    const [workspaces, activeWorkspaceId, theme, status, replayEvents] = await Promise.all([
      window.codexOffice.workspaces.list(),
      window.codexOffice.workspaces.getActive(),
      window.codexOffice.officeTheme.get(),
      window.codexOffice.integrations.status(),
      window.codexOffice.timeline.replay({ limit: 20 })
    ]);
    set({ workspaces, activeWorkspaceId, theme, status, replayEvents, loading: false });
  },

  createWorkspace: async (input) => {
    const workspace = await window.codexOffice.workspaces.create(input);
    const workspaces = await window.codexOffice.workspaces.list();
    set({ workspaces });
    return workspace;
  },

  selectWorkspace: async (workspaceId) => {
    await window.codexOffice.workspaces.select(workspaceId);
    set({ activeWorkspaceId: workspaceId });
    await get().replayTimeline();
  },

  setTheme: async (theme) => {
    const selected = await window.codexOffice.officeTheme.set(theme);
    set({ theme: selected });
  },

  refreshStatus: async () => {
    const status = await window.codexOffice.integrations.status();
    set({ status });
  },

  replayTimeline: async () => {
    const replayEvents = await window.codexOffice.timeline.replay({ limit: 20 });
    set({ replayEvents });
  }
}));
