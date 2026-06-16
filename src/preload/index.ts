import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import { IPC_CHANNELS, type CodexOfficeApi } from "../shared/ipc";

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => ipcRenderer.invoke(channel, ...args) as Promise<T>;

const api: CodexOfficeApi = {
  app: {
    getInfo: () => invoke(IPC_CHANNELS.appInfo)
  },
  agents: {
    list: () => invoke(IPC_CHANNELS.agentsList),
    get: (agentId) => invoke(IPC_CHANNELS.agentsGet, agentId),
    create: (input) => invoke(IPC_CHANNELS.agentsCreate, input),
    updatePosition: (input) => invoke(IPC_CHANNELS.agentsUpdatePosition, input),
    assignSkill: (input) => invoke(IPC_CHANNELS.agentsAssignSkill, input)
  },
  sessions: {
    listByAgent: (agentId) => invoke(IPC_CHANNELS.sessionsListByAgent, agentId)
  },
  messages: {
    listBySession: (sessionId) => invoke(IPC_CHANNELS.messagesListBySession, sessionId),
    create: (input) => invoke(IPC_CHANNELS.messagesCreate, input)
  },
  skills: {
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
  settings: {
    get: () => invoke(IPC_CHANNELS.settingsGet),
    update: (patch) => invoke(IPC_CHANNELS.settingsUpdate, patch)
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
