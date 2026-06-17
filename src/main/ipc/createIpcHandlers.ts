import type { AppInfo } from "../../shared/types/app";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { DatabaseClient } from "../db/client";
import {
  completeMeeting,
  createEvent,
  createMeeting,
  createMessage,
  createTask,
  getEvent,
  getSession,
  getSetting,
  getSkill,
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
  addMeetingMessage
} from "../db/repositories";
import {
  attachSkillToRegisteredAgent,
  detachSkillFromRegisteredAgent,
  getRegisteredAgent,
  listRegisteredAgentSkills,
  listRegisteredAgents,
  moveRegisteredAgent
} from "../agentRegistry/agentRegistryService";
import { createAgentThroughOrchestration, spawnAgentThroughOrchestration } from "../orchestration/agentOrchestrationService";
import { createDefaultRuntimeRegistry, type RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { discoverLocalCodexProcesses } from "../runtime/discoverLocalCodexProcesses";
import { persistRuntimeEvent } from "../runtime/persistRuntimeEvent";
import { routeSessionMessage } from "../messageRouter/messageRouter";
import { assignTaskThroughEngine, updateTaskStatusThroughEngine } from "../taskEngine/taskEngine";
import {
  assignProfileSkill,
  duplicateProfile,
  generateProfileSnapshot,
  getCapabilityMatrix,
  getProfile,
  listProfileSkillAssignments,
  listProfiles,
  removeProfile,
  removeProfileSkill,
  updateProfile,
  createProfile
} from "../profiles/profileService";
import { exportProfile, importProfile } from "../profiles/profileImportExport";
import { scanSkills } from "../skills/scanSkills";
import {
  validateAssignSkill,
  validateAssignProfileSkill,
  validateAssignTask,
  validateCreateAgent,
  validateCreateAgentProfile,
  validateCreateMeeting,
  validateCreateMessage,
  validateCreateTask,
  validateDuplicateAgentProfile,
  validateEventFilter,
  validateFinishMeeting,
  validateId,
  validateSendMeetingMessage,
  validateSettingsPatch,
  validateScanSkills,
  validateRemoveSkill,
  validateRemoveProfileSkill,
  validateUpdateAgentProfile,
  validateUpdateAgentPosition,
  validateUpdateTaskStatus
} from "./validators";

export type IpcHandlerContext = {
  client: DatabaseClient;
  getAppInfo: () => AppInfo;
  runtimeRegistry?: RuntimeRegistry;
  publishRuntimeEvent?: (event: AgentRuntimeEvent) => void;
};

const saveAfter = <T>(client: DatabaseClient, operation: () => T): T => {
  const result = operation();
  client.save();
  return result;
};

const saveAfterAsync = async <T>(client: DatabaseClient, operation: () => Promise<T>): Promise<T> => {
  const result = await operation();
  client.save();
  return result;
};

export const settingsRowsToMap = (rows: ReturnType<typeof listSettings>): Record<string, unknown> =>
  Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value_json) as unknown]));

export const createIpcHandlers = ({
  client,
  getAppInfo,
  runtimeRegistry = createDefaultRuntimeRegistry(),
  publishRuntimeEvent
}: IpcHandlerContext) => {
  let localSequence = 0;
  const nextId = (prefix: string): string => `${prefix}-${Date.now()}-${++localSequence}`;

  runtimeRegistry.onEvent((event) => {
    persistRuntimeEvent(client, event);
    client.save();
    publishRuntimeEvent?.(event);
  });

  return {
  appInfo: (): AppInfo => getAppInfo(),

  agentsList: () => listRegisteredAgents(client),
  agentsGet: (agentId: unknown) => getRegisteredAgent(client, validateId(agentId, "agent id")),
  agentsCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateAgent(input);
      return createAgentThroughOrchestration(client, payload);
    }),
  agentsUpdatePosition: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateUpdateAgentPosition(input);
      return moveRegisteredAgent(client, payload.agentId, { x: payload.x, y: payload.y });
    }),
  agentsAssignSkill: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateAssignSkill(input);
      return attachSkillToRegisteredAgent(client, payload);
    }),
  agentsRemoveSkill: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateRemoveSkill(input);
      return detachSkillFromRegisteredAgent(client, payload, nextId);
    }),

  profilesList: () => listProfiles(client),
  profilesGet: (profileId: unknown) => getProfile(client, validateId(profileId, "profile id")),
  profilesCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateAgentProfile(input);
      return createProfile(client, payload);
    }),
  profilesUpdate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateUpdateAgentProfile(input);
      return updateProfile(client, payload.profileId, payload.patch);
    }),
  profilesDuplicate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateDuplicateAgentProfile(input);
      return duplicateProfile(client, payload.profileId, payload.newProfileId);
    }),
  profilesDelete: (profileId: unknown) =>
    saveAfter(client, () => removeProfile(client, validateId(profileId, "profile id"))),
  profilesAssignSkill: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateAssignProfileSkill(input);
      return assignProfileSkill(client, payload);
    }),
  profilesRemoveSkill: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateRemoveProfileSkill(input);
      return removeProfileSkill(client, payload);
    }),
  profilesListSkills: (profileId: unknown) =>
    listProfileSkillAssignments(client, validateId(profileId, "profile id")),
  profilesGenerateSnapshot: (profileId: unknown) =>
    generateProfileSnapshot(client, validateId(profileId, "profile id")),
  profilesCapabilityMatrix: (profileId: unknown) =>
    getCapabilityMatrix(client, validateId(profileId, "profile id")),
  profilesExport: (profileId: unknown) => exportProfile(client, validateId(profileId, "profile id")),
  profilesImport: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateAgentProfile(input);
      return importProfile(client, payload);
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
  skillsScan: (input?: unknown) =>
    saveAfterAsync(client, async () => {
      const payload = validateScanSkills(input);
      return scanSkills(client, payload);
    }),
  skillsGet: (skillId: unknown) => getSkill(client, validateId(skillId, "skill id")),
  skillsListForAgent: (agentId: unknown) => listRegisteredAgentSkills(client, validateId(agentId, "agent id")),

  tasksList: () => listTasks(client),
  tasksCreate: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateCreateTask(input);
      return createTask(client, payload);
    }),
  tasksAssign: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateAssignTask(input);
      return assignTaskThroughEngine(client, payload);
    }),
  tasksUpdateStatus: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateUpdateTaskStatus(input);
      return updateTaskStatusThroughEngine(client, payload);
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

  runtimeDiscoverAgents: async () => {
    const [storedAgents, detectedAgents] = await Promise.all([Promise.resolve(listRegisteredAgents(client)), discoverLocalCodexProcesses()]);
    const storedIds = new Set(storedAgents.map((agent) => agent.id));
    return [...storedAgents, ...detectedAgents.filter((agent) => !storedIds.has(agent.id))];
  },
  runtimeSpawnAgent: (input: unknown) =>
    saveAfterAsync(client, async () => {
      const payload = validateCreateAgent(input);
      return spawnAgentThroughOrchestration(client, runtimeRegistry, payload, nextId);
    }),
  runtimeSendMessage: (sessionId: unknown, message: unknown) =>
    saveAfterAsync(client, async () => {
      const validSessionId = validateId(sessionId, "session id");
      const validMessage = validateId(message, "runtime message");
      return routeSessionMessage(client, runtimeRegistry, { sessionId: validSessionId, message: validMessage }, nextId);
    }),
  runtimeStopAgent: (sessionId: unknown) =>
    saveAfterAsync(client, async () => {
      const validSessionId = validateId(sessionId, "session id");
      await runtimeRegistry.stop(validSessionId);
      const session = getSession(client, validSessionId);

      if (!session) {
        throw new Error(`Session not found: ${validSessionId}`);
      }

      return session;
    }),

  getSetting: (key: unknown) => getSetting(client, validateId(key, "setting key"))
  };
};

export type IpcHandlers = ReturnType<typeof createIpcHandlers>;
