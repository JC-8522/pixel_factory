import type {
  AssignSkillRequest,
  AssignTaskRequest,
  CreateAgentRequest,
  CreateMeetingRequest,
  CreateMessageRequest,
  CreateTaskRequest,
  EventFilterRequest,
  FinishMeetingRequest,
  SendMeetingMessageRequest,
  ScanSkillsRequest,
  SettingsMap,
  UpdateAgentPositionRequest,
  UpdateTaskStatusRequest
} from "../../shared/ipc";
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
    profileId: optionalString(input.profileId, "profile id"),
    profileSnapshot: optionalJsonObject(input.profileSnapshot, "profile snapshot"),
    currentTask: optionalString(input.currentTask, "current task"),
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
  return {
    id: assertNonEmptyString(input.id, "meeting id"),
    title: assertNonEmptyString(input.title, "meeting title"),
    goal: assertNonEmptyString(input.goal, "meeting goal"),
    moderatorAgentId: optionalString(input.moderatorAgentId, "moderator agent id"),
    outputFormat: optionalString(input.outputFormat, "output format")
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

export const validateSettingsPatch = (value: unknown): SettingsMap => {
  const input = assertRecord(value, "settings patch");
  optionalJsonValue(input);
  return input;
};

export const validateAgentStatus = (value: unknown): string => assertStringEnum(value, "agent status", agentStatuses);
