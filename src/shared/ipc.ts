import type { AppInfo } from "./types/app";
import type { AgentRuntimeEvent } from "./types/agent";
import type {
  AgentRecord,
  AgentSkillRecord,
  EventRecord,
  JsonObject,
  MeetingMessageRecord,
  MeetingRecord,
  MessageRecord,
  SessionRecord,
  SkillRecord,
  TaskRecord,
  TokenUsageRecord
} from "./types/records";

export const IPC_CHANNELS = {
  appInfo: "app:info",
  agentsList: "agents:list",
  agentsGet: "agents:get",
  agentsCreate: "agents:create",
  agentsUpdatePosition: "agents:update-position",
  agentsAssignSkill: "agents:assign-skill",
  agentsRemoveSkill: "agents:remove-skill",
  sessionsListByAgent: "sessions:list-by-agent",
  messagesListBySession: "messages:list-by-session",
  messagesCreate: "messages:create",
  skillsList: "skills:list",
  skillsScan: "skills:scan",
  skillsGet: "skills:get",
  skillsListForAgent: "skills:list-for-agent",
  tasksList: "tasks:list",
  tasksCreate: "tasks:create",
  tasksAssign: "tasks:assign",
  tasksUpdateStatus: "tasks:update-status",
  meetingsList: "meetings:list",
  meetingsCreate: "meetings:create",
  meetingsListMessages: "meetings:list-messages",
  meetingsSendMessage: "meetings:send-message",
  meetingsFinish: "meetings:finish",
  eventsList: "events:list",
  eventsGet: "events:get",
  tokenUsageListByAgent: "token-usage:list-by-agent",
  tokenUsageSummaryByAgent: "token-usage:summary-by-agent",
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  runtimeDiscoverAgents: "runtime:discover-agents",
  runtimeSpawnAgent: "runtime:spawn-agent",
  runtimeSendMessage: "runtime:send-message",
  runtimeStopAgent: "runtime:stop-agent",
  runtimeEvent: "runtime:event"
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export type CreateAgentRequest = {
  id: string;
  name: string;
  role: string;
  workingDirectory: string;
  runtimeKind: string;
  permissionMode: string;
  autoRunMode: string;
  profileId?: string | null;
  profileSnapshot?: JsonObject;
  currentTask?: string | null;
  metadata?: JsonObject;
};

export type UpdateAgentPositionRequest = {
  agentId: string;
  x: number;
  y: number;
};

export type AssignSkillRequest = {
  agentId: string;
  skillId: string;
  assignedBy: string;
};

export type CreateMessageRequest = {
  id: string;
  role: string;
  content: string;
  sessionId?: string | null;
  agentId?: string | null;
  meetingId?: string | null;
  streamState?: string;
  parentMessageId?: string | null;
  metadata?: JsonObject;
};

export type CreateTaskRequest = {
  id: string;
  title: string;
  description?: string | null;
  assignedAgentId?: string | null;
  requiredSkills?: string[];
  linkedFiles?: string[];
  createdFrom?: string | null;
};

export type AssignTaskRequest = {
  taskId: string;
  agentId: string;
};

export type UpdateTaskStatusRequest = {
  taskId: string;
  status: string;
  resultSummary?: string | null;
};

export type CreateMeetingRequest = {
  id: string;
  title: string;
  goal: string;
  moderatorAgentId?: string | null;
  outputFormat?: string | null;
};

export type SendMeetingMessageRequest = {
  id: string;
  meetingId: string;
  role: string;
  content: string;
  agentId?: string | null;
  metadata?: JsonObject;
};

export type FinishMeetingRequest = {
  meetingId: string;
  summary: string;
};

export type EventFilterRequest = {
  agentId?: string;
  taskId?: string;
  meetingId?: string;
  type?: string;
};

export type ScanSkillsRequest = {
  roots?: string[];
  projectRoot?: string;
};

export type SettingsMap = Record<string, unknown>;

export type TokenUsageSummary = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
};

export type CodexOfficeApi = {
  app: {
    getInfo(): Promise<AppInfo>;
  };
  agents: {
    list(): Promise<AgentRecord[]>;
    get(agentId: string): Promise<AgentRecord | null>;
    create(input: CreateAgentRequest): Promise<AgentRecord>;
    updatePosition(input: UpdateAgentPositionRequest): Promise<AgentRecord>;
    assignSkill(input: AssignSkillRequest): Promise<AgentSkillRecord>;
    removeSkill(input: Omit<AssignSkillRequest, "assignedBy">): Promise<AgentSkillRecord | null>;
  };
  sessions: {
    listByAgent(agentId: string): Promise<SessionRecord[]>;
  };
  messages: {
    listBySession(sessionId: string): Promise<MessageRecord[]>;
    create(input: CreateMessageRequest): Promise<MessageRecord>;
  };
  skills: {
    scan(input?: ScanSkillsRequest): Promise<SkillRecord[]>;
    list(): Promise<SkillRecord[]>;
    get(skillId: string): Promise<SkillRecord | null>;
    listForAgent(agentId: string): Promise<AgentSkillRecord[]>;
  };
  tasks: {
    list(): Promise<TaskRecord[]>;
    create(input: CreateTaskRequest): Promise<TaskRecord>;
    assign(input: AssignTaskRequest): Promise<TaskRecord>;
    updateStatus(input: UpdateTaskStatusRequest): Promise<TaskRecord>;
  };
  meetings: {
    list(): Promise<MeetingRecord[]>;
    create(input: CreateMeetingRequest): Promise<MeetingRecord>;
    listMessages(meetingId: string): Promise<MeetingMessageRecord[]>;
    sendMessage(input: SendMeetingMessageRequest): Promise<MeetingMessageRecord>;
    finish(input: FinishMeetingRequest): Promise<MeetingRecord>;
  };
  events: {
    list(filter?: EventFilterRequest): Promise<EventRecord[]>;
    get(eventId: string): Promise<EventRecord | null>;
  };
  tokenUsage: {
    listByAgent(agentId: string): Promise<TokenUsageRecord[]>;
    summaryByAgent(agentId: string): Promise<TokenUsageSummary>;
  };
  settings: {
    get(): Promise<SettingsMap>;
    update(patch: SettingsMap): Promise<SettingsMap>;
  };
  runtime: {
    discoverAgents(): Promise<AgentRecord[]>;
    spawnAgent(input: CreateAgentRequest): Promise<SessionRecord>;
    sendMessage(sessionId: string, message: string): Promise<MessageRecord>;
    stopAgent(sessionId: string): Promise<SessionRecord>;
    onEvent(callback: (event: AgentRuntimeEvent) => void): () => void;
  };
};
