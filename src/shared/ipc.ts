import type { AppInfo } from "./types/app";
import type { AgentRuntimeEvent } from "./types/agent";
import type { ConversationFlowRule } from "./types/conversation";
import type {
  AgentRecord,
  AgentProfileRecord,
  AgentProfileSkillRecord,
  AgentPackRecord,
  AgentSkillRecord,
  EventRecord,
  JsonObject,
  MeetingMessageRecord,
  MeetingParticipantRecord,
  MeetingRecord,
  MessageRecord,
  PermissionRuleRecord,
  SessionRecord,
  SkillRecord,
  TaskRecord,
  TokenUsageRecord
} from "./types/records";

export const IPC_CHANNELS = {
  appInfo: "app:info",
  appPickWorkingDirectory: "app:pick-working-directory",
  agentsList: "agents:list",
  agentsGet: "agents:get",
  agentsCreate: "agents:create",
  agentsUpdatePosition: "agents:update-position",
  agentsAssignSkill: "agents:assign-skill",
  agentsRemoveSkill: "agents:remove-skill",
  profilesList: "profiles:list",
  profilesGet: "profiles:get",
  profilesCreate: "profiles:create",
  profilesUpdate: "profiles:update",
  profilesDuplicate: "profiles:duplicate",
  profilesDelete: "profiles:delete",
  profilesAssignSkill: "profiles:assign-skill",
  profilesRemoveSkill: "profiles:remove-skill",
  profilesListSkills: "profiles:list-skills",
  profilesGenerateSnapshot: "profiles:generate-snapshot",
  profilesCapabilityMatrix: "profiles:capability-matrix",
  profilesExport: "profiles:export",
  profilesImport: "profiles:import",
  agentPacksInspect: "agent-packs:inspect",
  agentPacksInstall: "agent-packs:install",
  agentPacksUninstall: "agent-packs:uninstall",
  agentPacksListInstalled: "agent-packs:list-installed",
  agentPacksValidate: "agent-packs:validate",
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
  meetingsListParticipants: "meetings:list-participants",
  meetingsListMessages: "meetings:list-messages",
  meetingsSendMessage: "meetings:send-message",
  meetingsFinish: "meetings:finish",
  eventsList: "events:list",
  eventsGet: "events:get",
  tokenUsageListByAgent: "token-usage:list-by-agent",
  tokenUsageSummaryByAgent: "token-usage:summary-by-agent",
  integrationsStatus: "integrations:status",
  workspacesList: "workspaces:list",
  workspacesCreate: "workspaces:create",
  workspacesSelect: "workspaces:select",
  workspacesGetActive: "workspaces:get-active",
  officeThemeGet: "office-theme:get",
  officeThemeSet: "office-theme:set",
  timelineReplay: "timeline:replay",
  settingsGet: "settings:get",
  settingsUpdate: "settings:update",
  permissionsGetRequest: "permissions:get-request",
  permissionsDecide: "permissions:decide",
  permissionsListRules: "permissions:list-rules",
  permissionsRevokeRule: "permissions:revoke-rule",
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
  modelProfile?: string | null;
  profileId?: string | null;
  profileSnapshot?: JsonObject;
  skillIds?: string[];
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

export type CreateAgentProfileRequest = {
  id: string;
  name: string;
  role: string;
  description?: string | null;
  persona?: string | null;
  instructions?: string | null;
  defaultModelProfile?: string | null;
  defaultPermissionMode?: string | null;
  defaultAutoRunMode?: string | null;
  workspaceScope?: JsonObject;
  toolAccess?: JsonObject;
  memoryPreferences?: JsonObject;
  startupWorkflow?: unknown[];
  validationPolicy?: JsonObject;
  collaborationBehavior?: JsonObject;
  communicationStyle?: string | null;
  riskTolerance?: string | null;
  outputPreferences?: JsonObject;
  visualIdentity?: JsonObject;
  sourcePackId?: string | null;
};

export type UpdateAgentProfileRequest = {
  profileId: string;
  patch: Partial<Omit<CreateAgentProfileRequest, "id">>;
};

export type DuplicateAgentProfileRequest = {
  profileId: string;
  newProfileId: string;
};

export type AssignProfileSkillRequest = {
  profileId: string;
  skillId: string;
  required: boolean;
};

export type AgentProfileSnapshot = JsonObject & {
  profileId: string;
  name: string;
  role: string;
};

export type AgentCapabilityMatrix = {
  profileId: string;
  profileName: string;
  role: string;
  skills: Array<{ id: string; name: string; required: boolean; category: string | null }>;
  permissionPreset: string | null;
  workspaceScope: JsonObject;
  toolAccess: JsonObject;
  validationPolicy: JsonObject;
  collaborationBehavior: JsonObject;
};

export type AgentProfileExport = {
  format: "local-codex-office.agent-profile";
  version: 1;
  exportedAt: string;
  profile: AgentProfileSnapshot;
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
  participantAgentIds?: string[];
  conversationMode?: string | null;
  flowRules?: ConversationFlowRule[];
};

export type AgentPackInspection = {
  path: string;
  manifestPath: string;
  manifest: JsonObject | null;
  validationStatus: "valid" | "invalid" | "warning";
  validationErrors: string[];
  validationWarnings: string[];
  checksum: string | null;
  signatureStatus: "not_provided" | "present_unverified";
  scriptExecution: "not_executed";
  permissionReview: {
    status: "none" | "review_required";
    manifest: JsonObject;
  };
  summary: {
    id: string | null;
    name: string | null;
    author: string | null;
    version: string | null;
    profiles: number;
    skillDependencies: number;
    bundledSkills: number;
    scripts: number;
    assets: number;
    workflowTemplates: number;
    validationTests: number;
  };
};

export type AgentPackInstallResult = {
  pack: AgentPackRecord;
  installedProfileIds: string[];
  installedSkillIds: string[];
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

export type ProjectWorkspace = {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
};

export type CreateProjectWorkspaceRequest = {
  id: string;
  name: string;
  rootPath: string;
};

export type OfficeTheme = "default" | "forest" | "focus";

export type V2IntegrationStatus = {
  attach: {
    runtimeKind: "codex_cli_attached";
    status: "read_only" | "disabled";
    reason: string;
    controllable: boolean;
    detectedSessions: number;
  };
  mcp: {
    runtimeKind: "mcp";
    configured: boolean;
    status: "not_configured" | "ready" | "error";
    reason: string;
  };
  github: { configured: false; status: "not_configured"; reason: string };
  plugins: { configured: false; status: "not_configured"; reason: string };
};

export type TimelineReplayRequest = {
  limit?: number;
  type?: string;
  after?: string;
};

export type PermissionRiskKind = "delete" | "install" | "network" | "credential" | "system";

export type PermissionRequestRecord = {
  id: string;
  agentId: string;
  sessionId: string;
  projectPath: string;
  command: string;
  redactedCommand: string;
  riskKinds: PermissionRiskKind[];
  reasons: string[];
  riskLevel: "safe" | "review";
  createdAt: string;
};

export type PermissionDecisionInput = {
  requestId: string;
  decision: "allow_once" | "allow_project" | "deny";
};

export type PermissionDecisionResult = {
  requestId: string;
  status: "approved" | "denied";
  storedRuleId?: string | null;
};

export type RuntimeSendMessageResult =
  | { status: "sent"; message: MessageRecord }
  | { status: "permission_required"; requestId: string };

export type CodexOfficeApi = {
  app: {
    getInfo(): Promise<AppInfo>;
    pickWorkingDirectory(): Promise<string | null>;
  };
  agents: {
    list(): Promise<AgentRecord[]>;
    get(agentId: string): Promise<AgentRecord | null>;
    create(input: CreateAgentRequest): Promise<AgentRecord>;
    updatePosition(input: UpdateAgentPositionRequest): Promise<AgentRecord>;
    assignSkill(input: AssignSkillRequest): Promise<AgentSkillRecord>;
    removeSkill(input: Omit<AssignSkillRequest, "assignedBy">): Promise<AgentSkillRecord | null>;
  };
  profiles: {
    list(): Promise<AgentProfileRecord[]>;
    get(profileId: string): Promise<AgentProfileRecord | null>;
    create(input: CreateAgentProfileRequest): Promise<AgentProfileRecord>;
    update(input: UpdateAgentProfileRequest): Promise<AgentProfileRecord>;
    duplicate(input: DuplicateAgentProfileRequest): Promise<AgentProfileRecord>;
    delete(profileId: string): Promise<AgentProfileRecord | null>;
    assignSkill(input: AssignProfileSkillRequest): Promise<AgentProfileSkillRecord>;
    removeSkill(input: Omit<AssignProfileSkillRequest, "required">): Promise<AgentProfileSkillRecord | null>;
    listSkills(profileId: string): Promise<AgentProfileSkillRecord[]>;
    generateSnapshot(profileId: string): Promise<AgentProfileSnapshot>;
    capabilityMatrix(profileId: string): Promise<AgentCapabilityMatrix>;
    export(profileId: string): Promise<AgentProfileExport>;
    importProfile(input: CreateAgentProfileRequest): Promise<AgentProfileRecord>;
  };
  agentPacks: {
    inspect(folderPath: string): Promise<AgentPackInspection>;
    install(folderPath: string): Promise<AgentPackInstallResult>;
    uninstall(packId: string): Promise<AgentPackRecord | null>;
    listInstalled(): Promise<AgentPackRecord[]>;
    validate(folderPath: string): Promise<AgentPackInspection>;
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
    listParticipants(meetingId: string): Promise<MeetingParticipantRecord[]>;
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
  integrations: {
    status(): Promise<V2IntegrationStatus>;
  };
  workspaces: {
    list(): Promise<ProjectWorkspace[]>;
    create(input: CreateProjectWorkspaceRequest): Promise<ProjectWorkspace>;
    select(workspaceId: string): Promise<ProjectWorkspace>;
    getActive(): Promise<string>;
  };
  officeTheme: {
    get(): Promise<OfficeTheme>;
    set(theme: OfficeTheme): Promise<OfficeTheme>;
  };
  timeline: {
    replay(input?: TimelineReplayRequest): Promise<EventRecord[]>;
  };
  settings: {
    get(): Promise<SettingsMap>;
    update(patch: SettingsMap): Promise<SettingsMap>;
  };
  permissions: {
    getRequest(requestId: string): Promise<PermissionRequestRecord | null>;
    decide(input: PermissionDecisionInput): Promise<PermissionDecisionResult>;
    listRules(projectPath?: string): Promise<PermissionRuleRecord[]>;
    revokeRule(ruleId: string): Promise<PermissionRuleRecord | null>;
  };
  runtime: {
    discoverAgents(): Promise<AgentRecord[]>;
    spawnAgent(input: CreateAgentRequest): Promise<SessionRecord>;
    sendMessage(sessionId: string, message: string): Promise<RuntimeSendMessageResult>;
    stopAgent(sessionId: string): Promise<SessionRecord>;
    onEvent(callback: (event: AgentRuntimeEvent) => void): () => void;
  };
};
