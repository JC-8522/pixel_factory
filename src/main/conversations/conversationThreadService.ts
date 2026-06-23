import { readFile } from "node:fs/promises";
import type {
  ConversationAttachmentRef,
  ConversationComposerContext,
  ConversationEntryBlock,
  ConversationEntryKind,
  ConversationEntryView,
  ConversationProcessStageView,
  ConversationRecordGroupView,
  ConversationRunSummary,
  ConversationRunView,
  ConversationThreadSummary,
  ConversationThreadView,
  ConversationTimelineEntry,
  ConversationVisibleFlowBlockView
} from "../../shared/types/conversation";
import type {
  ConversationRenameThreadRequest,
  ConversationSaveComposerRequest,
  ConversationSaveDraftRequest,
  ConversationSendMessageRequest,
  ConversationSwitchThreadRequest
} from "../../shared/ipc";
import type { DatabaseClient } from "../db/client";
import type { RuntimeKind } from "../../shared/types/agent";
import {
  createSession,
  getAgent,
  getSetting,
  listEvents,
  listMessagesBySession,
  listSessionsForAgent,
  setSetting,
  type EventRecord,
  type MessageRecord,
  type SessionRecord
} from "../db/repositories";
import type { RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { buildAgentRuntimeContext } from "../context/contextBuilder";
import { recordSessionMessages, routeSessionMessage } from "../messageRouter/messageRouter";
import { PermissionRequiredError, type PermissionPolicyEngine } from "../security/permissionPolicy";

const COMPOSER_KEY_PREFIX = "conversationComposer:";
const DRAFT_KEY_PREFIX = "conversationDraft:";
const CURRENT_THREAD_KEY_PREFIX = "conversationCurrentThread:";
const THREAD_META_KEY_PREFIX = "conversationThreadMeta:";
const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".cs",
  ".css",
  ".csv",
  ".go",
  ".graphql",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".rb",
  ".rs",
  ".sh",
  ".sql",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);
const TEXT_ATTACHMENT_MAX_FILE_BYTES = 64 * 1024;
const TEXT_ATTACHMENT_MAX_PREVIEW_CHARS = 4000;

type StoredConversationEntryMetadata = {
  entryKind?: ConversationEntryKind;
  /** Backward-compatible alias while older stored rows still use `messageKind`. */
  messageKind?: ConversationEntryKind;
  blocks?: ConversationEntryBlock[];
  attachments?: ConversationAttachmentRef[];
  composerContext?: ConversationComposerContext;
};

type StoredSessionMetadata = {
  composerContext?: ConversationComposerContext;
  threadId?: string;
};

type StoredConversationThreadMetadata = {
  customTitle?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
};

type ConversationRunDigest = Pick<ConversationRunView, "id" | "status" | "startedAt" | "endedAt" | "initialPrompt" | "summary">;

const parseJson = <T,>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const parseAgentProfileDefaults = (
  profileSnapshotJson: string | null | undefined
): {
  profileId: string | null;
  profileLabel: string | null;
  defaultModelProfile: string | null;
  defaultPermissionMode: string | null;
} => {
  const snapshot = parseJson<Record<string, unknown>>(profileSnapshotJson, {});
  const profileId = typeof snapshot.profileId === "string" && snapshot.profileId.trim().length > 0 ? snapshot.profileId.trim() : null;
  const profileLabel = typeof snapshot.name === "string" && snapshot.name.trim().length > 0 ? snapshot.name.trim() : null;
  const defaultModelProfile =
    typeof snapshot.defaultModelProfile === "string" && snapshot.defaultModelProfile.trim().length > 0
      ? snapshot.defaultModelProfile.trim()
      : null;
  const defaultPermissionMode =
    typeof snapshot.defaultPermissionMode === "string" && snapshot.defaultPermissionMode.trim().length > 0
      ? snapshot.defaultPermissionMode.trim()
      : null;
  return { profileId, profileLabel, defaultModelProfile, defaultPermissionMode };
};

const defaultThreadId = (agentId: string): string => `thread-${agentId}-default`;
const currentThreadKey = (agentId: string): string => `${CURRENT_THREAD_KEY_PREFIX}${agentId}`;
const composerKey = (agentId: string, threadId: string): string => `${COMPOSER_KEY_PREFIX}${agentId}:${threadId}`;
const draftKey = (agentId: string, threadId: string): string => `${DRAFT_KEY_PREFIX}${agentId}:${threadId}`;
const threadMetaKey = (agentId: string, threadId: string): string => `${THREAD_META_KEY_PREFIX}${agentId}:${threadId}`;

const getStoredCurrentThreadId = (client: DatabaseClient, agentId: string): string => {
  const setting = getSetting(client, currentThreadKey(agentId));
  const stored = parseJson<string | null>(setting?.value_json, null);
  return typeof stored === "string" && stored.trim().length > 0 ? stored.trim() : defaultThreadId(agentId);
};

const setStoredCurrentThreadId = (client: DatabaseClient, agentId: string, threadId: string): void => {
  setSetting(client, currentThreadKey(agentId), threadId);
};

const sessionThreadId = (agentId: string, session: SessionRecord): string =>
  parseJson<StoredSessionMetadata>(session.metadata_json, {}).threadId?.trim() || defaultThreadId(agentId);

const resolveThreadId = (client: DatabaseClient, agentId: string, threadId: string | null | undefined): string =>
  threadId?.trim() || getStoredCurrentThreadId(client, agentId);

const getStoredThreadMetadata = (
  client: DatabaseClient,
  agentId: string,
  threadId: string
): StoredConversationThreadMetadata =>
  parseJson<StoredConversationThreadMetadata | null>(getSetting(client, threadMetaKey(agentId, threadId))?.value_json, {}) ?? {};

const setStoredThreadMetadata = (
  client: DatabaseClient,
  agentId: string,
  threadId: string,
  metadata: StoredConversationThreadMetadata
): void => {
  setSetting(client, threadMetaKey(agentId, threadId), metadata);
};

const isThreadArchived = (client: DatabaseClient, agentId: string, threadId: string): boolean =>
  Boolean(getStoredThreadMetadata(client, agentId, threadId).archived);

const extensionFromName = (name: string): string => {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
};

const isTextAttachment = (attachment: ConversationAttachmentRef): boolean =>
  attachment.mimeType.startsWith("text/") ||
  attachment.mimeType === "application/json" ||
  attachment.mimeType === "image/svg+xml" ||
  TEXT_ATTACHMENT_EXTENSIONS.has(extensionFromName(attachment.name));

const truncateAttachmentContent = (content: string): { text: string; truncated: boolean } => {
  const sanitized = content.replace(/\u0000/g, "").trim();
  if (sanitized.length <= TEXT_ATTACHMENT_MAX_PREVIEW_CHARS) {
    return { text: sanitized, truncated: false };
  }

  return {
    text: `${sanitized.slice(0, TEXT_ATTACHMENT_MAX_PREVIEW_CHARS - 1)}...`,
    truncated: true
  };
};

const summarizeRuntimeAttachment = async (attachment: ConversationAttachmentRef): Promise<string> => {
  const lines = [`- ${attachment.name} (${attachment.mimeType}, ${attachment.size} bytes)`];
  if (attachment.filePath) {
    lines.push(`  path: ${attachment.filePath}`);
  }

  if (!attachment.filePath) {
    lines.push("  local path unavailable; attach metadata only.");
    return lines.join("\n");
  }

  if (!isTextAttachment(attachment)) {
    lines.push("  binary or non-text attachment; inspect by local path if needed.");
    return lines.join("\n");
  }

  if (attachment.size > TEXT_ATTACHMENT_MAX_FILE_BYTES) {
    lines.push(`  text attachment omitted from inline context because it exceeds ${TEXT_ATTACHMENT_MAX_FILE_BYTES} bytes.`);
    return lines.join("\n");
  }

  try {
    const content = await readFile(attachment.filePath, "utf8");
    const preview = truncateAttachmentContent(content);
    if (!preview.text) {
      lines.push("  file is empty.");
      return lines.join("\n");
    }

    lines.push(`  inline content${preview.truncated ? " (truncated)" : ""}:`);
    lines.push("  <<<ATTACHMENT");
    lines.push(preview.text);
    lines.push("  >>>");
    return lines.join("\n");
  } catch (error) {
    lines.push(`  unable to read inline content: ${error instanceof Error ? error.message : "unknown error"}`);
    return lines.join("\n");
  }
};

const runtimeAttachmentText = async (attachments: ConversationAttachmentRef[]): Promise<string> => {
  if (attachments.length === 0) {
    return "";
  }

  const summarized = await Promise.all(attachments.map(summarizeRuntimeAttachment));
  return `\n\nAttachments:\n${summarized.join("\n")}`;
};

const deriveDurationMs = (session: SessionRecord, events: EventRecord[]): number | null => {
  const startedAt = Date.parse(session.started_at);
  if (!Number.isFinite(startedAt)) {
    return null;
  }

  const endedAt = session.ended_at ? Date.parse(session.ended_at) : Number.NaN;
  if (Number.isFinite(endedAt)) {
    return Math.max(0, endedAt - startedAt);
  }

  const latestEventAt = events.length > 0 ? Date.parse(events.at(-1)?.created_at ?? "") : Number.NaN;
  return Number.isFinite(latestEventAt) ? Math.max(0, latestEventAt - startedAt) : null;
};

const normalizeContext = (agentId: string, input: ConversationComposerContext | null | undefined, fallbackRoot: string): ConversationComposerContext => {
  const agent = input ?? undefined;
  return {
    workspaceId: agent?.workspaceId ?? "default",
    workspaceRoot: agent?.workspaceRoot || fallbackRoot,
    mode: agent?.mode === "attached" ? "attached" : "local",
    branch: agent?.branch?.trim() || "master",
    profileId: agent?.profileId?.trim() || null,
    profileLabel: agent?.profileLabel?.trim() || null,
    modelProfile: agent?.modelProfile?.trim() || "5.4 High",
    approvalMode: agent?.approvalMode?.trim() || "workspace_write"
  };
};

const getStoredComposer = (
  client: DatabaseClient,
  agentId: string,
  threadId: string,
  fallbackRoot: string
): ConversationComposerContext | null => {
  const setting = getSetting(client, composerKey(agentId, threadId));
  if (!setting) {
    return null;
  }

  return normalizeContext(agentId, parseJson<ConversationComposerContext | null>(setting.value_json, null), fallbackRoot);
};

export const saveConversationComposer = (
  client: DatabaseClient,
  input: ConversationSaveComposerRequest
): ConversationComposerContext => {
  const agent = getAgent(client, input.agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${input.agentId}`);
  }

  const threadId = resolveThreadId(client, input.agentId, input.threadId);
  const composer = normalizeContext(input.agentId, input.composer, agent.working_directory);
  setSetting(client, composerKey(input.agentId, threadId), composer);
  return composer;
};

const getStoredDraft = (client: DatabaseClient, agentId: string, threadId: string): string => {
  const setting = getSetting(client, draftKey(agentId, threadId));
  if (!setting) {
    return "";
  }

  const draft = parseJson<string | null>(setting.value_json, "");
  return typeof draft === "string" ? draft : "";
};

export const saveConversationDraft = (client: DatabaseClient, input: ConversationSaveDraftRequest): string => {
  const agent = getAgent(client, input.agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${input.agentId}`);
  }

  const threadId = resolveThreadId(client, input.agentId, input.threadId);
  const draft = input.draft.trimEnd();
  setSetting(client, draftKey(input.agentId, threadId), draft);
  return draft;
};

const toneForStatus = (status: string): ConversationTimelineEntry["tone"] => {
  switch (status) {
    case "thinking":
    case "reading_files":
    case "running_command":
    case "editing_files":
      return "working";
    case "waiting_user_input":
      return "waiting";
    case "error":
    case "stopped":
    case "failed":
      return "error";
    default:
      return "neutral";
  }
};

const titleForStatus = (status: string): string => {
  switch (status) {
    case "thinking":
      return "Thinking";
    case "reading_files":
      return "Thinking";
    case "running_command":
      return "Thinking";
    case "editing_files":
      return "Thinking";
    case "waiting_user_input":
      return "Waiting for approval";
    case "completed":
      return "Run resolved";
    case "stopped":
      return "Run stopped early";
    case "error":
      return "Attention needed";
    default:
      return status.replace(/_/g, " ");
  }
};

const activityKindForStatus = (status: string): ConversationTimelineEntry["activityKind"] => {
  switch (status) {
    case "thinking":
    case "reading_files":
    case "running_command":
    case "editing_files":
    case "waiting_user_input":
    case "error":
    case "completed":
    case "stopped":
      return status;
    default:
      return null;
  }
};

const activityLabel = (activityKind: ConversationTimelineEntry["activityKind"]): string => {
  switch (activityKind) {
    case "thinking":
      return "Thinking";
    case "reading_files":
      return "Thinking";
    case "running_command":
      return "Thinking";
    case "editing_files":
      return "Thinking";
    case "waiting_user_input":
      return "Waiting for approval";
    case "error":
      return "Error";
    case "completed":
      return "Completed";
    case "stopped":
      return "Stopped";
    case "response":
      return "Outcome";
    case "usage":
      return "Run budget";
    case "session":
      return "Run";
    default:
      return "Activity";
  }
};

const timelineFacts = (...values: Array<string | null | undefined | false>): string[] =>
  values.filter((value): value is string => typeof value === "string" && value.trim().length > 0);

const commandDetail = (command: string | null): string | null => {
  if (!command) {
    return null;
  }

  return command.length > 140 ? `${command.slice(0, 139)}...` : command;
};

const firstReasonFact = (value: unknown): string | null =>
  Array.isArray(value) ? value.find((item): item is string => typeof item === "string" && item.trim().length > 0) ?? null : null;

const usageFact = (value: number, suffix: string): string | null => (value > 0 ? `${value.toLocaleString()} ${suffix}` : null);

const approvalDecisionFact = (decision: unknown): string | null => {
  switch (decision) {
    case "allow_project":
      return "Approved for project";
    case "allow_once":
      return "Approved once";
    default:
      return null;
  }
};

const timelineStageForEventType = (eventType: string): ConversationTimelineEntry["stage"] => {
  switch (eventType) {
    case "session_started":
    case "session_completed":
    case "session_stopped":
    case "status_changed":
      return "progress";
    case "command_started":
    case "command_completed":
      return "commands";
    case "file_touched":
      return "files";
    case "permission_requested":
    case "permission_decided":
    case "permission_denied":
    case "waiting_user_input":
      return "approval";
    case "message_chunk":
      return "response";
    case "token_usage_recorded":
      return "usage";
    case "error_occurred":
      return "issues";
    default:
      return "activity";
  }
};

const eventToTimelineEntry = (event: EventRecord): ConversationTimelineEntry | null => {
  const payload = parseJson<Record<string, unknown>>(event.payload_json, {});
  const command = typeof payload.command === "string" ? payload.command.replace(/\s+/g, " ").trim() : null;
  const filePath = typeof payload.path === "string" ? payload.path : null;
  const fileAction = typeof payload.action === "string" ? payload.action : null;
  const exitCode = Number(payload.exitCode ?? 0);
  const stage = timelineStageForEventType(event.type);
  const riskKinds = Array.isArray(payload.riskKinds) ? payload.riskKinds.filter((risk): risk is string => typeof risk === "string") : [];

  switch (event.type) {
    case "session_started":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "session",
        label: "Run",
        title: "Opened this run",
        detail: null,
        facts: [],
        tone: "neutral",
        createdAt: event.created_at,
        status: "running",
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    case "status_changed": {
      const status = typeof payload.status === "string" ? payload.status : null;
      if (!status || ["idle", "completed", "stopped", "error", "failed", "waiting_user_input"].includes(status)) {
        return null;
      }

      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: activityKindForStatus(status),
        label: activityLabel(activityKindForStatus(status)),
        title: titleForStatus(status),
        detail: null,
        facts: [],
        tone: toneForStatus(status),
        createdAt: event.created_at,
        status,
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    }
    case "command_started":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "running_command",
        label: "Workspace action",
        title: "Started a workspace action",
        detail: commandDetail(command),
        facts: [],
        tone: "working",
        createdAt: event.created_at,
        status: null,
        command,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    case "command_completed":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "running_command",
        label: "Workspace action",
        title: exitCode === 0 ? "Workspace action finished" : "Workspace action needs recovery",
        detail: commandDetail(command),
        facts: timelineFacts(
          exitCode === 0 ? "Completed successfully" : Number.isFinite(exitCode) ? `Exited with code ${exitCode}` : "Exit code unavailable"
        ),
        tone: exitCode === 0 ? "neutral" : "error",
        createdAt: event.created_at,
        status: null,
        command,
        filePath: null,
        fileAction: null,
        exitCode: Number.isFinite(exitCode) ? exitCode : null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    case "message_chunk": {
      const chunkLength = Number(payload.chunkLength ?? 0);
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "response",
        label: "Outcome",
        title: "Published visible output",
        detail: "Shared a visible progress update in this run.",
        facts: timelineFacts("1 outcome update", chunkLength > 0 ? `${chunkLength.toLocaleString()} chars streamed` : null),
        tone: "working",
        createdAt: event.created_at,
        status: null,
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        response: {
          updateCount: 1,
          totalChars: chunkLength > 0 ? chunkLength : 0
        },
        usage: null
      };
    }
    case "file_touched": {
      const fileTitle =
        fileAction === "read"
          ? "Reviewed project context"
          : fileAction === "created"
            ? "Created a workspace file"
            : fileAction === "deleted"
              ? "Removed a workspace file"
              : "Prepared a workspace change";
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: fileAction === "read" ? "reading_files" : "editing_files",
        label: fileAction === "read" ? "Reviewing context" : "Workspace changes",
        title: fileTitle,
        detail: filePath,
        facts: [],
        tone: "working",
        createdAt: event.created_at,
        status: null,
        command: null,
        filePath,
        fileAction,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    }
    case "waiting_user_input":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "waiting_user_input",
        label: "Waiting for approval",
        title: "Blocked on approval",
        detail: firstReasonFact(payload.reasons) ?? (typeof payload.prompt === "string" ? payload.prompt : "This run needs approval before continuing."),
        facts: [],
        tone: "waiting",
        createdAt: event.created_at,
        status: "waiting_user_input",
        command,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds,
        usage: null
      };
    case "permission_requested":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "waiting_user_input",
        label: "Waiting for approval",
        title: "Raised an approval check",
        detail: firstReasonFact(payload.reasons),
        facts: timelineFacts(...riskKinds),
        tone: "waiting",
        createdAt: event.created_at,
        status: "waiting_user_input",
        command,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds,
        usage: null
      };
    case "permission_decided":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "waiting_user_input",
        label: "Approval",
        title: "Manager cleared the blocked command",
        detail: null,
        facts: timelineFacts(approvalDecisionFact(payload.decision)),
        tone: "neutral",
        createdAt: event.created_at,
        status: null,
        command,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: typeof payload.decision === "string" ? payload.decision : null,
        riskKinds,
        usage: null
      };
    case "permission_denied":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "waiting_user_input",
        label: "Approval",
        title: "Manager denied the blocked command",
        detail: firstReasonFact(payload.reasons),
        facts: [],
        tone: "error",
        createdAt: event.created_at,
        status: "error",
        command,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: "deny",
        riskKinds,
        usage: null
      };
    case "token_usage_recorded": {
      const usage = payload.usage as Record<string, unknown> | undefined;
      const totalTokens = Number(usage?.totalTokens ?? 0);
      const reasoningTokens = Number(usage?.reasoningTokens ?? 0);
      const estimatedCost = usage?.estimatedCost;
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "usage",
        label: "Run budget",
        title: "Updated run budget",
        detail: totalTokens > 0 ? "Refreshed token and estimated cost totals for this run." : "Run budget totals were refreshed.",
        facts: timelineFacts(
          usageFact(totalTokens, "tokens"),
          usageFact(reasoningTokens, "reasoning"),
          typeof estimatedCost === "number" ? `$${estimatedCost.toFixed(4)} est.` : null
        ),
        tone: "neutral",
        createdAt: event.created_at,
        status: null,
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: {
          totalTokens,
          reasoningTokens,
          estimatedCost: typeof estimatedCost === "number" ? estimatedCost : null
        }
      };
    }
    case "session_completed":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "completed",
        label: "Run",
        title: "Run resolved",
        detail: null,
        facts: [],
        tone: "neutral",
        createdAt: event.created_at,
        status: "completed",
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    case "session_stopped":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "stopped",
        label: "Run",
        title: "Run stopped early",
        detail: null,
        facts: [],
        tone: "error",
        createdAt: event.created_at,
        status: "stopped",
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    case "error_occurred":
      return {
        id: event.id,
        eventType: event.type,
        stage,
        activityKind: "error",
        label: "Error",
        title: "Run hit a blocking issue",
        detail: typeof payload.message === "string" ? payload.message : "The runtime reported an error.",
        facts: [],
        tone: "error",
        createdAt: event.created_at,
        status: "error",
        command: null,
        filePath: null,
        fileAction: null,
        exitCode: null,
        approvalDecision: null,
        riskKinds: [],
        usage: null
      };
    default:
      return null;
  }
};

const mergeResponseTimelineEntries = (items: ConversationTimelineEntry[]): ConversationTimelineEntry[] => {
  const merged: ConversationTimelineEntry[] = [];
  let pendingResponse: ConversationTimelineEntry | null = null;

  const flushPendingResponse = (): void => {
    if (!pendingResponse) {
      return;
    }

    const updateCount = pendingResponse.response?.updateCount ?? 0;
    const totalChars = pendingResponse.response?.totalChars ?? 0;
    pendingResponse.facts = timelineFacts(
      updateCount > 0 ? `${updateCount} outcome update${updateCount === 1 ? "" : "s"}` : null,
      totalChars > 0 ? `${totalChars.toLocaleString()} chars streamed` : null
    );
    merged.push(pendingResponse);
    pendingResponse = null;
  };

  for (const item of items) {
    if (item.eventType !== "message_chunk") {
      flushPendingResponse();
      merged.push(item);
      continue;
    }

    if (!pendingResponse) {
      pendingResponse = {
        ...item,
        title: "Published visible output",
        detail: "Shared a visible progress update in this run.",
        facts: [...item.facts],
        response: {
          updateCount: item.response?.updateCount ?? 1,
          totalChars: item.response?.totalChars ?? 0
        }
      };
      continue;
    }

    pendingResponse.createdAt = item.createdAt;
    pendingResponse.tone = strongerTone(pendingResponse.tone, item.tone);
    pendingResponse.response = {
      updateCount: (pendingResponse.response?.updateCount ?? 0) + (item.response?.updateCount ?? 1),
      totalChars: (pendingResponse.response?.totalChars ?? 0) + (item.response?.totalChars ?? 0)
    };
  }

  flushPendingResponse();
  return merged;
};

const entryViewFromMessageRecord = (message: MessageRecord): ConversationEntryView => {
  const metadata = parseJson<StoredConversationEntryMetadata>(message.metadata_json, {});
  const attachments = metadata.attachments ?? [];
  const blocks =
    metadata.blocks && metadata.blocks.length > 0
      ? metadata.blocks
      : [
          {
            type: "markdown",
            text: message.content
          } satisfies ConversationEntryBlock
        ];

  return {
    id: message.id,
    sessionId: message.session_id,
    role: message.role,
    kind:
      metadata.entryKind ??
      metadata.messageKind ??
      (message.role === "user" ? "user_prompt" : message.role === "agent" ? "assistant_response" : "system_note"),
    streamState: message.stream_state,
    createdAt: message.created_at,
    parentMessageId: message.parent_message_id,
    blocks,
    attachments,
    content: message.content
  };
};

const strongerTone = (
  left: ConversationTimelineEntry["tone"],
  right: ConversationTimelineEntry["tone"]
): ConversationTimelineEntry["tone"] => {
  const weight = {
    neutral: 0,
    working: 1,
    waiting: 2,
    error: 3
  } satisfies Record<ConversationTimelineEntry["tone"], number>;
  return weight[right] > weight[left] ? right : left;
};

const summarizeTimelineItem = (item: ConversationTimelineEntry): string => {
  const leadFact = item.facts[0] ?? null;
  if (item.detail) {
    return `${item.title}: ${item.detail}`;
  }
  if (leadFact) {
    return `${item.title}: ${leadFact}`;
  }
  return item.title;
};

const processStageId = (item: ConversationTimelineEntry): string => {
  if (item.activityKind) {
    return item.activityKind;
  }
  if (item.stage) {
    return item.stage;
  }
  switch (item.eventType) {
    case "session_started":
    case "session_completed":
    case "session_stopped":
    case "status_changed":
      return "progress";
    case "command_started":
    case "command_completed":
      return "commands";
    case "file_touched":
      return "files";
    case "permission_requested":
    case "permission_decided":
    case "permission_denied":
    case "waiting_user_input":
      return "approval";
    case "message_chunk":
      return "response";
    case "token_usage_recorded":
      return "usage";
    case "error_occurred":
      return "issues";
    default:
      return item.label.toLowerCase().replace(/\s+/g, "-") || "activity";
  }
};

const processStageTitle = (stageId: string): string => {
  switch (stageId) {
    case "session":
      return "Run progress";
    case "thinking":
      return "Thinking";
    case "reading_files":
      return "Reviewing context";
    case "running_command":
      return "Workspace action";
    case "editing_files":
      return "Workspace changes";
    case "waiting_user_input":
      return "Approval";
    case "completed":
      return "Run resolved";
    case "stopped":
      return "Run stopped early";
    case "error":
      return "Blocking issues";
    case "progress":
      return "Run progress";
    case "commands":
      return "Workspace actions";
    case "files":
      return "File changes";
    case "approval":
      return "Approval";
    case "response":
      return "Visible outcome";
    case "usage":
      return "Run budget";
    case "issues":
      return "Blocking issues";
    default:
      return "Activity";
  }
};

const processStageKicker = (stageId: string): string => {
  switch (stageId) {
    case "session":
    case "progress":
      return "Thread state";
    case "thinking":
      return "Visible reasoning";
    case "reading_files":
      return "Context review";
    case "running_command":
      return "Workspace action";
    case "commands":
      return "Workspace actions";
    case "editing_files":
      return "Workspace changes";
    case "files":
      return "Workspace files";
    case "waiting_user_input":
    case "approval":
      return "Approval gate";
    case "completed":
      return "Resolved";
    case "stopped":
      return "Stopped";
    case "error":
    case "issues":
      return "Recovery signal";
    case "response":
      return "Outcome";
    case "usage":
      return "Budget";
    default:
      return "Activity";
  }
};

const summarizeProcessStage = (stageId: string, title: string, items: ConversationTimelineEntry[]): string => {
  const latest = items.at(-1) ?? null;
  if (!latest) {
    return `${title} stage recorded.`;
  }

  if (stageId === "commands" || stageId === "running_command") {
    const startedCount = items.filter((item) => item.eventType === "command_started").length;
    const completed = items.filter((item) => item.eventType === "command_completed");
    const failedCount = completed.filter((item) => item.tone === "error").length;
    const latestCommand = latest.command ?? latest.detail ?? completed.at(-1)?.command ?? completed.at(-1)?.detail ?? null;
    if (startedCount === 0 && completed.length === 0 && stageId === "running_command") {
      return latest.title === "Running a workspace action"
        ? "The run entered workspace execution and is preparing the next action."
        : latest.title;
    }
    const commandLead = `${startedCount} workspace action${startedCount === 1 ? "" : "s"} run`;
    if (failedCount > 0) {
      return latestCommand ? `${commandLead}; latest issue on ${latestCommand}` : `${commandLead}; ${failedCount} need recovery`;
    }
    return latestCommand ? `${commandLead}; latest action: ${latestCommand}` : commandLead;
  }

  if (stageId === "files" || stageId === "reading_files" || stageId === "editing_files") {
    const fileEvents = items.filter((item) => item.eventType === "file_touched");
    const reviewed = fileEvents.filter((item) => item.fileAction === "read").length;
    const changed = fileEvents.length - reviewed;
    const latestPath = latest.filePath ?? latest.detail ?? null;
    if (fileEvents.length === 0) {
      if (stageId === "reading_files") {
        return "The run is reviewing workspace context before the next visible step.";
      }
      if (stageId === "editing_files") {
        return "The run is preparing workspace changes before the next visible update.";
      }
    }
    if (reviewed > 0 && changed > 0) {
      return latestPath
        ? `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"} and prepared ${changed} change${changed === 1 ? "" : "s"}; latest file: ${latestPath}`
        : `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"} and prepared ${changed} change${changed === 1 ? "" : "s"}`;
    }
    if (reviewed > 0) {
      return latestPath
        ? `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"}; latest file: ${latestPath}`
        : `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"}`;
    }
    return latestPath
      ? `Prepared ${changed} file change${changed === 1 ? "" : "s"}; latest file: ${latestPath}`
      : `Prepared ${changed} file change${changed === 1 ? "" : "s"}`;
  }

  if (stageId === "waiting_user_input" || stageId === "approval") {
    const waiting = items.some((item) => item.tone === "waiting");
    const denied = items.some((item) => item.approvalDecision === "deny" || item.eventType === "permission_denied");
    const approved = items.filter(
      (item) =>
        item.approvalDecision === "allow_once" ||
        item.approvalDecision === "allow_project" ||
        item.eventType === "permission_decided"
    ).length;
    if (waiting) {
      return latest.detail ? `Blocked on approval: ${latest.detail}` : "Blocked on approval.";
    }
    if (denied) {
      return latest.detail ? `Approval denied: ${latest.detail}` : "An approval request was denied.";
    }
    if (approved > 0) {
      return `${approved} approval decision${approved === 1 ? "" : "s"} cleared the run.`;
    }
  }

  if (stageId === "response") {
    const updateCount = items.reduce((sum, item) => sum + (item.response?.updateCount ?? 0), 0);
    const totalChars = items.reduce((sum, item) => sum + (item.response?.totalChars ?? 0), 0);
    if (updateCount > 0) {
      return totalChars > 0
        ? `${updateCount} visible outcome update${updateCount === 1 ? "" : "s"} streamed into the run flow (${totalChars.toLocaleString()} chars).`
        : `${updateCount} visible outcome update${updateCount === 1 ? "" : "s"} streamed into the run flow.`;
    }
    return `${items.length} visible outcome update${items.length === 1 ? "" : "s"} streamed into the run flow.`;
  }

  if (stageId === "usage") {
    if (latest.usage) {
      const usageFacts = [
        latest.usage.totalTokens > 0 ? `${latest.usage.totalTokens.toLocaleString()} tokens` : null,
        latest.usage.reasoningTokens > 0 ? `${latest.usage.reasoningTokens.toLocaleString()} reasoning` : null,
        latest.usage.estimatedCost !== null ? `$${latest.usage.estimatedCost.toFixed(4)} est.` : null
      ].filter((value): value is string => Boolean(value));
      return usageFacts.length > 0 ? usageFacts.join(" - ") : "Run usage was updated.";
    }
    return latest.facts.length > 0 ? latest.facts.join(" - ") : "Run usage was updated.";
  }

  if (stageId === "issues" || stageId === "error") {
    return latest.detail ? latest.detail : `${items.length} blocking issue${items.length === 1 ? "" : "s"} recorded.`;
  }

  if (stageId === "thinking") {
    return items.length > 1
      ? "Planning checkpoints were recorded before the next visible step."
      : "The run paused to plan the next visible step.";
  }

  if (stageId === "session" || stageId === "progress" || stageId === "completed" || stageId === "stopped") {
    if (latest.title === "Run resolved") {
      return "Run resolved and handed back a visible result.";
    }
    if (latest.title === "Run stopped early") {
      return "Run stopped before the task fully finished.";
    }
    return latest.title;
  }

  if (items.length === 1) {
    return summarizeTimelineItem(latest);
  }
  return `${items.length} updates in ${title.toLowerCase()}.`;
};

const processStageStateLabel = (stageId: string, tone: ConversationTimelineEntry["tone"], items: ConversationTimelineEntry[]): string => {
  if (stageId === "completed") {
    return "Resolved";
  }
  if (stageId === "stopped") {
    return "Stopped early";
  }
  if (tone === "error") {
    return stageId === "error" || stageId === "issues" ? "Blocking issue" : "Recovery";
  }
  if (stageId === "waiting_user_input" || tone === "waiting") {
    return "Waiting on approval";
  }
  const latest = items.at(-1) ?? null;
  if (stageId === "progress" && latest?.title === "Run resolved") {
    return "Resolved";
  }
  if (stageId === "progress" && latest?.title === "Run stopped early") {
    return "Stopped early";
  }
  if (tone === "working") {
    return "In motion";
  }
  return "Recorded";
};

const buildProcessStageViews = (items: ConversationTimelineEntry[]): ConversationProcessStageView[] => {
  const groups: ConversationProcessStageView[] = [];
  for (const item of items) {
    const stageId = processStageId(item);
    const existing = groups.at(-1);
    if (existing && existing.id === stageId) {
      existing.items.push(item);
      existing.tone = strongerTone(existing.tone, item.tone);
      existing.summary = summarizeProcessStage(existing.id, existing.title, existing.items);
      existing.stateLabel = processStageStateLabel(existing.id, existing.tone, existing.items);
      existing.latestAt = existing.items.at(-1)?.createdAt ?? existing.latestAt;
      continue;
    }
    const title = processStageTitle(stageId);
    groups.push({
      id: stageId,
      title,
      kicker: processStageKicker(stageId),
      summary: summarizeProcessStage(stageId, title, [item]),
      tone: item.tone,
      stateLabel: processStageStateLabel(stageId, item.tone, [item]),
      latestAt: item.createdAt,
      items: [item]
    });
  }
  return groups;
};

const recordTrailGroupTitle = (kind: ConversationEntryKind): string => {
  switch (kind) {
    case "user_prompt":
      return "Run brief";
    case "assistant_response":
      return "Visible outcome";
    default:
      return "Run notes";
  }
};

const recordTrailGroupDetail = (kind: ConversationEntryKind, count: number): string => {
  switch (kind) {
    case "user_prompt":
      return `${count} brief${count === 1 ? "" : "s"} captured in this stretch of the run.`;
    case "assistant_response":
      return `${count} visible response${count === 1 ? "" : "s"} captured in this stretch of the run.`;
    default:
      return `${count} system note${count === 1 ? "" : "s"} captured in this stretch of the run.`;
  }
};

const recordTrailGroupFacts = (items: ConversationRecordGroupView["items"]): string[] => {
  const attachments = items.reduce((sum, item) => sum + item.entry.attachments.length, 0);
  const blocks = items.reduce((sum, item) => sum + item.entry.blocks.length, 0);
  const streaming = items.filter((item) => item.entry.role === "agent" && item.entry.streamState === "streaming").length;
  return [
    `${blocks} block${blocks === 1 ? "" : "s"}`,
    attachments > 0 ? `${attachments} attachment${attachments === 1 ? "" : "s"}` : null,
    streaming > 0 ? `${streaming} streaming` : null
  ].filter((fact): fact is string => Boolean(fact));
};

const buildRecordGroupViews = (entries: ConversationEntryView[]): ConversationRecordGroupView[] => {
  const groups: ConversationRecordGroupView[] = [];
  entries.forEach((entry, index) => {
    const existing = groups.at(-1);
    if (existing && existing.kind === entry.kind) {
      existing.items.push({
        entryId: entry.id,
        runEntryIndex: index,
        entry
      });
      existing.detail = recordTrailGroupDetail(existing.kind, existing.items.length);
      existing.facts = recordTrailGroupFacts(existing.items);
      return;
    }
    const items: ConversationRecordGroupView["items"] = [
      {
        entryId: entry.id,
        runEntryIndex: index,
        entry
      }
    ];
    groups.push({
      id: `${entry.kind}-${index}`,
      kind: entry.kind,
      title: recordTrailGroupTitle(entry.kind),
      detail: recordTrailGroupDetail(entry.kind, 1),
      facts: recordTrailGroupFacts(items),
      items
    });
  });
  return groups;
};

const visibleFlowToneForGroupKind = (kind: ConversationEntryKind): ConversationVisibleFlowBlockView["tone"] => {
  switch (kind) {
    case "user_prompt":
      return "working";
    case "assistant_response":
      return "neutral";
    default:
      return "neutral";
  }
};

const buildVisibleFlowBlocks = (
  summary: ConversationRunSummary,
  status: string,
  processStages: ConversationProcessStageView[],
  recordGroups: ConversationRecordGroupView[]
): ConversationVisibleFlowBlockView[] => {
  const blocks: ConversationVisibleFlowBlockView[] = [];
  const processFacts = [
    summary.commandCount > 0 ? `${summary.commandCount} command${summary.commandCount === 1 ? "" : "s"}` : null,
    summary.reviewedFiles.length > 0 ? `${summary.reviewedFiles.length} reviewed` : null,
    summary.changedFiles.length > 0 ? `${summary.changedFiles.length} changed` : null,
    summary.totalTokens > 0 ? `${summary.totalTokens.toLocaleString()} tokens` : null
  ].filter((fact): fact is string => Boolean(fact));
  if (processStages.length > 0 || processFacts.length > 0) {
    const latestProcessStage = processStages.at(-1) ?? null;
    blocks.push({
      id: "process-summary",
      kind: "process_summary",
      kicker: "Process",
      title: latestProcessStage ? latestProcessStage.title : "Visible process",
      detail: latestProcessStage?.summary ?? "Visible progress will appear here as the run reads, commands, edits, and resolves.",
      facts: processFacts,
      tone:
        status === "failed" || status === "error"
          ? "error"
          : summary.waitingForApproval || status === "waiting_user_input"
            ? "waiting"
            : processStages.some((stage) => stage.tone === "working")
              ? "working"
              : "neutral"
    });
  }

  const approvalStage = [...processStages].reverse().find((stage) => stage.id === "waiting_user_input" || stage.id === "approval") ?? null;
  if (approvalStage) {
    blocks.push({
      id: "approval-summary",
      kind: "approval_summary",
      kicker: "Approval",
      title: approvalStage.title,
      detail: approvalStage.summary,
      facts: [
        summary.waitingForApproval ? "Blocked now" : null,
        summary.approvalRequestCount > 0 ? `${summary.approvalRequestCount} check${summary.approvalRequestCount === 1 ? "" : "s"}` : null,
        approvalStage.stateLabel
      ].filter((fact): fact is string => Boolean(fact)),
      tone: approvalStage.tone
    });
  }

  for (const group of recordGroups) {
    blocks.push({
      id: `message-group-${group.id}`,
      kind: "message_group",
      kicker: group.title,
      title: group.detail,
      detail: group.items.length > 0 ? `${group.items.length} visible item${group.items.length === 1 ? "" : "s"} in this work stretch.` : group.detail,
      facts: group.facts,
      tone: visibleFlowToneForGroupKind(group.kind),
      group
    });
  }

  return blocks;
};

const buildRunSummary = (session: SessionRecord, events: EventRecord[]): ConversationRunSummary => {
  const commands = new Set<string>();
  const reviewedFiles = new Set<string>();
  const changedFiles = new Set<string>();
  let approvalRequestCount = 0;

  for (const event of events) {
    const payload = parseJson<Record<string, unknown>>(event.payload_json, {});
    if (event.type === "command_started" && typeof payload.command === "string") {
      commands.add(payload.command);
    }

    if (event.type === "file_touched" && typeof payload.path === "string") {
      if (payload.action === "read") {
        reviewedFiles.add(payload.path);
      } else {
        changedFiles.add(payload.path);
      }
    }

    if (event.type === "waiting_user_input" || event.type === "permission_requested") {
      approvalRequestCount += 1;
    }
  }

  return {
    commandCount: commands.size,
    commands: Array.from(commands),
    reviewedFiles: Array.from(reviewedFiles),
    changedFiles: Array.from(changedFiles),
    approvalRequestCount,
    waitingForApproval: events.some((event) => event.type === "waiting_user_input" || event.type === "permission_requested"),
    durationMs: deriveDurationMs(session, events),
    totalTokens: session.total_tokens,
    reasoningTokens: session.reasoning_tokens,
    estimatedCost: session.estimated_cost
  };
};

export const deriveRunStatus = (session: SessionRecord, events: EventRecord[]): string => {
  if (session.status !== "running") {
    return session.status;
  }

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    const payload = parseJson<Record<string, unknown>>(event.payload_json, {});

    if (event.type === "waiting_user_input" || event.type === "permission_requested") {
      return "waiting_user_input";
    }

    if (event.type === "error_occurred" || event.type === "session_stopped") {
      return "error";
    }

    if (event.type === "status_changed" && typeof payload.status === "string") {
      if (payload.status === "error") {
        continue;
      }
      return payload.status;
    }
  }

  return session.status;
};

const getRunContext = (
  agentId: string,
  agentWorkingDirectory: string,
  session: SessionRecord,
  fallbackComposer: ConversationComposerContext
): ConversationComposerContext => {
  const sessionMetadata = parseJson<StoredSessionMetadata>(session.metadata_json, {});
  return normalizeContext(
    agentId,
    sessionMetadata.composerContext ?? {
      ...fallbackComposer,
      workspaceRoot: session.working_directory,
      modelProfile: session.model_profile ?? fallbackComposer.modelProfile,
      approvalMode: fallbackComposer.approvalMode,
      mode: session.runtime_kind === "codex_cli_attached" ? "attached" : "local"
    },
    agentWorkingDirectory
  );
};

const summarizeThreadTitle = (runs: ConversationRunDigest[]): string => {
  const latestPrompt = runs.at(-1)?.initialPrompt;
  if (!latestPrompt) {
    return "New thread";
  }

  const compact = latestPrompt.replace(/\s+/g, " ").trim();
  return compact.length > 56 ? `${compact.slice(0, 55)}...` : compact;
};

const resolveThreadTitle = (client: DatabaseClient, agentId: string, threadId: string, runs: ConversationRunDigest[]): string =>
  getStoredThreadMetadata(client, agentId, threadId).customTitle?.trim() || summarizeThreadTitle(runs);

const threadBlockedRunCount = (runs: ConversationRunDigest[]): number =>
  runs.filter((run) => run.summary.waitingForApproval || run.status === "waiting_user_input").length;

const threadRecoveryRunCount = (runs: ConversationRunDigest[]): number =>
  runs.filter((run) => ["failed", "error", "stopped"].includes(run.status)).length;

const threadActiveRunCount = (runs: ConversationRunDigest[]): number =>
  runs.filter(
    (run) =>
      !["completed", "failed", "error", "stopped", "waiting_user_input"].includes(run.status) && !run.summary.waitingForApproval
  ).length;

const threadAttentionRank = (summary: Pick<ConversationThreadSummary, "blockedRunCount" | "recoveryRunCount" | "activeRunCount" | "latestStatus">): number => {
  if (summary.blockedRunCount > 0) {
    return 0;
  }

  if (summary.recoveryRunCount > 0) {
    return 1;
  }

  if (summary.activeRunCount > 0) {
    return 2;
  }

  if (summary.latestStatus === "completed") {
    return 3;
  }

  return 4;
};

const buildThreadSummaries = (
  client: DatabaseClient,
  agentId: string,
  groupedRuns: Map<string, ConversationRunDigest[]>,
  currentThreadId: string
): ConversationThreadSummary[] => {
  if (!groupedRuns.has(currentThreadId)) {
    groupedRuns.set(currentThreadId, []);
  }

  return Array.from(groupedRuns.entries())
    .map(([threadId, runs]) => {
      const latestRun = runs.at(-1) ?? null;
      const metadata = getStoredThreadMetadata(client, agentId, threadId);
      const blockedRunCount = threadBlockedRunCount(runs);
      const recoveryRunCount = threadRecoveryRunCount(runs);
      const activeRunCount = threadActiveRunCount(runs);
      return {
        id: threadId,
        title: resolveThreadTitle(client, agentId, threadId, runs),
        startedAt: runs[0]?.startedAt ?? null,
        lastUpdatedAt: latestRun?.endedAt ?? latestRun?.startedAt ?? null,
        runCount: runs.length,
        latestStatus: latestRun?.status ?? null,
        blockedRunCount,
        recoveryRunCount,
        activeRunCount,
        archived: Boolean(metadata.archived),
        archivedAt: metadata.archivedAt?.trim() || null
      };
    })
    .sort((left, right) => {
      if (left.archived !== right.archived) {
        return left.archived ? 1 : -1;
      }

      const attentionDiff = threadAttentionRank(left) - threadAttentionRank(right);
      if (attentionDiff !== 0) {
        return attentionDiff;
      }

      const rightTime = right.lastUpdatedAt ? Date.parse(right.lastUpdatedAt) : Number.NEGATIVE_INFINITY;
      const leftTime = left.lastUpdatedAt ? Date.parse(left.lastUpdatedAt) : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime;
    });
};

export const getConversationThread = (
  client: DatabaseClient,
  agentId: string,
  threadId?: string | null
): ConversationThreadView => {
  const agent = getAgent(client, agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }
  const profileDefaults = parseAgentProfileDefaults(agent.profile_snapshot_json);

  const selectedThreadId = resolveThreadId(client, agentId, threadId);
  const storedComposer = getStoredComposer(client, agentId, selectedThreadId, agent.working_directory);
  const fallbackComposer = normalizeContext(
    agentId,
    storedComposer ?? {
      workspaceId: "default",
      workspaceRoot: agent.working_directory,
      mode: agent.runtime_kind === "codex_cli_attached" ? "attached" : "local",
      branch: agent.current_branch ?? "master",
      profileId: profileDefaults.profileId ?? agent.profile_id,
      profileLabel: profileDefaults.profileLabel,
      modelProfile: profileDefaults.defaultModelProfile ?? "5.4 High",
      approvalMode: profileDefaults.defaultPermissionMode ?? agent.permission_mode
    },
    agent.working_directory
  );

  const sessions = listSessionsForAgent(client, agentId);
  const allEvents = listEvents(client, { agentId });
  const eventsBySessionId = new Map<string | null, EventRecord[]>();
  const runsByThread = new Map<string, ConversationRunDigest[]>();
  const selectedThreadRuns: ConversationRunView[] = [];

  for (const event of allEvents) {
    const items = eventsBySessionId.get(event.session_id) ?? [];
    items.push(event);
    eventsBySessionId.set(event.session_id, items);
  }

  for (const session of sessions) {
    const runEvents = eventsBySessionId.get(session.id) ?? [];
    const summary = buildRunSummary(session, runEvents);
    const status = deriveRunStatus(session, runEvents);
    const runThreadId = sessionThreadId(agentId, session);
    const threadRuns = runsByThread.get(runThreadId) ?? [];
    threadRuns.push({
      id: session.id,
      status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      initialPrompt: session.initial_prompt,
      summary
    });
    runsByThread.set(runThreadId, threadRuns);

    if (runThreadId !== selectedThreadId) {
      continue;
    }

    const entries = listMessagesBySession(client, session.id).map(entryViewFromMessageRecord);
    const process = mergeResponseTimelineEntries(
      runEvents.map(eventToTimelineEntry).filter((item): item is ConversationTimelineEntry => item !== null)
    );
    selectedThreadRuns.push({
      id: session.id,
      status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      initialPrompt: session.initial_prompt,
      context: getRunContext(agentId, agent.working_directory, session, fallbackComposer),
      entries,
      process,
      processStages: [],
      recordGroups: [],
      visibleFlowBlocks: [],
      summary
    });
  }

  const runs = selectedThreadRuns;
  const availableThreads = buildThreadSummaries(client, agentId, runsByThread, selectedThreadId);
  const selectedSummary = availableThreads.find((candidate) => candidate.id === selectedThreadId) ?? null;

  return {
    agentId,
    threadId: selectedThreadId,
    title: selectedSummary?.title ?? "New thread",
    composer: fallbackComposer,
    draft: getStoredDraft(client, agentId, selectedThreadId),
    runs,
    totalEntries: runs.reduce((count, run) => count + run.entries.length, 0),
    availableThreads
  };
};

const createUserEntryMetadata = (
  content: string,
  attachments: ConversationAttachmentRef[],
  composer: ConversationComposerContext
): StoredConversationEntryMetadata => ({
  entryKind: "user_prompt",
  messageKind: "user_prompt",
  blocks: [
    {
      type: "markdown",
      text: content
    },
    ...(attachments.length > 0 ? [{ type: "attachments", attachments } satisfies ConversationEntryBlock] : [])
  ],
  attachments,
  composerContext: composer
});

const createAssistantEntryMetadata = (composer: ConversationComposerContext): StoredConversationEntryMetadata => ({
  entryKind: "assistant_response",
  messageKind: "assistant_response",
  composerContext: composer
});

export const shouldStartFreshRun = (
  activeSession: SessionRecord | null,
  composer: ConversationComposerContext,
  thread: ConversationThreadView
): boolean => {
  if (!activeSession) {
    return true;
  }

  if (["completed", "stopped", "failed"].includes(activeSession.status)) {
    return true;
  }

  const activeRun = thread.runs.find((run) => run.id === activeSession.id);
  if (!activeRun) {
    return true;
  }

  return (
    activeRun.context.workspaceId !== composer.workspaceId ||
    activeRun.context.workspaceRoot !== composer.workspaceRoot ||
    activeRun.context.branch !== composer.branch ||
    (activeRun.context.profileId ?? null) !== (composer.profileId ?? null) ||
    activeRun.context.mode !== composer.mode ||
    activeRun.context.modelProfile !== composer.modelProfile ||
    activeRun.context.approvalMode !== composer.approvalMode
  );
};

export const sendConversationMessage = async (
  client: DatabaseClient,
  runtimeRegistry: RuntimeRegistry,
  permissionPolicy: PermissionPolicyEngine,
  input: ConversationSendMessageRequest,
  nextId: (prefix: string) => string
): Promise<void> => {
  const agent = getAgent(client, input.agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${input.agentId}`);
  }

  const threadId = resolveThreadId(client, input.agentId, input.threadId);
  const composer = saveConversationComposer(client, {
    agentId: input.agentId,
    threadId,
    composer: input.composer
  });
  const content = input.content.trim();
  const attachments = input.attachments ?? [];
  const runtimeMessage = `${content}${await runtimeAttachmentText(attachments)}`;
  const thread = getConversationThread(client, input.agentId, threadId);
  const latestSession =
    listSessionsForAgent(client, input.agentId).filter((session) => sessionThreadId(input.agentId, session) === threadId).at(-1) ??
    null;
  const localRuntimeKind: RuntimeKind = agent.runtime_kind === "mock" ? "mock" : "codex_cli";
  const shouldForceFreshCodexRun = localRuntimeKind === "codex_cli";

  if (composer.mode === "attached") {
    throw new Error("Attached Codex mode is currently read-only.");
  }

  if (shouldForceFreshCodexRun || shouldStartFreshRun(latestSession, composer, thread)) {
    const session = createSession(client, {
      id: nextId(`session-${agent.id}`),
      agentId: agent.id,
      runtimeKind: localRuntimeKind,
      status: "running",
      workingDirectory: composer.workspaceRoot,
      initialPrompt: content,
      modelProfile: composer.modelProfile,
      metadata: {
        composerContext: composer,
        threadId
      }
    });

    if (localRuntimeKind === "codex_cli") {
      try {
        const recordedMessages = recordSessionMessages(
          client,
          permissionPolicy,
          {
            sessionId: session.id,
            message: runtimeMessage,
            metadata: {
              userEntry: createUserEntryMetadata(content, attachments, composer),
              responseEntry: createAssistantEntryMetadata(composer)
            }
          },
          nextId
        );

        await runtimeRegistry.spawn(localRuntimeKind, {
          agentId: agent.id,
          sessionId: session.id,
          workingDirectory: composer.workspaceRoot,
          initialPrompt: runtimeMessage,
          inputMessageId: recordedMessages.userMessage.id,
          responseMessageId: recordedMessages.responseMessage.id,
          modelProfile: composer.modelProfile,
          permissionMode: composer.approvalMode,
          skillPromptContext: buildAgentRuntimeContext(client, agent.id, composer.profileId ?? null).skillPromptContext
        });
      } catch (error: unknown) {
        if (error instanceof PermissionRequiredError) {
          saveConversationDraft(client, { agentId: input.agentId, threadId, draft: content });
        }
        throw error;
      }
      saveConversationDraft(client, { agentId: input.agentId, threadId, draft: "" });
      return;
    }

    await runtimeRegistry.spawn(localRuntimeKind, {
      agentId: agent.id,
      sessionId: session.id,
      workingDirectory: composer.workspaceRoot,
      initialPrompt: null,
      inputMessageId: null,
      responseMessageId: null,
      modelProfile: composer.modelProfile,
      permissionMode: composer.approvalMode,
      skillPromptContext: buildAgentRuntimeContext(client, agent.id, composer.profileId ?? null).skillPromptContext
    });

    await routeSessionMessage(
      client,
      runtimeRegistry,
      permissionPolicy,
      {
        sessionId: session.id,
        message: runtimeMessage,
        metadata: {
          userEntry: createUserEntryMetadata(content, attachments, composer),
          responseEntry: createAssistantEntryMetadata(composer)
        }
      },
      nextId
    ).catch((error: unknown) => {
      if (error instanceof PermissionRequiredError) {
        saveConversationDraft(client, { agentId: input.agentId, threadId, draft: content });
      }
      throw error;
    });
    saveConversationDraft(client, { agentId: input.agentId, threadId, draft: "" });
    return;
  }

  await routeSessionMessage(
    client,
    runtimeRegistry,
    permissionPolicy,
    {
      sessionId: latestSession!.id,
      message: runtimeMessage,
      metadata: {
        userEntry: createUserEntryMetadata(content, attachments, composer),
        responseEntry: createAssistantEntryMetadata(composer)
      }
    },
    nextId
  ).catch((error: unknown) => {
    if (error instanceof PermissionRequiredError) {
      saveConversationDraft(client, { agentId: input.agentId, threadId, draft: content });
    }
    throw error;
  });
  saveConversationDraft(client, { agentId: input.agentId, threadId, draft: "" });
};

export const createConversationThread = (
  client: DatabaseClient,
  agentId: string,
  nextId: (prefix: string) => string
): ConversationThreadView => {
  const agent = getAgent(client, agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const previousThreadId = getStoredCurrentThreadId(client, agentId);
  const nextThreadId = nextId(`thread-${agent.id}`);
  const previousComposer = getStoredComposer(client, agentId, previousThreadId, agent.working_directory);

  setStoredCurrentThreadId(client, agentId, nextThreadId);
  if (previousComposer) {
    setSetting(client, composerKey(agentId, nextThreadId), previousComposer);
  }
  saveConversationDraft(client, { agentId, draft: "" });

  return getConversationThread(client, agentId);
};

export const switchConversationThread = (
  client: DatabaseClient,
  input: ConversationSwitchThreadRequest
): ConversationThreadView => {
  const thread = getConversationThread(client, input.agentId);
  if (!thread.availableThreads.some((candidate) => candidate.id === input.threadId)) {
    throw new Error(`Thread not found: ${input.threadId}`);
  }

  setStoredCurrentThreadId(client, input.agentId, input.threadId);
  return getConversationThread(client, input.agentId);
};

export const renameConversationThread = (
  client: DatabaseClient,
  input: ConversationRenameThreadRequest
): ConversationThreadView => {
  const thread = getConversationThread(client, input.agentId);
  if (!thread.availableThreads.some((candidate) => candidate.id === input.threadId)) {
    throw new Error(`Thread not found: ${input.threadId}`);
  }

  const metadata = getStoredThreadMetadata(client, input.agentId, input.threadId);
  setStoredThreadMetadata(client, input.agentId, input.threadId, {
    ...metadata,
    customTitle: input.title.trim()
  });
  return getConversationThread(client, input.agentId);
};

const nextActiveThreadId = (
  client: DatabaseClient,
  agentId: string,
  excludedThreadId: string
): string | null => {
  const thread = getConversationThread(client, agentId);
  return (
    thread.availableThreads.find((candidate) => candidate.id !== excludedThreadId && !candidate.archived)?.id ?? null
  );
};

export const archiveConversationThread = (
  client: DatabaseClient,
  input: ConversationSwitchThreadRequest,
  nextId: (prefix: string) => string
): ConversationThreadView => {
  const thread = getConversationThread(client, input.agentId);
  if (!thread.availableThreads.some((candidate) => candidate.id === input.threadId)) {
    throw new Error(`Thread not found: ${input.threadId}`);
  }

  const metadata = getStoredThreadMetadata(client, input.agentId, input.threadId);
  setStoredThreadMetadata(client, input.agentId, input.threadId, {
    ...metadata,
    archived: true,
    archivedAt: new Date().toISOString()
  });

  if (thread.threadId === input.threadId) {
    const fallbackThreadId = nextActiveThreadId(client, input.agentId, input.threadId);
    if (fallbackThreadId) {
      setStoredCurrentThreadId(client, input.agentId, fallbackThreadId);
      return getConversationThread(client, input.agentId);
    }

    return createConversationThread(client, input.agentId, nextId);
  }

  return getConversationThread(client, input.agentId);
};

export const restoreConversationThread = (
  client: DatabaseClient,
  input: ConversationSwitchThreadRequest
): ConversationThreadView => {
  const thread = getConversationThread(client, input.agentId);
  if (!thread.availableThreads.some((candidate) => candidate.id === input.threadId)) {
    throw new Error(`Thread not found: ${input.threadId}`);
  }

  const metadata = getStoredThreadMetadata(client, input.agentId, input.threadId);
  setStoredThreadMetadata(client, input.agentId, input.threadId, {
    ...metadata,
    archived: false,
    archivedAt: null
  });
  setStoredCurrentThreadId(client, input.agentId, input.threadId);
  return getConversationThread(client, input.agentId);
};
