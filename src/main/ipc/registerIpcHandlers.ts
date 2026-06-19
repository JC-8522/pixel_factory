import { dialog, ipcMain } from "electron";
import { IPC_CHANNELS } from "../../shared/ipc";
import type { IpcHandlers } from "./createIpcHandlers";

export const registerIpcHandlers = (handlers: IpcHandlers): void => {
  ipcMain.handle(IPC_CHANNELS.appInfo, () => handlers.appInfo());
  ipcMain.handle(IPC_CHANNELS.appPickWorkingDirectory, async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
      title: "Select agent working directory"
    });

    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipcMain.handle(IPC_CHANNELS.officeGetSnapshot, () => handlers.officeGetSnapshot());
  ipcMain.handle(IPC_CHANNELS.officeCreateWorkstation, (_event, input) => handlers.officeCreateWorkstation(input));
  ipcMain.handle(IPC_CHANNELS.agentsList, () => handlers.agentsList());
  ipcMain.handle(IPC_CHANNELS.agentsGet, (_event, agentId) => handlers.agentsGet(agentId));
  ipcMain.handle(IPC_CHANNELS.agentsCreate, (_event, input) => handlers.agentsCreate(input));
  ipcMain.handle(IPC_CHANNELS.agentsDelete, (_event, agentId) => handlers.agentsDelete(agentId));
  ipcMain.handle(IPC_CHANNELS.agentsUpdatePosition, (_event, input) => handlers.agentsUpdatePosition(input));
  ipcMain.handle(IPC_CHANNELS.agentsAssignSkill, (_event, input) => handlers.agentsAssignSkill(input));
  ipcMain.handle(IPC_CHANNELS.agentsRemoveSkill, (_event, input) => handlers.agentsRemoveSkill(input));

  ipcMain.handle(IPC_CHANNELS.profilesList, () => handlers.profilesList());
  ipcMain.handle(IPC_CHANNELS.profilesGet, (_event, profileId) => handlers.profilesGet(profileId));
  ipcMain.handle(IPC_CHANNELS.profilesCreate, (_event, input) => handlers.profilesCreate(input));
  ipcMain.handle(IPC_CHANNELS.profilesUpdate, (_event, input) => handlers.profilesUpdate(input));
  ipcMain.handle(IPC_CHANNELS.profilesDuplicate, (_event, input) => handlers.profilesDuplicate(input));
  ipcMain.handle(IPC_CHANNELS.profilesDelete, (_event, profileId) => handlers.profilesDelete(profileId));
  ipcMain.handle(IPC_CHANNELS.profilesAssignSkill, (_event, input) => handlers.profilesAssignSkill(input));
  ipcMain.handle(IPC_CHANNELS.profilesRemoveSkill, (_event, input) => handlers.profilesRemoveSkill(input));
  ipcMain.handle(IPC_CHANNELS.profilesListSkills, (_event, profileId) => handlers.profilesListSkills(profileId));
  ipcMain.handle(IPC_CHANNELS.profilesGenerateSnapshot, (_event, profileId) =>
    handlers.profilesGenerateSnapshot(profileId)
  );
  ipcMain.handle(IPC_CHANNELS.profilesCapabilityMatrix, (_event, profileId) =>
    handlers.profilesCapabilityMatrix(profileId)
  );
  ipcMain.handle(IPC_CHANNELS.profilesExport, (_event, profileId) => handlers.profilesExport(profileId));
  ipcMain.handle(IPC_CHANNELS.profilesImport, (_event, input) => handlers.profilesImport(input));

  ipcMain.handle(IPC_CHANNELS.agentPacksInspect, (_event, folderPath) => handlers.agentPacksInspect(folderPath));
  ipcMain.handle(IPC_CHANNELS.agentPacksInstall, (_event, folderPath) => handlers.agentPacksInstall(folderPath));
  ipcMain.handle(IPC_CHANNELS.agentPacksUninstall, (_event, packId) => handlers.agentPacksUninstall(packId));
  ipcMain.handle(IPC_CHANNELS.agentPacksListInstalled, () => handlers.agentPacksListInstalled());
  ipcMain.handle(IPC_CHANNELS.agentPacksValidate, (_event, folderPath) => handlers.agentPacksValidate(folderPath));

  ipcMain.handle(IPC_CHANNELS.sessionsListByAgent, (_event, agentId) => handlers.sessionsListByAgent(agentId));

  ipcMain.handle(IPC_CHANNELS.messagesListBySession, (_event, sessionId) =>
    handlers.messagesListBySession(sessionId)
  );
  ipcMain.handle(IPC_CHANNELS.messagesCreate, (_event, input) => handlers.messagesCreate(input));

  ipcMain.handle(IPC_CHANNELS.skillsList, () => handlers.skillsList());
  ipcMain.handle(IPC_CHANNELS.skillsScan, (_event, input) => handlers.skillsScan(input));
  ipcMain.handle(IPC_CHANNELS.skillsGet, (_event, skillId) => handlers.skillsGet(skillId));
  ipcMain.handle(IPC_CHANNELS.skillsListForAgent, (_event, agentId) => handlers.skillsListForAgent(agentId));

  ipcMain.handle(IPC_CHANNELS.tasksList, () => handlers.tasksList());
  ipcMain.handle(IPC_CHANNELS.tasksCreate, (_event, input) => handlers.tasksCreate(input));
  ipcMain.handle(IPC_CHANNELS.tasksAssign, (_event, input) => handlers.tasksAssign(input));
  ipcMain.handle(IPC_CHANNELS.tasksUpdateStatus, (_event, input) => handlers.tasksUpdateStatus(input));

  ipcMain.handle(IPC_CHANNELS.meetingsList, () => handlers.meetingsList());
  ipcMain.handle(IPC_CHANNELS.meetingsCreate, (_event, input) => handlers.meetingsCreate(input));
  ipcMain.handle(IPC_CHANNELS.meetingsListParticipants, (_event, meetingId) =>
    handlers.meetingsListParticipants(meetingId)
  );
  ipcMain.handle(IPC_CHANNELS.meetingsListMessages, (_event, meetingId) =>
    handlers.meetingsListMessages(meetingId)
  );
  ipcMain.handle(IPC_CHANNELS.meetingsSendMessage, (_event, input) => handlers.meetingsSendMessage(input));
  ipcMain.handle(IPC_CHANNELS.meetingsFinish, (_event, input) => handlers.meetingsFinish(input));

  ipcMain.handle(IPC_CHANNELS.eventsList, (_event, filter) => handlers.eventsList(filter));
  ipcMain.handle(IPC_CHANNELS.eventsGet, (_event, eventId) => handlers.eventsGet(eventId));

  ipcMain.handle(IPC_CHANNELS.tokenUsageListByAgent, (_event, agentId) =>
    handlers.tokenUsageListByAgent(agentId)
  );
  ipcMain.handle(IPC_CHANNELS.tokenUsageSummaryByAgent, (_event, agentId) =>
    handlers.tokenUsageSummaryByAgent(agentId)
  );

  ipcMain.handle(IPC_CHANNELS.integrationsStatus, () => handlers.integrationsStatus());
  ipcMain.handle(IPC_CHANNELS.workspacesList, () => handlers.workspacesList());
  ipcMain.handle(IPC_CHANNELS.workspacesCreate, (_event, input) => handlers.workspacesCreate(input));
  ipcMain.handle(IPC_CHANNELS.workspacesSelect, (_event, workspaceId) => handlers.workspacesSelect(workspaceId));
  ipcMain.handle(IPC_CHANNELS.workspacesGetActive, () => handlers.workspacesGetActive());
  ipcMain.handle(IPC_CHANNELS.officeThemeGet, () => handlers.officeThemeGet());
  ipcMain.handle(IPC_CHANNELS.officeThemeSet, (_event, theme) => handlers.officeThemeSet(theme));
  ipcMain.handle(IPC_CHANNELS.timelineReplay, (_event, input) => handlers.timelineReplay(input));

  ipcMain.handle(IPC_CHANNELS.settingsGet, () => handlers.settingsGet());
  ipcMain.handle(IPC_CHANNELS.settingsUpdate, (_event, patch) => handlers.settingsUpdate(patch));
  ipcMain.handle(IPC_CHANNELS.permissionsGetRequest, (_event, requestId) => handlers.permissionsGetRequest(requestId));
  ipcMain.handle(IPC_CHANNELS.permissionsDecide, (_event, input) => handlers.permissionsDecide(input));
  ipcMain.handle(IPC_CHANNELS.permissionsListRules, (_event, projectPath) => handlers.permissionsListRules(projectPath));
  ipcMain.handle(IPC_CHANNELS.permissionsRevokeRule, (_event, ruleId) => handlers.permissionsRevokeRule(ruleId));

  ipcMain.handle(IPC_CHANNELS.runtimeDiscoverAgents, () => handlers.runtimeDiscoverAgents());
  ipcMain.handle(IPC_CHANNELS.runtimeSpawnAgent, (_event, input) => handlers.runtimeSpawnAgent(input));
  ipcMain.handle(IPC_CHANNELS.runtimeSendMessage, (_event, sessionId, message) =>
    handlers.runtimeSendMessage(sessionId, message)
  );
  ipcMain.handle(IPC_CHANNELS.runtimeStopAgent, (_event, sessionId) => handlers.runtimeStopAgent(sessionId));
};
