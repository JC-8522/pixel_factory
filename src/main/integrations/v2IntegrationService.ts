import type { DatabaseClient } from "../db/client";
import { listEvents, getSetting, setSetting } from "../db/repositories";
import { recordAuditEvent } from "../audit/auditEngine";
import { discoverLocalCodexProcesses } from "../runtime/discoverLocalCodexProcesses";
import { AttachedCodexRuntime, type AttachCapability } from "../runtime/AttachedCodexRuntime";
import { DisabledMcpRuntimeBridge, type McpBridgeStatus } from "../runtime/McpRuntimeBridge";

export type ProjectWorkspace = {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
};

export type OfficeTheme = "default" | "forest" | "focus";

export type V2IntegrationStatus = {
  attach: AttachCapability;
  mcp: McpBridgeStatus;
  github: { configured: false; status: "not_configured"; reason: string };
  plugins: { configured: false; status: "not_configured"; reason: string };
};

const WORKSPACES_KEY = "projectWorkspaces";
const ACTIVE_WORKSPACE_KEY = "activeProjectWorkspaceId";
const OFFICE_THEME_KEY = "officeTheme";

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const listProjectWorkspaces = (client: DatabaseClient): ProjectWorkspace[] => {
  const setting = getSetting(client, WORKSPACES_KEY);
  const workspaces = parseJson<ProjectWorkspace[]>(setting?.value_json, []);
  if (workspaces.length > 0) {
    return workspaces;
  }

  return [
    {
      id: "default",
      name: "Default Workspace",
      rootPath: "",
      createdAt: new Date().toISOString()
    }
  ];
};

export const getActiveProjectWorkspaceId = (client: DatabaseClient): string => {
  const setting = getSetting(client, ACTIVE_WORKSPACE_KEY);
  return parseJson<string>(setting?.value_json, "default");
};

export const createProjectWorkspace = (
  client: DatabaseClient,
  input: { id: string; name: string; rootPath: string }
): ProjectWorkspace => {
  const workspaces = listProjectWorkspaces(client).filter((workspace) => workspace.id !== input.id);
  const workspace = { ...input, createdAt: new Date().toISOString() };
  setSetting(client, WORKSPACES_KEY, [...workspaces, workspace]);
  recordAuditEvent(client, {
    id: `event-workspace-created-${input.id}-${Date.now()}`,
    type: "project_workspace_created",
    actorType: "user",
    actorId: "local-user",
    payload: { workspaceId: input.id, name: input.name, rootPath: input.rootPath }
  });
  return workspace;
};

export const selectProjectWorkspace = (client: DatabaseClient, workspaceId: string): ProjectWorkspace => {
  const workspace = listProjectWorkspaces(client).find((item) => item.id === workspaceId);
  if (!workspace) {
    throw new Error(`Project workspace not found: ${workspaceId}`);
  }

  setSetting(client, ACTIVE_WORKSPACE_KEY, workspaceId);
  recordAuditEvent(client, {
    id: `event-workspace-selected-${workspaceId}-${Date.now()}`,
    type: "project_workspace_selected",
    actorType: "user",
    actorId: "local-user",
    payload: { workspaceId }
  });
  return workspace;
};

export const getOfficeTheme = (client: DatabaseClient): OfficeTheme => {
  const setting = getSetting(client, OFFICE_THEME_KEY);
  const value = parseJson<string>(setting?.value_json, "default");
  return value === "forest" || value === "focus" ? value : "default";
};

export const setOfficeTheme = (client: DatabaseClient, theme: OfficeTheme): OfficeTheme => {
  setSetting(client, OFFICE_THEME_KEY, theme);
  recordAuditEvent(client, {
    id: `event-office-theme-selected-${theme}-${Date.now()}`,
    type: "office_theme_selected",
    actorType: "user",
    actorId: "local-user",
    payload: { theme }
  });
  return theme;
};

export const getV2IntegrationStatus = async (client: DatabaseClient): Promise<V2IntegrationStatus> => {
  const detected = await discoverLocalCodexProcesses();
  const attach = new AttachedCodexRuntime().getCapability(detected.length);
  const mcp = await new DisabledMcpRuntimeBridge().getStatus();

  recordAuditEvent(client, {
    id: `event-integration-status-${Date.now()}`,
    type: "v2_integration_status_checked",
    actorType: "user",
    actorId: "local-user",
    payload: { attach, mcp }
  });

  return {
    attach,
    mcp,
    github: {
      configured: false,
      status: "not_configured",
      reason: "GitHub integration boundary is documented for V2 but no provider is configured yet."
    },
    plugins: {
      configured: false,
      status: "not_configured",
      reason: "Plugin registry interface is documented for V2 but plugin loading is not enabled yet."
    }
  };
};

export const replayTimelineEvents = (
  client: DatabaseClient,
  input: { limit?: number; type?: string; after?: string }
) => {
  const events = listEvents(client, input.type ? { type: input.type } : {});
  const afterTime = input.after ? Date.parse(input.after) : Number.NaN;
  const filtered = Number.isNaN(afterTime)
    ? events
    : events.filter((event) => Date.parse(event.created_at) >= afterTime);
  return filtered.slice(-(input.limit ?? 50));
};
