import type { AppInfo } from "../../shared/types/app";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { DatabaseClient } from "../db/client";
import {
  createEvent,
  createMessage,
  createTask,
  getEvent,
  getSession,
  getSetting,
  getSkill,
  listEvents,
  listMeetings,
  listMeetingMessages,
  listMeetingParticipants,
  listMessagesBySession,
  listSessionsForAgent,
  listSettings,
  listSkills,
  listTasks,
  listTokenUsageByAgent,
  setSetting,
  summarizeTokenUsageByAgent,
} from "../db/repositories";
import {
  attachSkillToRegisteredAgent,
  detachSkillFromRegisteredAgent,
  getRegisteredAgent,
  listRegisteredAgentSkills,
  listRegisteredAgents,
  moveRegisteredAgent,
  unregisterAgent
} from "../agentRegistry/agentRegistryService";
import { createAgentThroughOrchestration, spawnAgentThroughOrchestration } from "../orchestration/agentOrchestrationService";
import { createDefaultRuntimeRegistry, type RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { discoverLocalCodexProcesses } from "../runtime/discoverLocalCodexProcesses";
import { persistRuntimeEvent } from "../runtime/persistRuntimeEvent";
import { routeSessionMessage } from "../messageRouter/messageRouter";
import { assignTaskThroughEngine, updateTaskStatusThroughEngine } from "../taskEngine/taskEngine";
import {
  createMeetingThroughOrchestration,
  finishMeetingThroughOrchestration,
  sendMeetingMessageThroughRouter
} from "../meetings/meetingOrchestrator";
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
  inspectAgentPackForInstall,
  installAgentPack,
  listInstalledAgentPacks,
  uninstallAgentPack
} from "../agentPacks/agentPackInstaller";
import {
  createProjectWorkspace,
  getActiveProjectWorkspaceId,
  getOfficeTheme,
  getV2IntegrationStatus,
  listProjectWorkspaces,
  replayTimelineEvents,
  selectProjectWorkspace,
  setOfficeTheme
} from "../integrations/v2IntegrationService";
import { PermissionPolicyEngine } from "../security/permissionPolicy";
import { PermissionRequiredError } from "../security/permissionPolicy";
import {
  validatePermissionDecision,
  validateOptionalProjectPath,
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
  validateUpdateTaskStatus,
  validateAgentPackPath,
  validateCreateProjectWorkspace,
  validateOfficeTheme,
  validateTimelineReplay
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
  const permissionPolicy = new PermissionPolicyEngine(client);

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
  agentsDelete: (agentId: unknown) =>
    saveAfterAsync(client, async () => {
      const validAgentId = validateId(agentId, "agent id");
      const sessions = listSessionsForAgent(client, validAgentId);

      for (const session of sessions) {
        if (!["completed", "stopped", "failed"].includes(session.status)) {
          try {
            await runtimeRegistry.stop(session.id);
          } catch {
            // Ignore missing runtime state and continue removing persisted agent data.
          }
        }
      }

      return unregisterAgent(client, validAgentId);
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

  agentPacksInspect: (folderPath: unknown) =>
    saveAfter(client, () => inspectAgentPackForInstall(client, validateAgentPackPath(folderPath))),
  agentPacksInstall: (folderPath: unknown) =>
    saveAfter(client, () => installAgentPack(client, validateAgentPackPath(folderPath))),
  agentPacksUninstall: (packId: unknown) =>
    saveAfter(client, () => uninstallAgentPack(client, validateId(packId, "agent pack id"))),
  agentPacksListInstalled: () => listInstalledAgentPacks(client),
  agentPacksValidate: (folderPath: unknown) =>
    saveAfter(client, () => inspectAgentPackForInstall(client, validateAgentPackPath(folderPath))),

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
      const task = createTask(client, payload);
      createEvent(client, {
        id: `event-task-created-${task.id}`,
        type: "task_created",
        actorType: "user",
        actorId: "local-user",
        agentId: task.assigned_agent_id,
        taskId: task.id,
        payload: { title: task.title, createdFrom: task.created_from }
      });
      return task;
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
      return createMeetingThroughOrchestration(client, payload);
    }),
  meetingsListParticipants: (meetingId: unknown) =>
    listMeetingParticipants(client, validateId(meetingId, "meeting id")),
  meetingsListMessages: (meetingId: unknown) =>
    listMeetingMessages(client, validateId(meetingId, "meeting id")),
  meetingsSendMessage: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateSendMeetingMessage(input);
      return sendMeetingMessageThroughRouter(client, payload);
    }),
  meetingsFinish: (input: unknown) =>
    saveAfter(client, () => {
      const payload = validateFinishMeeting(input);
      return finishMeetingThroughOrchestration(client, payload);
    }),

  eventsList: (filter?: unknown) => listEvents(client, validateEventFilter(filter)),
  eventsGet: (eventId: unknown) => getEvent(client, validateId(eventId, "event id")),

  tokenUsageListByAgent: (agentId: unknown) => listTokenUsageByAgent(client, validateId(agentId, "agent id")),
  tokenUsageSummaryByAgent: (agentId: unknown) =>
    summarizeTokenUsageByAgent(client, validateId(agentId, "agent id")),

  integrationsStatus: () => saveAfterAsync(client, () => getV2IntegrationStatus(client)),
  workspacesList: () => listProjectWorkspaces(client),
  workspacesCreate: (input: unknown) =>
    saveAfter(client, () => createProjectWorkspace(client, validateCreateProjectWorkspace(input))),
  workspacesSelect: (workspaceId: unknown) =>
    saveAfter(client, () => selectProjectWorkspace(client, validateId(workspaceId, "workspace id"))),
  workspacesGetActive: () => getActiveProjectWorkspaceId(client),
  officeThemeGet: () => getOfficeTheme(client),
  officeThemeSet: (theme: unknown) => saveAfter(client, () => setOfficeTheme(client, validateOfficeTheme(theme))),
  timelineReplay: (input?: unknown) => replayTimelineEvents(client, validateTimelineReplay(input)),

  settingsGet: () => settingsRowsToMap(listSettings(client)),
  settingsUpdate: (patch: unknown) =>
    saveAfter(client, () => {
      const payload = validateSettingsPatch(patch);
      for (const [key, value] of Object.entries(payload)) {
        setSetting(client, key, value);
      }
      return settingsRowsToMap(listSettings(client));
    }),
  permissionsGetRequest: (requestId: unknown) =>
    permissionPolicy.getRequest(validateId(requestId, "permission request id")),
  permissionsDecide: (input: unknown) =>
    saveAfter(client, () => permissionPolicy.decide(validatePermissionDecision(input))),
  permissionsListRules: (projectPath?: unknown) =>
    permissionPolicy.listRules(validateOptionalProjectPath(projectPath)),
  permissionsRevokeRule: (ruleId: unknown) =>
    saveAfter(client, () => permissionPolicy.revokeRule(validateId(ruleId, "permission rule id"))),

  runtimeDiscoverAgents: async () => {
    const [storedAgents, detectedAgents] = await Promise.all([Promise.resolve(listRegisteredAgents(client)), discoverLocalCodexProcesses()]);
    const storedIds = new Set(storedAgents.map((agent) => agent.id));
    return [...storedAgents, ...detectedAgents.filter((agent) => !storedIds.has(agent.id))];
  },
  runtimeSpawnAgent: (input: unknown) =>
    saveAfterAsync(client, async () => {
      const payload = validateCreateAgent(input);
      return spawnAgentThroughOrchestration(client, runtimeRegistry, permissionPolicy, payload, nextId);
    }),
  runtimeSendMessage: (sessionId: unknown, message: unknown) =>
    saveAfterAsync(client, async () => {
      const validSessionId = validateId(sessionId, "session id");
      const validMessage = validateId(message, "runtime message");
      try {
        const response = await routeSessionMessage(
          client,
          runtimeRegistry,
          permissionPolicy,
          { sessionId: validSessionId, message: validMessage },
          nextId
        );
        return { status: "sent" as const, message: response };
      } catch (error) {
        if (error instanceof PermissionRequiredError) {
          return { status: "permission_required" as const, requestId: error.requestId };
        }
        throw error;
      }
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
