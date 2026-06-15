import type { AppInfo } from "../../shared/types/app";
import type { DatabaseClient } from "../db/client";
import {
  assignSkillToAgent,
  assignTask,
  completeMeeting,
  createAgent,
  createEvent,
  createMeeting,
  createMessage,
  createTask,
  getAgent,
  getEvent,
  getSetting,
  getSkill,
  listAgentSkills,
  listAgents,
  listEvents,
  listMeetings,
  listMeetingMessages,
  listMessagesBySession,
  listSessionsForAgent,
  listSettings,
  listSkills,
  listTasks,
  listTokenUsageByAgent,
  setSetting,
  summarizeTokenUsageByAgent,
  updateAgentPosition,
  updateTaskStatus,
  addMeetingMessage
} from "../db/repositories";
import {
  validateAssignSkill,
  validateAssignTask,
  validateCreateAgent,
  validateCreateMeeting,
  validateCreateMessage,
  validateCreateTask,
  validateEventFilter,
  validateFinishMeeting,
  validateId,
  validateSendMeetingMessage,
  validateSettingsPatch,
  validateUpdateAgentPosition,
  validateUpdateTaskStatus
} from "./validators";

export type IpcHandlerContext = {
  client: DatabaseClient;
  getAppInfo: () => AppInfo;
};

const saveAfter = <T>(client: DatabaseClient, operation: () => T): T => {
  const result = operation();
  client.save();
  return result;
};

export const settingsRowsToMap = (rows: ReturnType<typeof listSettings>): Record<string, unknown> =>
  Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value_json) as unknown]));

export const createIpcHandlers = ({ client, getAppInfo }: IpcHandlerContext) => ({
  appInfo: (): AppInfo => getAppInfo(),

  agentsList: () => listAgents(client),
  agentsGet: (agentId: unknown) => getAgent(client, validateId(agentId, "agent id")),
  agentsCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateAgent(input);
      const agent = createAgent(client, {
        id: payload.id,
        name: payload.name,
        role: payload.role,
        workingDirectory: payload.workingDirectory,
        runtimeKind: payload.runtimeKind,
        permissionMode: payload.permissionMode,
        autoRunMode: payload.autoRunMode,
        profileId: payload.profileId,
        profileSnapshot: payload.profileSnapshot,
        currentTask: payload.currentTask,
        metadata: payload.metadata
      });
      createEvent(client, {
        id: `event-agent-created-${payload.id}`,
        type: "agent_created",
        actorType: "user",
        actorId: "local-user",
        agentId: payload.id,
        payload: { name: payload.name, role: payload.role }
      });
      return agent;
    }),
  agentsUpdatePosition: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateUpdateAgentPosition(input);
      return updateAgentPosition(client, payload.agentId, { x: payload.x, y: payload.y });
    }),
  agentsAssignSkill: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateAssignSkill(input);
      const assignment = assignSkillToAgent(client, payload);
      createEvent(client, {
        id: `event-skill-${payload.agentId}-${payload.skillId}`,
        type: "skill_attached",
        actorType: "user",
        actorId: payload.assignedBy,
        agentId: payload.agentId,
        payload: { skillId: payload.skillId }
      });
      return assignment;
    }),

  sessionsListByAgent: (agentId: unknown) => listSessionsForAgent(client, validateId(agentId, "agent id")),

  messagesListBySession: (sessionId: unknown) => listMessagesBySession(client, validateId(sessionId, "session id")),
  messagesCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateMessage(input);
      const message = createMessage(client, payload);
      createEvent(client, {
        id: `event-message-${payload.id}`,
        type: "message_sent",
        actorType: payload.role === "user" ? "user" : payload.role === "system" ? "system" : "agent",
        actorId: payload.agentId ?? "local-user",
        agentId: payload.agentId,
        sessionId: payload.sessionId,
        meetingId: payload.meetingId,
        payload: { messageId: payload.id, role: payload.role }
      });
      return message;
    }),

  skillsList: () => listSkills(client),
  skillsGet: (skillId: unknown) => getSkill(client, validateId(skillId, "skill id")),
  skillsListForAgent: (agentId: unknown) => listAgentSkills(client, validateId(agentId, "agent id")),

  tasksList: () => listTasks(client),
  tasksCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateTask(input);
      return createTask(client, payload);
    }),
  tasksAssign: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateAssignTask(input);
      const task = assignTask(client, payload.taskId, payload.agentId);
      createEvent(client, {
        id: `event-task-assigned-${payload.taskId}-${payload.agentId}`,
        type: "task_assigned",
        actorType: "user",
        actorId: "local-user",
        agentId: payload.agentId,
        taskId: payload.taskId,
        payload: { taskId: payload.taskId, agentId: payload.agentId }
      });
      return task;
    }),
  tasksUpdateStatus: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateUpdateTaskStatus(input);
      return updateTaskStatus(client, payload);
    }),

  meetingsList: () => listMeetings(client),
  meetingsCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateMeeting(input);
      return createMeeting(client, payload);
    }),
  meetingsListMessages: (meetingId: unknown) =>
    listMeetingMessages(client, validateId(meetingId, "meeting id")),
  meetingsSendMessage: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateSendMeetingMessage(input);
      return addMeetingMessage(client, payload);
    }),
  meetingsFinish: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateFinishMeeting(input);
      return completeMeeting(client, payload.meetingId, payload.summary);
    }),

  eventsList: (filter?: unknown) => listEvents(client, validateEventFilter(filter)),
  eventsGet: (eventId: unknown) => getEvent(client, validateId(eventId, "event id")),

  tokenUsageListByAgent: (agentId: unknown) => listTokenUsageByAgent(client, validateId(agentId, "agent id")),
  tokenUsageSummaryByAgent: (agentId: unknown) =>
    summarizeTokenUsageByAgent(client, validateId(agentId, "agent id")),

  settingsGet: () => settingsRowsToMap(listSettings(client)),
  settingsUpdate: (patch: unknown) =>
    saveAfter(client, () => {
      const payload = validateSettingsPatch(patch);
      for (const [key, value] of Object.entries(payload)) {
        setSetting(client, key, value);
      }
      return settingsRowsToMap(listSettings(client));
    }),

  runtimeDiscoverAgents: () => listAgents(client),
  runtimeSpawnAgent: (_input: unknown): never => {
    throw new Error("Runtime spawn is implemented in Task 05.");
  },
  runtimeSendMessage: (sessionId: unknown, message: unknown): never => {
    validateId(sessionId, "session id");
    validateId(message, "runtime message");
    throw new Error("Runtime messaging is implemented in Task 05.");
  },
  runtimeStopAgent: (sessionId: unknown): never => {
    validateId(sessionId, "session id");
    throw new Error("Runtime stop is implemented in Task 05.");
  },

  getSetting: (key: unknown) => getSetting(client, validateId(key, "setting key"))
});

export type IpcHandlers = ReturnType<typeof createIpcHandlers>;
