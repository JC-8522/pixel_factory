import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import { IPC_CHANNELS, type CodexOfficeApi } from "../shared/ipc";

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args) as Promise<T>;

const api: CodexOfficeApi = {
  app: {
    getInfo: () => invoke(IPC_CHANNELS.appInfo),
    pickWorkingDirectory: () => invoke(IPC_CHANNELS.appPickWorkingDirectory)
  },
  office: {
    getSnapshot: () => invoke(IPC_CHANNELS.officeGetSnapshot),
    createWorkstation: (input) => invoke(IPC_CHANNELS.officeCreateWorkstation, input)
  },
  agents: {
    list: () => invoke(IPC_CHANNELS.agentsList),
    get: (agentId) => invoke(IPC_CHANNELS.agentsGet, agentId),
    create: (input) => invoke(IPC_CHANNELS.agentsCreate, input),
    delete: (agentId) => invoke(IPC_CHANNELS.agentsDelete, agentId),
    updatePosition: (input) => invoke(IPC_CHANNELS.agentsUpdatePosition, input),
    assignSkill: (input) => invoke(IPC_CHANNELS.agentsAssignSkill, input),
    removeSkill: (input) => invoke(IPC_CHANNELS.agentsRemoveSkill, input)
  },
  profiles: {
    list: () => invoke(IPC_CHANNELS.profilesList),
    get: (profileId) => invoke(IPC_CHANNELS.profilesGet, profileId),
    create: (input) => invoke(IPC_CHANNELS.profilesCreate, input),
    update: (input) => invoke(IPC_CHANNELS.profilesUpdate, input),
    duplicate: (input) => invoke(IPC_CHANNELS.profilesDuplicate, input),
    delete: (profileId) => invoke(IPC_CHANNELS.profilesDelete, profileId),
    assignSkill: (input) => invoke(IPC_CHANNELS.profilesAssignSkill, input),
    removeSkill: (input) => invoke(IPC_CHANNELS.profilesRemoveSkill, input),
    listSkills: (profileId) => invoke(IPC_CHANNELS.profilesListSkills, profileId),
    generateSnapshot: (profileId) => invoke(IPC_CHANNELS.profilesGenerateSnapshot, profileId),
    capabilityMatrix: (profileId) => invoke(IPC_CHANNELS.profilesCapabilityMatrix, profileId),
    export: (profileId) => invoke(IPC_CHANNELS.profilesExport, profileId),
    importProfile: (input) => invoke(IPC_CHANNELS.profilesImport, input)
  },
  agentPacks: {
    inspect: (folderPath) => invoke(IPC_CHANNELS.agentPacksInspect, folderPath),
    install: (folderPath) => invoke(IPC_CHANNELS.agentPacksInstall, folderPath),
    uninstall: (packId) => invoke(IPC_CHANNELS.agentPacksUninstall, packId),
    listInstalled: () => invoke(IPC_CHANNELS.agentPacksListInstalled),
    validate: (folderPath) => invoke(IPC_CHANNELS.agentPacksValidate, folderPath)
  },
  sessions: {
    listByAgent: (agentId) => invoke(IPC_CHANNELS.sessionsListByAgent, agentId)
  },
  messages: {
    listBySession: (sessionId) => invoke(IPC_CHANNELS.messagesListBySession, sessionId),
    create: (input) => invoke(IPC_CHANNELS.messagesCreate, input)
  },
  skills: {
    scan: (input) => invoke(IPC_CHANNELS.skillsScan, input),
    list: () => invoke(IPC_CHANNELS.skillsList),
    get: (skillId) => invoke(IPC_CHANNELS.skillsGet, skillId),
    listForAgent: (agentId) => invoke(IPC_CHANNELS.skillsListForAgent, agentId)
  },
  tasks: {
    list: () => invoke(IPC_CHANNELS.tasksList),
    create: (input) => invoke(IPC_CHANNELS.tasksCreate, input),
    assign: (input) => invoke(IPC_CHANNELS.tasksAssign, input),
    updateStatus: (input) => invoke(IPC_CHANNELS.tasksUpdateStatus, input)
  },
  meetings: {
    list: () => invoke(IPC_CHANNELS.meetingsList),
    create: (input) => invoke(IPC_CHANNELS.meetingsCreate, input),
    listParticipants: (meetingId) => invoke(IPC_CHANNELS.meetingsListParticipants, meetingId),
    listMessages: (meetingId) => invoke(IPC_CHANNELS.meetingsListMessages, meetingId),
    sendMessage: (input) => invoke(IPC_CHANNELS.meetingsSendMessage, input),
    finish: (input) => invoke(IPC_CHANNELS.meetingsFinish, input)
  },
  events: {
    list: (filter) => invoke(IPC_CHANNELS.eventsList, filter),
    get: (eventId) => invoke(IPC_CHANNELS.eventsGet, eventId)
  },
  tokenUsage: {
    listByAgent: (agentId) => invoke(IPC_CHANNELS.tokenUsageListByAgent, agentId),
    summaryByAgent: (agentId) => invoke(IPC_CHANNELS.tokenUsageSummaryByAgent, agentId)
  },
  integrations: {
    status: () => invoke(IPC_CHANNELS.integrationsStatus)
  },
  workspaces: {
    list: () => invoke(IPC_CHANNELS.workspacesList),
    create: (input) => invoke(IPC_CHANNELS.workspacesCreate, input),
    select: (workspaceId) => invoke(IPC_CHANNELS.workspacesSelect, workspaceId),
    getActive: () => invoke(IPC_CHANNELS.workspacesGetActive)
  },
  conversations: {
    getThread: (agentId) => invoke(IPC_CHANNELS.conversationsGetThread, agentId),
    createThread: (agentId) => invoke(IPC_CHANNELS.conversationsCreateThread, agentId),
    switchThread: (input) => invoke(IPC_CHANNELS.conversationsSwitchThread, input),
    renameThread: (input) => invoke(IPC_CHANNELS.conversationsRenameThread, input),
    archiveThread: (input) => invoke(IPC_CHANNELS.conversationsArchiveThread, input),
    restoreThread: (input) => invoke(IPC_CHANNELS.conversationsRestoreThread, input),
    sendMessage: (input) => invoke(IPC_CHANNELS.conversationsSendMessage, input),
    saveComposer: (input) => invoke(IPC_CHANNELS.conversationsSaveComposer, input),
    saveDraft: (input) => invoke(IPC_CHANNELS.conversationsSaveDraft, input)
  },
  officeTheme: {
    get: () => invoke(IPC_CHANNELS.officeThemeGet),
    set: (theme) => invoke(IPC_CHANNELS.officeThemeSet, theme)
  },
  timeline: {
    replay: (input) => invoke(IPC_CHANNELS.timelineReplay, input)
  },
  settings: {
    get: () => invoke(IPC_CHANNELS.settingsGet),
    update: (patch) => invoke(IPC_CHANNELS.settingsUpdate, patch)
  },
  permissions: {
    getRequest: (requestId) => invoke(IPC_CHANNELS.permissionsGetRequest, requestId),
    getPendingForAgent: (agentId) => invoke(IPC_CHANNELS.permissionsGetPendingForAgent, agentId),
    decide: (input) => invoke(IPC_CHANNELS.permissionsDecide, input),
    listRules: (projectPath) => invoke(IPC_CHANNELS.permissionsListRules, projectPath),
    revokeRule: (ruleId) => invoke(IPC_CHANNELS.permissionsRevokeRule, ruleId)
  },
  runtime: {
    discoverAgents: () => invoke(IPC_CHANNELS.runtimeDiscoverAgents),
    spawnAgent: (input) => invoke(IPC_CHANNELS.runtimeSpawnAgent, input),
    sendMessage: (sessionId, message) => invoke(IPC_CHANNELS.runtimeSendMessage, sessionId, message),
    stopAgent: (sessionId) => invoke(IPC_CHANNELS.runtimeStopAgent, sessionId),
    onEvent: (callback) => {
      const listener = (_event: IpcRendererEvent, runtimeEvent: unknown): void => {
        callback(runtimeEvent as Parameters<typeof callback>[0]);
      };
      ipcRenderer.on(IPC_CHANNELS.runtimeEvent, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.runtimeEvent, listener);
      };
    }
  }
};

contextBridge.exposeInMainWorld("codexOffice", api);

export type { CodexOfficeApi };
