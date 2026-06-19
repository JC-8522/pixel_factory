import type {
  AssignSkillRequest,
  AssignTaskRequest,
  AssignProfileSkillRequest,
  CreateAgentRequest,
  CreateAgentProfileRequest,
  CreateMeetingRequest,
  CreateMessageRequest,
  CreateWorkstationRequest,
  CreateTaskRequest,
  DuplicateAgentProfileRequest,
  EventFilterRequest,
  FinishMeetingRequest,
  SendMeetingMessageRequest,
  ScanSkillsRequest,
  SettingsMap,
  CreateProjectWorkspaceRequest,
  OfficeTheme,
  PermissionDecisionInput,
  TimelineReplayRequest,
  UpdateAgentProfileRequest,
  UpdateAgentPositionRequest,
  UpdateTaskStatusRequest
} from "../../shared/ipc";
import type { ConversationFlowRule } from "../../shared/types/conversation";
import {
  assertNonEmptyString,
  assertRecord,
  assertStringEnum,
  optionalJsonValue,
  optionalNumber,
  optionalString
} from "../../shared/validation/ipc";

const agentStatuses = [
  "idle",
  "thinking",
  "running_command",
  "reading_files",
  "editing_files",
  "waiting_user_input",
  "error",
  "completed",
  "stopped"
] as const;

const taskStatuses = ["backlog", "assigned", "in_progress", "waiting_review", "done", "failed"] as const;
const messageRoles = ["user", "agent", "system", "tool", "moderator"] as const;

const optionalJsonObject = (value: unknown, label: string): Record<string, unknown> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const json = optionalJsonValue(value);
  return assertRecord(json, label);
};

const optionalStringArray = (value: unknown, label: string): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of strings`);
  }

  return value;
};

export const validateId = (value: unknown, label = "id"): string => assertNonEmptyString(value, label);

export const validateCreateAgent = (value: unknown): CreateAgentRequest => {
  const input = assertRecord(value, "create agent input");
  return {
    id: assertNonEmptyString(input.id, "agent id"),
    name: assertNonEmptyString(input.name, "agent name"),
    role: assertNonEmptyString(input.role, "agent role"),
    workingDirectory: assertNonEmptyString(input.workingDirectory, "working directory"),
    runtimeKind: assertNonEmptyString(input.runtimeKind, "runtime kind"),
    permissionMode: assertNonEmptyString(input.permissionMode, "permission mode"),
    autoRunMode: assertNonEmptyString(input.autoRunMode, "auto-run mode"),
    modelProfile: optionalString(input.modelProfile, "model profile"),
    profileId: optionalString(input.profileId, "profile id"),
    profileSnapshot: optionalJsonObject(input.profileSnapshot, "profile snapshot"),
    skillIds: optionalStringArray(input.skillIds, "selected skills"),
    currentTask: optionalString(input.currentTask, "current task"),
    workstationId: optionalString(input.workstationId, "workstation id"),
    metadata: optionalJsonObject(input.metadata, "metadata")
  };
};

export const validateCreateWorkstation = (value: unknown): CreateWorkstationRequest => {
  const input = assertRecord(value, "create workstation input");
  return {
    id: assertNonEmptyString(input.id, "workstation id"),
    floorId: assertNonEmptyString(input.floorId, "floor id"),
    slotKey: assertNonEmptyString(input.slotKey, "slot key"),
    name: optionalString(input.name, "workstation name"),
    metadata: optionalJsonObject(input.metadata, "metadata")
  };
};

export const validateUpdateAgentPosition = (value: unknown): UpdateAgentPositionRequest => {
  const input = assertRecord(value, "update position input");
  return {
    agentId: assertNonEmptyString(input.agentId, "agent id"),
    x: optionalNumber(input.x, "position x") ?? 0,
    y: optionalNumber(input.y, "position y") ?? 0
  };
};

export const validateAssignSkill = (value: unknown): AssignSkillRequest => {
  const input = assertRecord(value, "assign skill input");
  return {
    agentId: assertNonEmptyString(input.agentId, "agent id"),
    skillId: assertNonEmptyString(input.skillId, "skill id"),
    assignedBy: assertNonEmptyString(input.assignedBy, "assigned by")
  };
};

const optionalJsonArray = (value: unknown, label: string): unknown[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
};

export const validateCreateAgentProfile = (value: unknown): CreateAgentProfileRequest => {
  const input = assertRecord(value, "create profile input");
  return {
    id: assertNonEmptyString(input.id, "profile id"),
    name: assertNonEmptyString(input.name, "profile name"),
    role: assertNonEmptyString(input.role, "profile role"),
    description: optionalString(input.description, "profile description"),
    persona: optionalString(input.persona, "profile persona"),
    instructions: optionalString(input.instructions, "profile instructions"),
    defaultModelProfile: optionalString(input.defaultModelProfile, "default model profile"),
    defaultPermissionMode: optionalString(input.defaultPermissionMode, "default permission mode"),
    defaultAutoRunMode: optionalString(input.defaultAutoRunMode, "default auto-run mode"),
    workspaceScope: optionalJsonObject(input.workspaceScope, "workspace scope"),
    toolAccess: optionalJsonObject(input.toolAccess, "tool access"),
    memoryPreferences: optionalJsonObject(input.memoryPreferences, "memory preferences"),
    startupWorkflow: optionalJsonArray(input.startupWorkflow, "startup workflow"),
    validationPolicy: optionalJsonObject(input.validationPolicy, "validation policy"),
    collaborationBehavior: optionalJsonObject(input.collaborationBehavior, "collaboration behavior"),
    communicationStyle: optionalString(input.communicationStyle, "communication style"),
    riskTolerance: optionalString(input.riskTolerance, "risk tolerance"),
    outputPreferences: optionalJsonObject(input.outputPreferences, "output preferences"),
    visualIdentity: optionalJsonObject(input.visualIdentity, "visual identity"),
    sourcePackId: optionalString(input.sourcePackId, "source pack id")
  };
};

export const validateUpdateAgentProfile = (value: unknown): UpdateAgentProfileRequest => {
  const input = assertRecord(value, "update profile input");
  const patchInput = assertRecord(input.patch, "profile patch");
  const patch: UpdateAgentProfileRequest["patch"] = {};

  if ("name" in patchInput) patch.name = assertNonEmptyString(patchInput.name, "profile name");
  if ("role" in patchInput) patch.role = assertNonEmptyString(patchInput.role, "profile role");
  if ("description" in patchInput) patch.description = optionalString(patchInput.description, "profile description");
  if ("persona" in patchInput) patch.persona = optionalString(patchInput.persona, "profile persona");
  if ("instructions" in patchInput) patch.instructions = optionalString(patchInput.instructions, "profile instructions");
  if ("defaultModelProfile" in patchInput) patch.defaultModelProfile = optionalString(patchInput.defaultModelProfile, "default model profile");
  if ("defaultPermissionMode" in patchInput) patch.defaultPermissionMode = optionalString(patchInput.defaultPermissionMode, "default permission mode");
  if ("defaultAutoRunMode" in patchInput) patch.defaultAutoRunMode = optionalString(patchInput.defaultAutoRunMode, "default auto-run mode");
  if ("workspaceScope" in patchInput) patch.workspaceScope = optionalJsonObject(patchInput.workspaceScope, "workspace scope");
  if ("toolAccess" in patchInput) patch.toolAccess = optionalJsonObject(patchInput.toolAccess, "tool access");
  if ("memoryPreferences" in patchInput) patch.memoryPreferences = optionalJsonObject(patchInput.memoryPreferences, "memory preferences");
  if ("startupWorkflow" in patchInput) patch.startupWorkflow = optionalJsonArray(patchInput.startupWorkflow, "startup workflow");
  if ("validationPolicy" in patchInput) patch.validationPolicy = optionalJsonObject(patchInput.validationPolicy, "validation policy");
  if ("collaborationBehavior" in patchInput) patch.collaborationBehavior = optionalJsonObject(patchInput.collaborationBehavior, "collaboration behavior");
  if ("communicationStyle" in patchInput) patch.communicationStyle = optionalString(patchInput.communicationStyle, "communication style");
  if ("riskTolerance" in patchInput) patch.riskTolerance = optionalString(patchInput.riskTolerance, "risk tolerance");
  if ("outputPreferences" in patchInput) patch.outputPreferences = optionalJsonObject(patchInput.outputPreferences, "output preferences");
  if ("visualIdentity" in patchInput) patch.visualIdentity = optionalJsonObject(patchInput.visualIdentity, "visual identity");
  if ("sourcePackId" in patchInput) patch.sourcePackId = optionalString(patchInput.sourcePackId, "source pack id");

  return {
    profileId: assertNonEmptyString(input.profileId, "profile id"),
    patch
  };
};

export const validateDuplicateAgentProfile = (value: unknown): DuplicateAgentProfileRequest => {
  const input = assertRecord(value, "duplicate profile input");
  return {
    profileId: assertNonEmptyString(input.profileId, "profile id"),
    newProfileId: assertNonEmptyString(input.newProfileId, "new profile id")
  };
};

export const validateAssignProfileSkill = (value: unknown): AssignProfileSkillRequest => {
  const input = assertRecord(value, "assign profile skill input");
  return {
    profileId: assertNonEmptyString(input.profileId, "profile id"),
    skillId: assertNonEmptyString(input.skillId, "skill id"),
    required: Boolean(input.required)
  };
};

export const validateRemoveProfileSkill = (value: unknown): Omit<AssignProfileSkillRequest, "required"> => {
  const input = assertRecord(value, "remove profile skill input");
  return {
    profileId: assertNonEmptyString(input.profileId, "profile id"),
    skillId: assertNonEmptyString(input.skillId, "skill id")
  };
};

export const validateRemoveSkill = (value: unknown): Omit<AssignSkillRequest, "assignedBy"> => {
  const input = assertRecord(value, "remove skill input");
  return {
    agentId: assertNonEmptyString(input.agentId, "agent id"),
    skillId: assertNonEmptyString(input.skillId, "skill id")
  };
};

export const validateCreateMessage = (value: unknown): CreateMessageRequest => {
  const input = assertRecord(value, "create message input");
  return {
    id: assertNonEmptyString(input.id, "message id"),
    role: assertStringEnum(input.role, "message role", messageRoles),
    content: assertNonEmptyString(input.content, "message content"),
    sessionId: optionalString(input.sessionId, "session id"),
    agentId: optionalString(input.agentId, "agent id"),
    meetingId: optionalString(input.meetingId, "meeting id"),
    streamState: optionalString(input.streamState, "stream state") ?? "complete",
    parentMessageId: optionalString(input.parentMessageId, "parent message id"),
    metadata: optionalJsonObject(input.metadata, "metadata")
  };
};

export const validateCreateTask = (value: unknown): CreateTaskRequest => {
  const input = assertRecord(value, "create task input");
  return {
    id: assertNonEmptyString(input.id, "task id"),
    title: assertNonEmptyString(input.title, "task title"),
    description: optionalString(input.description, "task description"),
    assignedAgentId: optionalString(input.assignedAgentId, "assigned agent id"),
    requiredSkills: optionalStringArray(input.requiredSkills, "required skills"),
    linkedFiles: optionalStringArray(input.linkedFiles, "linked files"),
    createdFrom: optionalString(input.createdFrom, "created from")
  };
};

export const validateAssignTask = (value: unknown): AssignTaskRequest => {
  const input = assertRecord(value, "assign task input");
  return {
    taskId: assertNonEmptyString(input.taskId, "task id"),
    agentId: assertNonEmptyString(input.agentId, "agent id")
  };
};

export const validateUpdateTaskStatus = (value: unknown): UpdateTaskStatusRequest => {
  const input = assertRecord(value, "update task input");
  return {
    taskId: assertNonEmptyString(input.taskId, "task id"),
    status: assertStringEnum(input.status, "task status", taskStatuses),
    resultSummary: optionalString(input.resultSummary, "result summary")
  };
};

export const validateCreateMeeting = (value: unknown): CreateMeetingRequest => {
  const input = assertRecord(value, "create meeting input");
  const flowRules = optionalJsonArray(input.flowRules, "flow rules") as ConversationFlowRule[] | undefined;
  return {
    id: assertNonEmptyString(input.id, "meeting id"),
    title: assertNonEmptyString(input.title, "meeting title"),
    goal: assertNonEmptyString(input.goal, "meeting goal"),
    moderatorAgentId: optionalString(input.moderatorAgentId, "moderator agent id"),
    outputFormat: optionalString(input.outputFormat, "output format"),
    participantAgentIds: optionalStringArray(input.participantAgentIds, "participant agent ids"),
    conversationMode: optionalString(input.conversationMode, "conversation mode"),
    flowRules
  };
};

export const validateSendMeetingMessage = (value: unknown): SendMeetingMessageRequest => {
  const input = assertRecord(value, "meeting message input");
  return {
    id: assertNonEmptyString(input.id, "meeting message id"),
    meetingId: assertNonEmptyString(input.meetingId, "meeting id"),
    role: assertStringEnum(input.role, "meeting message role", messageRoles),
    content: assertNonEmptyString(input.content, "meeting message content"),
    agentId: optionalString(input.agentId, "agent id"),
    metadata: optionalJsonObject(input.metadata, "metadata")
  };
};

export const validateFinishMeeting = (value: unknown): FinishMeetingRequest => {
  const input = assertRecord(value, "finish meeting input");
  return {
    meetingId: assertNonEmptyString(input.meetingId, "meeting id"),
    summary: assertNonEmptyString(input.summary, "meeting summary")
  };
};

export const validateEventFilter = (value: unknown): EventFilterRequest => {
  if (value === undefined) {
    return {};
  }

  const input = assertRecord(value, "event filter");
  return {
    agentId: optionalString(input.agentId, "agent id") ?? undefined,
    taskId: optionalString(input.taskId, "task id") ?? undefined,
    meetingId: optionalString(input.meetingId, "meeting id") ?? undefined,
    type: optionalString(input.type, "event type") ?? undefined
  };
};

export const validateScanSkills = (value: unknown): ScanSkillsRequest => {
  if (value === undefined) {
    return {};
  }

  const input = assertRecord(value, "scan skills input");
  return {
    roots: optionalStringArray(input.roots, "skill roots"),
    projectRoot: optionalString(input.projectRoot, "project root") ?? undefined
  };
};

export const validateAgentPackPath = (value: unknown): string => assertNonEmptyString(value, "agent pack path");

export const validateCreateProjectWorkspace = (value: unknown): CreateProjectWorkspaceRequest => {
  const input = assertRecord(value, "create project workspace input");
  return {
    id: assertNonEmptyString(input.id, "workspace id"),
    name: assertNonEmptyString(input.name, "workspace name"),
    rootPath: assertNonEmptyString(input.rootPath, "workspace root path")
  };
};

const officeThemes = ["default", "forest", "focus"] as const;

export const validateOfficeTheme = (value: unknown): OfficeTheme =>
  assertStringEnum(value, "office theme", officeThemes);

export const validateTimelineReplay = (value: unknown): TimelineReplayRequest => {
  if (value === undefined) return {};
  const input = assertRecord(value, "timeline replay input");
  return {
    limit: optionalNumber(input.limit, "timeline replay limit"),
    type: optionalString(input.type, "timeline replay type") ?? undefined,
    after: optionalString(input.after, "timeline replay after") ?? undefined
  };
};

export const validateSettingsPatch = (value: unknown): SettingsMap => {
  const input = assertRecord(value, "settings patch");
  optionalJsonValue(input);
  return input;
};

export const validateAgentStatus = (value: unknown): string => assertStringEnum(value, "agent status", agentStatuses);

export const validatePermissionDecision = (value: unknown): PermissionDecisionInput => {
  const input = assertRecord(value, "permission decision input");
  return {
    requestId: assertNonEmptyString(input.requestId, "permission request id"),
    decision: assertStringEnum(input.decision, "permission decision", ["allow_once", "allow_project", "deny"] as const)
  };
};

export const validateOptionalProjectPath = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return assertNonEmptyString(value, "project path");
};
