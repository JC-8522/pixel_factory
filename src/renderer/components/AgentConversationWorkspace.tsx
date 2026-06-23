// @ts-nocheck
import * as reactExports from "react";
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useIntegrationStore } from "../stores/integrationStore";
import { useProfileStore } from "../stores/profileStore";

const jsxRuntimeExports = { Fragment: _Fragment, jsx: _jsx, jsxs: _jsxs };
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e3)}`;

type AgentConversationWorkspaceProps = {
  agent: any;
  onClose?: () => void;
  onDelete?: (agentId: string) => Promise<void> | void;
};

const EMPTY_PROMPT_SUGGESTIONS = [
  {
    id: "compare",
    label: "Gap review",
    title: "Compare this workspace to Codex and list the top gaps.",
    detail: "Focus on interaction flow, manager-visible process, and information density.",
    prompt: "Compare the current thread workspace to Codex chat. Focus on interaction flow, manager-visible process, and information density. List the top gaps and what should change first."
  },
  {
    id: "composer",
    label: "Composer pass",
    title: "Tighten the composer and context bar.",
    detail: "Improve attachments, context hierarchy, keyboard behavior, and the empty-state entry.",
    prompt: "Refactor the thread composer to feel closer to Codex. Improve the attachment flow, context bar hierarchy, keyboard behavior, and empty-state entry without regressing manager controls."
  },
  {
    id: "process",
    label: "Process pass",
    title: "Improve the visible process stream.",
    detail: "Keep private reasoning hidden, but improve runtime events, approvals, summaries, and recoveries.",
    prompt: "Review the current run presentation and improve the manager-visible process stream. Keep private chain-of-thought hidden, but make runtime events, approvals, summaries, and recoveries easier to follow."
  }
];
const formatTime = (value) => {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
};
const formatAttachmentSize = (size) => {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
const formatDuration = (durationMs) => {
  if (durationMs === null || durationMs === void 0) {
    return "--";
  }
  const totalSeconds = Math.max(0, Math.round(durationMs / 1e3));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};
const formatAttachmentLocation = (attachment) => {
  const location = attachment.filePath?.trim();
  return location && location.length > 0 ? location : null;
};
const attachmentBadgeLabel = (attachment) => {
  if (attachment.mimeType.startsWith("image/")) {
    return "IMG";
  }
  if (attachment.mimeType === "application/pdf") {
    return "PDF";
  }
  const extension = attachment.name.split(".").at(-1)?.trim();
  return extension ? extension.slice(0, 4).toUpperCase() : "FILE";
};
const attachmentPreviewSrc = (attachment) => {
  const draftPreview = attachment.previewUrl?.trim();
  if (draftPreview) {
    return draftPreview;
  }
  if (!attachment.mimeType.startsWith("image/")) {
    return null;
  }
  const location = formatAttachmentLocation(attachment);
  if (!location) {
    return null;
  }
  const normalized = location.replace(/\\/g, "/");
  if (/^file:\/\//i.test(normalized)) {
    return normalized;
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return encodeURI(`file:///${normalized}`);
  }
  if (normalized.startsWith("/")) {
    return encodeURI(`file://${normalized}`);
  }
  return null;
};
const summarizeInitialPrompt = (value) => {
  if (!value) {
    return "Start a new run in this thread.";
  }
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 140 ? `${compact.slice(0, 139)}...` : compact;
};
const summarizeThreadHeading = (value) => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "Thread";
  }
  return compact.length > 72 ? `${compact.slice(0, 71)}...` : compact;
};
const normalizeHeadingText = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();
const titleCaseWorkspaceLabel = (value) => value.split(" ").filter((part) => part.length > 0).map((part) => {
  if (/^[A-Z0-9]+$/.test(part)) {
    return part;
  }
  return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
}).join(" ");
const humanizeWorkspaceLabel = (value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Workspace";
  }
  const normalized = normalizeHeadingText(trimmed.replace(/[-_]+/g, " "));
  if (normalized === "default" || normalized === "default workspace") {
    return "Default Workspace";
  }
  if (/^[a-z0-9_-]+$/i.test(trimmed)) {
    return titleCaseWorkspaceLabel(trimmed.replace(/[-_]+/g, " "));
  }
  return trimmed;
};
const presentWorkspaceLabel = (workspace, fallbackId) => {
  const workspaceId = workspace?.id?.trim() || fallbackId?.trim() || "";
  const workspaceName = workspace?.name?.trim() || "";
  if (!workspaceName) {
    return humanizeWorkspaceLabel(workspaceId);
  }
  if (!workspaceId || normalizeHeadingText(workspaceName) !== normalizeHeadingText(workspaceId)) {
    return workspaceName;
  }
  return humanizeWorkspaceLabel(workspaceName);
};
const recordEntryKicker = (message) => {
  switch (message.kind) {
    case "user_prompt":
      return "Brief";
    case "assistant_response":
      return "Outcome";
    default:
      return "Run note";
  }
};
const recordEntryTitle = (message) => {
  switch (message.kind) {
    case "user_prompt":
      return "Run brief recorded for this pass";
    case "assistant_response":
      return message.streamState === "streaming" ? "Visible outcome is being prepared" : "Visible outcome published";
    default:
      return "Run note recorded in the visible work stream";
  }
};
const messageMetaSummary = (message) => {
  if (message.role === "agent" && message.streamState === "streaming") {
    return "Streaming outcome";
  }
  if (message.attachments.length > 0 && message.blocks.length > 0) {
    return `${message.attachments.length} attachment${message.attachments.length === 1 ? "" : "s"} / ${message.blocks.length} block${message.blocks.length === 1 ? "" : "s"}`;
  }
  if (message.attachments.length > 0) {
    return `${message.attachments.length} attachment${message.attachments.length === 1 ? "" : "s"} captured`;
  }
  return `${message.blocks.length} content block${message.blocks.length === 1 ? "" : "s"}`;
};
const messageRecordKind = (message) => {
  switch (message.kind) {
    case "user_prompt":
      return "Run brief";
    case "assistant_response":
      return "Visible outcome";
    default:
      return "Run note";
  }
};
const messageRecordState = (message) => {
  if (message.role === "agent" && message.streamState === "streaming") {
    return "Live";
  }
  if (message.attachments.length > 0) {
    return "Attached";
  }
  return null;
};
const shouldIncludeRunSummaryFact = (factId, run) => {
  switch (factId) {
    case "commands":
      return run.summary.commandCount > 0;
    case "reviewed":
      return run.summary.reviewedFiles.length > 0;
    case "changed":
      return run.summary.changedFiles.length > 0;
    case "approvals":
      return run.summary.waitingForApproval || run.summary.approvalRequestCount > 0;
    case "duration":
      return Boolean(run.summary.durationMs && run.summary.durationMs >= 1e3);
    case "tokens":
      return run.summary.totalTokens > 0;
    case "reasoning":
      return run.summary.reasoningTokens > 0;
    case "cost":
      return run.summary.estimatedCost !== null;
    default:
      return true;
  }
};
const summaryFactCoveredByCollection = (factId, run) => {
  switch (factId) {
    case "commands":
      return run.summary.commands.length > 0;
    case "reviewed":
      return run.summary.reviewedFiles.length > 0;
    case "changed":
      return run.summary.changedFiles.length > 0;
    default:
      return false;
  }
};
const runRecordStamp = (run) => {
  if (run.entries.length === 0) {
    const latestProcessItem = run.process.at(-1) ?? null;
    if (run.summary.waitingForApproval || run.status === "waiting_user_input") {
      return latestProcessItem?.createdAt ? `Approval pending / latest ${formatTime(latestProcessItem.createdAt)}` : "Approval pending";
    }
    if (latestProcessItem?.createdAt) {
      return `${run.process.length} process update${run.process.length === 1 ? "" : "s"} / latest ${formatTime(latestProcessItem.createdAt)}`;
    }
    return "No visible work items yet";
  }
  const latestMessage = run.entries.at(-1);
  if (!latestMessage?.createdAt) {
    return `${run.entries.length} visible entr${run.entries.length === 1 ? "y" : "ies"}`;
  }
  return `${run.entries.length} visible entr${run.entries.length === 1 ? "y" : "ies"} / latest ${formatTime(latestMessage.createdAt)}`;
};
const buildRecordTrailFacts = (run) => {
  const briefCount = run.entries.filter((message) => message.kind === "user_prompt").length;
  const deliveryCount = run.entries.filter((message) => message.kind === "assistant_response").length;
  const systemCount = run.entries.filter((message) => message.kind === "system_note").length;
  const attachmentCount = run.entries.reduce((sum, message) => sum + message.attachments.length, 0);
  const streamingCount = run.entries.filter(
    (message) => message.role === "agent" && message.streamState === "streaming"
  ).length;
  const facts = [
    briefCount > 0 ? `${briefCount} brief${briefCount === 1 ? "" : "s"}` : null,
    deliveryCount > 0 ? `${deliveryCount} visible response${deliveryCount === 1 ? "" : "s"}` : null,
    systemCount > 0 ? `${systemCount} system note${systemCount === 1 ? "" : "s"}` : null,
    attachmentCount > 0 ? `${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}` : null,
    streamingCount > 0 ? `${streamingCount} streaming` : null
  ];
  return facts.filter((fact) => Boolean(fact));
};
const recordTrailGroupTitle = (kind) => {
  switch (kind) {
    case "user_prompt":
      return "Run brief";
    case "assistant_response":
      return "Visible outcome";
    default:
      return "Run notes";
  }
};
const recordTrailGroupDetail = (kind, count) => {
  switch (kind) {
    case "user_prompt":
      return `${count} brief${count === 1 ? "" : "s"} captured in this stretch of the run.`;
    case "assistant_response":
      return `${count} visible response${count === 1 ? "" : "s"} captured in this stretch of the run.`;
    default:
      return `${count} system note${count === 1 ? "" : "s"} captured in this stretch of the run.`;
  }
};
const recordTrailGroupFacts = (items) => {
  const attachments = items.reduce((sum, item) => sum + item.message.attachments.length, 0);
  const blocks = items.reduce((sum, item) => sum + item.message.blocks.length, 0);
  const streaming = items.filter(
    (item) => item.message.role === "agent" && item.message.streamState === "streaming"
  ).length;
  return [
    `${blocks} block${blocks === 1 ? "" : "s"}`,
    attachments > 0 ? `${attachments} attachment${attachments === 1 ? "" : "s"}` : null,
    streaming > 0 ? `${streaming} streaming` : null
  ].filter((fact) => Boolean(fact));
};
const buildRecordTrailGroups = (messages) => {
  const groups = [];
  messages.forEach((message, index) => {
    const existing = groups.at(-1);
    if (existing && existing.kind === message.kind) {
      existing.items.push({ message, index });
      existing.detail = recordTrailGroupDetail(existing.kind, existing.items.length);
      existing.facts = recordTrailGroupFacts(existing.items);
      return;
    }
    const items = [{ message, index }];
    groups.push({
      id: `${message.kind}-${index}`,
      kind: message.kind,
      title: recordTrailGroupTitle(message.kind),
      detail: recordTrailGroupDetail(message.kind, 1),
      facts: recordTrailGroupFacts(items),
      items
    });
  });
  return groups;
};
const runStatusLabel = (status) => {
  switch (status) {
    case "thinking":
      return "Thinking";
    case "reading_files":
      return "Reviewing context";
    case "running_command":
      return "Workspace action";
    case "editing_files":
      return "Workspace changes";
    case "waiting_user_input":
      return "Waiting for approval";
    case "completed":
      return "Completed";
    case "stopped":
      return "Stopped";
    case "failed":
      return "Failed";
    case "error":
      return "Error";
    case "running":
      return "Running";
    default:
      return status.replace(/_/g, " ");
  }
};
const runStatusTone = (status) => {
  switch (status) {
    case "thinking":
    case "reading_files":
    case "running_command":
    case "editing_files":
    case "running":
      return "working";
    case "waiting_user_input":
      return "waiting";
    case "error":
    case "failed":
    case "stopped":
      return "error";
    default:
      return "neutral";
  }
};
const isRunTerminal = (run) => ["completed", "stopped", "failed", "error"].includes(run.status);
const isRunRecoveryState = (run) => ["stopped", "failed", "error"].includes(run.status);
const threadAttentionLabel = (item) => {
  if (item.blockedRunCount > 0) {
    return item.blockedRunCount === 1 ? "Blocked" : `${item.blockedRunCount} blocked runs`;
  }
  if (item.recoveryRunCount > 0) {
    return item.recoveryRunCount === 1 ? "Recovery" : `${item.recoveryRunCount} recovery runs`;
  }
  if (item.activeRunCount > 0) {
    return item.activeRunCount === 1 ? "Live" : `${item.activeRunCount} live runs`;
  }
  if (item.latestStatus === "completed") {
    return "Resolved";
  }
  if (item.latestStatus === "stopped") {
    return "Recovery";
  }
  return null;
};
const threadCardSummary = (item, isActive, attention) => {
  if (item.archived) {
    return "Archived. Restore it to keep working from this thread.";
  }
  if (attention && isActive) {
    return `${attention}. This thread is currently attached to the workspace.`;
  }
  if (attention) {
    return attention;
  }
  if (isActive) {
    return "Attached thread. Ready for the next brief.";
  }
  if (item.runCount === 0) {
    return "No runs yet. Start the first brief here.";
  }
  if (item.blockedRunCount > 0) {
    return item.blockedRunCount === 1 ? "Work is blocked until approval is resolved." : `${item.blockedRunCount} runs are blocked until approval is resolved.`;
  }
  if (item.recoveryRunCount > 0) {
    return item.recoveryRunCount === 1 ? "Needs a retry, continue, or brief reuse before the thread moves forward." : `${item.recoveryRunCount} runs need recovery before the thread moves forward.`;
  }
  if (item.activeRunCount > 0) {
    return item.activeRunCount === 1 ? "Work is still moving in this thread." : `${item.activeRunCount} live runs are still moving in this thread.`;
  }
  if (item.latestStatus === "completed") {
    return "Resolved. Ready if you want another pass.";
  }
  return "Ready for the next brief.";
};
const buildThreadCardFacts = (item, isActive, attention) => {
  const facts = [
    `${item.runCount} run${item.runCount === 1 ? "" : "s"}`,
    item.lastUpdatedAt ? `Updated ${formatTime(item.lastUpdatedAt)}` : "No runs yet"
  ];
  if (attention) {
    facts.push(attention);
  } else if (isActive) {
    facts.push("Attached thread");
  } else if (item.archived) {
    facts.push(item.archivedAt ? `Archived ${formatTime(item.archivedAt)}` : "Archived");
  }
  return facts;
};
const threadAttentionPriority = (item) => {
  if (item.blockedRunCount > 0) {
    return 0;
  }
  if (item.recoveryRunCount > 0) {
    return 1;
  }
  if (item.activeRunCount > 0) {
    return 2;
  }
  if (item.latestStatus === "completed") {
    return 3;
  }
  return 4;
};
const sortThreadRail = (threads, currentThreadId) => [...threads].sort((left, right) => {
  if (left.archived !== right.archived) {
    return left.archived ? 1 : -1;
  }
  const priorityDiff = threadAttentionPriority(left) - threadAttentionPriority(right);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  const leftActive = left.id === currentThreadId;
  const rightActive = right.id === currentThreadId;
  if (leftActive !== rightActive) {
    return leftActive ? -1 : 1;
  }
  const rightTime = right.lastUpdatedAt ? Date.parse(right.lastUpdatedAt) : Number.NEGATIVE_INFINITY;
  const leftTime = left.lastUpdatedAt ? Date.parse(left.lastUpdatedAt) : Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
});
const selectFeaturedRunId = (runs, permissionRequest) => {
  const latestFirst = [...runs].reverse();
  return latestFirst.find((run) => run.id === permissionRequest?.sessionId)?.id ?? latestFirst.find((run) => run.summary.waitingForApproval || run.status === "waiting_user_input")?.id ?? latestFirst.find((run) => run.status === "failed" || run.status === "error")?.id ?? latestFirst.find((run) => !isRunTerminal(run))?.id ?? latestFirst[0]?.id ?? null;
};
const runAttentionKind = (run, inlineApprovalRequest, isFeaturedRun) => {
  if (inlineApprovalRequest || run.summary.waitingForApproval || run.status === "waiting_user_input") {
    return "approval";
  }
  if (isRunRecoveryState(run)) {
    return "failure";
  }
  if (isFeaturedRun && !isRunTerminal(run)) {
    return "live";
  }
  return "none";
};
const runAttentionLabel = (kind, isFeaturedRun) => {
  const labels = [];
  if (isFeaturedRun) {
    labels.push("Focus");
  }
  if (kind === "approval") {
    labels.push("Blocked");
  } else if (kind === "failure") {
    labels.push("Recovery");
  } else if (kind === "live") {
    labels.push("Live");
  }
  return labels;
};
const buildRunMapFacts = (run) => [
  `${run.summary.commandCount} workspace action${run.summary.commandCount === 1 ? "" : "s"}`,
  `${run.summary.changedFiles.length} changed file${run.summary.changedFiles.length === 1 ? "" : "s"}`,
  run.summary.waitingForApproval ? "Blocked by approval" : run.summary.approvalRequestCount > 0 ? `${run.summary.approvalRequestCount} approval${run.summary.approvalRequestCount === 1 ? "" : "s"} handled` : "No approvals"
];
const sortRunRail = (runs, permissionRequest, featuredRunId) => [...runs].sort((left, right) => {
  const leftFeatured = left.id === featuredRunId;
  const rightFeatured = right.id === featuredRunId;
  if (leftFeatured !== rightFeatured) {
    return leftFeatured ? -1 : 1;
  }
  const leftAttention = runAttentionKind(
    left,
    permissionRequest?.sessionId === left.id ? permissionRequest : null,
    leftFeatured
  );
  const rightAttention = runAttentionKind(
    right,
    permissionRequest?.sessionId === right.id ? permissionRequest : null,
    rightFeatured
  );
  const rank = {
    approval: 0,
    failure: 1,
    live: 2,
    none: 3
  };
  if (rank[leftAttention] !== rank[rightAttention]) {
    return rank[leftAttention] - rank[rightAttention];
  }
  const rightTime = Date.parse(right.startedAt);
  const leftTime = Date.parse(left.startedAt);
  return rightTime - leftTime;
});
const buildRunAttentionSummary = (run, inlineApprovalRequest, isFeaturedRun) => {
  const kind = runAttentionKind(run, inlineApprovalRequest, isFeaturedRun);
  if (kind === "approval") {
    return {
      kind,
      kicker: "Blocked",
      title: "Waiting on approval.",
      detail: inlineApprovalRequest?.reasons.join(" - ") || "Approve or deny the blocked action to continue.",
      facts: [
        inlineApprovalRequest ? riskLevelLabel(inlineApprovalRequest.riskLevel) : null,
        inlineApprovalRequest ? summarizeRiskKinds(inlineApprovalRequest.riskKinds) : null,
        `${run.summary.approvalRequestCount} approval check${run.summary.approvalRequestCount === 1 ? "" : "s"}`,
        run.summary.commandCount > 0 ? `${run.summary.commandCount} workspace action${run.summary.commandCount === 1 ? "" : "s"}` : null
      ].filter((fact) => Boolean(fact))
    };
  }
  if (kind === "failure") {
    return {
      kind,
      kicker: "Recovery",
      title: run.status === "stopped" ? "Run stopped early." : "Recovery needed.",
      detail: summarizeLatestAgentReply(run) ?? summarizeTimelineEntry(run) ?? "Retry, continue, or reopen the brief from this thread state.",
      facts: [
        `${run.summary.commandCount} workspace action${run.summary.commandCount === 1 ? "" : "s"}`,
        `${run.summary.changedFiles.length} edit${run.summary.changedFiles.length === 1 ? "" : "s"}`,
        formatDuration(run.summary.durationMs)
      ]
    };
  }
  if (kind === "live") {
    return {
      kind,
      kicker: "Live",
      title: "Live run.",
      detail: summarizeTimelineEntry(run),
      facts: [
        `${run.summary.commandCount} workspace action${run.summary.commandCount === 1 ? "" : "s"}`,
        `${run.summary.reviewedFiles.length} context review${run.summary.reviewedFiles.length === 1 ? "" : "s"}`,
        `${run.summary.totalTokens.toLocaleString()} tokens`
      ]
    };
  }
  return null;
};
const shouldAutoExpandProcessDetail = (run, inlineApprovalRequest, isFeaturedRun) => {
  const kind = runAttentionKind(run, inlineApprovalRequest, isFeaturedRun);
  if (kind === "failure") {
    return true;
  }
  if (kind === "approval") {
    return false;
  }
  return kind === "live" && run.process.length > 0 && run.entries.length === 0;
};
const processCollapsedHint = (run, hasProcessGroups, inlineApprovalRequest, isFeaturedRun) => {
  const kind = runAttentionKind(run, inlineApprovalRequest, isFeaturedRun);
  if (kind === "approval") {
    return "Open timeline when you need the full approval trail.";
  }
  if (kind === "failure") {
    return "Recovery runs open this layer automatically the first time so the failure path stays visible.";
  }
  if (kind === "live" && run.process.length > 0 && run.entries.length === 0) {
    return "Active runs without visible entries open this layer automatically so the live work trail stays visible.";
  }
  if (hasProcessGroups) {
    return "Open timeline when you need the full process trail.";
  }
  return "Open timeline for the full process stream.";
};
const buildAttachmentFromFile = (file) => ({
  id: createId("attachment"),
  name: file.name,
  mimeType: file.type || "application/octet-stream",
  size: file.size,
  source: "local_draft",
  filePath: (file.path || file.webkitRelativePath || "").trim() || null,
  previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null
});
const splitMarkdownSegments = (text) => {
  const segments = [];
  const pattern = /```([\w.-]+)?\r?\n([\s\S]*?)```/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const matched = match[0];
    const index = match.index ?? 0;
    const prose = text.slice(cursor, index);
    if (prose.trim().length > 0) {
      segments.push({ type: "prose", content: prose });
    }
    segments.push({
      type: "code",
      language: match[1]?.trim() || null,
      content: match[2].replace(/\s+$/, "")
    });
    cursor = index + matched.length;
  }
  const trailing = text.slice(cursor);
  if (trailing.trim().length > 0 || segments.length === 0) {
    segments.push({ type: "prose", content: trailing });
  }
  return segments;
};
const renderInlineMarkdown = (text, keyBase) => {
  const nodes = [];
  const pattern = /`([^`\n]+)`/g;
  let cursor = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }
    nodes.push(
      /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "conversation-inline-code", children: match[1] }, `${keyBase}-code-${index}`)
    );
    cursor = start + match[0].length;
    index += 1;
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes.length > 0 ? nodes : [text];
};
const renderMarkdownProse = (content, keyBase) => content.split(/\n{2,}/).map((section) => section.trim()).filter((section) => section.length > 0).map((section, index) => {
  const lines = section.split(/\r?\n/);
  if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "conversation-markdown-list", children: lines.map((line, lineIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: renderInlineMarkdown(line.replace(/^\s*[-*]\s+/, ""), `${keyBase}-list-${index}-${lineIndex}`) }, `${keyBase}-list-${index}-${lineIndex}`)) }, `${keyBase}-list-${index}`);
  }
  if (lines.every((line) => /^\s*\d+\.\s+/.test(line))) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("ol", { className: "conversation-markdown-list conversation-markdown-list-ordered", children: lines.map((line, lineIndex) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: renderInlineMarkdown(line.replace(/^\s*\d+\.\s+/, ""), `${keyBase}-ordered-${index}-${lineIndex}`) }, `${keyBase}-ordered-${index}-${lineIndex}`)) }, `${keyBase}-ordered-${index}`);
  }
  if (lines.every((line) => /^\s*>\s?/.test(line))) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("blockquote", { className: "conversation-markdown-quote", children: lines.map((line) => line.replace(/^\s*>\s?/, "")).join("\n") }, `${keyBase}-quote-${index}`);
  }
  const headingMatch = /^(#{1,3})\s+(.+)$/.exec(lines[0] ?? "");
  if (headingMatch && lines.length === 1) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: `conversation-markdown-heading conversation-markdown-heading-${headingMatch[1].length}`, children: renderInlineMarkdown(headingMatch[2], `${keyBase}-heading-${index}`) }, `${keyBase}-heading-${index}`);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-markdown-paragraph", children: renderInlineMarkdown(section, `${keyBase}-paragraph-${index}`) }, `${keyBase}-paragraph-${index}`);
});
const renderMarkdownContent = (text, keyBase) => splitMarkdownSegments(text).flatMap((segment, index) => {
  if (segment.type === "code") {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-code-block", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-code-block-header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: segment.language ?? "text" }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: segment.content }) })
    ] }, `${keyBase}-codeblock-${index}`);
  }
  return renderMarkdownProse(segment.content, `${keyBase}-prose-${index}`);
});
const parseAgentProfileSnapshot = (agent) => {
  try {
    const snapshot = JSON.parse(agent.profile_snapshot_json ?? "{}");
    return {
      profileId: typeof snapshot.profileId === "string" && snapshot.profileId.trim().length > 0 ? snapshot.profileId.trim() : agent.profile_id ?? null,
      profileLabel: typeof snapshot.name === "string" && snapshot.name.trim().length > 0 ? snapshot.name.trim() : null,
      defaultModelProfile: typeof snapshot.defaultModelProfile === "string" && snapshot.defaultModelProfile.trim().length > 0 ? snapshot.defaultModelProfile.trim() : null,
      defaultPermissionMode: typeof snapshot.defaultPermissionMode === "string" && snapshot.defaultPermissionMode.trim().length > 0 ? snapshot.defaultPermissionMode.trim() : null
    };
  } catch {
    return {
      profileId: agent.profile_id ?? null,
      profileLabel: null,
      defaultModelProfile: null,
      defaultPermissionMode: null
    };
  }
};
const normalizeComposer = (agent, workspaces, activeWorkspaceId, base) => {
  const activeWorkspace = workspaces.find((workspace) => workspace.id === (base?.workspaceId ?? activeWorkspaceId)) ?? workspaces[0] ?? null;
  const profileSnapshot = parseAgentProfileSnapshot(agent);
  const hasProfileId = Boolean(base) && Object.prototype.hasOwnProperty.call(base, "profileId");
  const hasProfileLabel = Boolean(base) && Object.prototype.hasOwnProperty.call(base, "profileLabel");
  return {
    workspaceId: base?.workspaceId ?? activeWorkspace?.id ?? activeWorkspaceId ?? "default",
    workspaceRoot: base?.workspaceRoot ?? activeWorkspace?.rootPath ?? agent.working_directory,
    mode: base?.mode === "attached" ? "attached" : "local",
    branch: base?.branch?.trim() || agent.current_branch || "master",
    profileId: hasProfileId ? base?.profileId?.trim() || null : profileSnapshot.profileId,
    profileLabel: hasProfileLabel ? base?.profileLabel?.trim() || null : profileSnapshot.profileLabel,
    modelProfile: base?.modelProfile?.trim() || profileSnapshot.defaultModelProfile || "5.4 High",
    approvalMode: base?.approvalMode?.trim() || profileSnapshot.defaultPermissionMode || agent.permission_mode
  };
};
const profileLabel = (composer) => composer.profileLabel?.trim() || null;
const blocksContainVisibleText = (blocks) => blocks.some((block) => block.type === "markdown" && block.text.trim().length > 0);
const summarizeTimelineItem = (item) => {
  const leadFact = item.facts[0] ?? null;
  if (item.detail) {
    return `${item.title}: ${item.detail}`;
  }
  if (leadFact) {
    return `${item.title}: ${leadFact}`;
  }
  return item.title;
};
const summarizeTimelineEntry = (run) => {
  const latestItem = run.process.at(-1);
  if (!latestItem) {
    return "No visible activity yet";
  }
  return summarizeTimelineItem(latestItem);
};
const compactTimelinePath = (value) => {
  if (!value) {
    return null;
  }
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) ?? value;
};
const compactTimelineCommand = (value) => {
  if (!value) {
    return null;
  }
  const compact = value.replace(/\s+/g, " ").trim().replace(
    /[A-Za-z]:[\\/](?:[^\\/\s"]+[\\/]){2,}[^\\/\s"]+/g,
    (match) => {
      const normalized = match.replace(/\\/g, "/");
      const parts = normalized.split("/").filter(Boolean);
      if (parts.length <= 3) {
        return normalized;
      }
      return `.../${parts.slice(-2).join("/")}`;
    }
  );
  return compact.length > 72 ? `${compact.slice(0, 71)}...` : compact;
};
const timelineFileActionLabel = (value) => {
  switch (value) {
    case "read":
      return "Read";
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "deleted":
      return "Deleted";
    default:
      return null;
  }
};
const timelineApprovalDecisionLabel = (value) => {
  switch (value) {
    case "allow_once":
      return "Approved once";
    case "allow_project":
      return "Approved for project";
    case "deny":
      return "Denied";
    default:
      return null;
  }
};
const processStageId = (item) => {
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
const processStageTitle = (stageId) => {
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
const processStageKicker = (stageId) => {
  switch (stageId) {
    case "session":
      return "Thread state";
    case "thinking":
      return "Visible reasoning";
    case "reading_files":
      return "Context review";
    case "running_command":
      return "Workspace action";
    case "editing_files":
      return "Workspace changes";
    case "waiting_user_input":
      return "Approval gate";
    case "completed":
      return "Resolved";
    case "stopped":
      return "Stopped";
    case "error":
      return "Recovery signal";
    case "progress":
      return "Thread state";
    case "commands":
      return "Workspace actions";
    case "files":
      return "Workspace files";
    case "approval":
      return "Approval gate";
    case "response":
      return "Outcome";
    case "usage":
      return "Budget";
    case "issues":
      return "Recovery signal";
    default:
      return "Activity";
  }
};
const processStageStateLabel = (stage) => {
  if (stage.id === "completed") {
    return "Resolved";
  }
  if (stage.id === "stopped") {
    return "Stopped early";
  }
  if (stage.tone === "error") {
    return stage.id === "error" || stage.id === "issues" ? "Blocking issue" : "Recovery";
  }
  if (stage.id === "waiting_user_input" || stage.tone === "waiting") {
    return "Waiting on approval";
  }
  const latest = stage.items.at(-1) ?? null;
  if (stage.id === "progress" && latest?.title === "Run resolved") {
    return "Resolved";
  }
  if (stage.id === "progress" && latest?.title === "Run stopped early") {
    return "Stopped early";
  }
  if (stage.tone === "working") {
    return "In motion";
  }
  return "Recorded";
};
const strongerTone = (left, right) => {
  const weight = {
    neutral: 0,
    working: 1,
    waiting: 2,
    error: 3
  };
  return weight[right] > weight[left] ? right : left;
};
const summarizeProcessStage = (stageId, title, items) => {
  const latest = items.at(-1) ?? null;
  if (!latest) {
    return `${title} stage recorded.`;
  }
  if (stageId === "commands") {
    const startedCount = items.filter((item) => item.eventType === "command_started").length;
    const completed = items.filter((item) => item.eventType === "command_completed");
    const failedCount = completed.filter((item) => item.tone === "error").length;
    const latestCommand = latest.command ?? latest.detail ?? completed.at(-1)?.command ?? completed.at(-1)?.detail ?? null;
    const commandLead = startedCount > 0 ? `${startedCount} workspace action${startedCount === 1 ? "" : "s"} run` : `${items.length} workspace action updates`;
    if (failedCount > 0) {
      return latestCommand ? `${commandLead}; latest issue on ${latestCommand}` : `${commandLead}; ${failedCount} need recovery`;
    }
    return latestCommand ? `${commandLead}; latest action: ${latestCommand}` : commandLead;
  }
  if (stageId === "running_command") {
    const startedCount = items.filter((item) => item.eventType === "command_started").length;
    const completed = items.filter((item) => item.eventType === "command_completed");
    const failedCount = completed.filter((item) => item.tone === "error").length;
    const latestCommand = latest.command ?? latest.detail ?? completed.at(-1)?.command ?? completed.at(-1)?.detail ?? null;
    if (startedCount === 0 && completed.length === 0) {
      return latest.title === "Running a workspace action" ? "The run entered workspace execution and is preparing the next action." : latest.title;
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
      return latestPath ? `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"} and changed ${changed}; latest file: ${latestPath}` : `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"} and changed ${changed}`;
    }
    if (reviewed > 0) {
      return latestPath ? `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"}; latest file: ${latestPath}` : `Reviewed ${reviewed} file${reviewed === 1 ? "" : "s"}`;
    }
    return latestPath ? `Prepared ${changed} file change${changed === 1 ? "" : "s"}; latest file: ${latestPath}` : `Prepared ${changed} file change${changed === 1 ? "" : "s"}`;
  }
  if (stageId === "waiting_user_input" || stageId === "approval") {
    const waiting = items.some((item) => item.tone === "waiting");
    const denied = items.some((item) => item.approvalDecision === "deny" || item.eventType === "permission_denied");
    const approved = items.filter((item) => item.approvalDecision === "allow_once" || item.approvalDecision === "allow_project" || item.eventType === "permission_decided").length;
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
    return `${items.length} visible outcome update${items.length === 1 ? "" : "s"} streamed into the run flow.`;
  }
  if (stageId === "usage") {
    if (latest.usage) {
      const usageFacts = [
        latest.usage.totalTokens > 0 ? `${latest.usage.totalTokens.toLocaleString()} tokens` : null,
        latest.usage.reasoningTokens > 0 ? `${latest.usage.reasoningTokens.toLocaleString()} reasoning` : null,
        latest.usage.estimatedCost !== null ? `$${latest.usage.estimatedCost.toFixed(4)} est.` : null
      ].filter((value) => Boolean(value));
      return usageFacts.length > 0 ? usageFacts.join(" - ") : "Run usage was updated.";
    }
    return latest.facts.length > 0 ? latest.facts.join(" - ") : "Run usage was updated.";
  }
  if (stageId === "issues") {
    return latest.detail ? latest.detail : `${items.length} visible issue${items.length === 1 ? "" : "s"} recorded.`;
  }
  if (stageId === "error") {
    return latest.detail ? latest.detail : `${items.length} blocking issue${items.length === 1 ? "" : "s"} recorded.`;
  }
  if (stageId === "thinking") {
    return items.length > 1 ? "Planning checkpoints were recorded before the next visible step." : "The run paused to plan the next visible step.";
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
const compactTimelineTitle = (item) => {
  switch (item.eventType) {
    case "session_started":
      return "Opened run";
    case "session_completed":
      return "Run resolved";
    case "session_stopped":
      return "Run stopped";
    case "command_started":
      return "Ran command";
    case "command_completed":
      return item.exitCode !== null && item.exitCode !== 0 ? "Command failed" : "Command finished";
    case "file_touched":
      switch (item.fileAction) {
        case "read":
          return "Reviewed file";
        case "created":
          return "Created file";
        case "deleted":
          return "Removed file";
        default:
          return "Updated file";
      }
    case "message_chunk":
      return "Shared visible update";
    case "token_usage_recorded":
      return "Recorded usage";
    case "status_changed":
      switch (item.activityKind) {
        case "thinking":
          return "Thinking";
        case "reading_files":
          return "Thinking";
        case "running_command":
          return "Thinking";
        case "editing_files":
          return "Thinking";
        case "waiting_user_input":
          return "Waiting on approval";
        default:
          return item.title;
      }
    default:
      return item.title;
  }
};
const compactChatProcessCopy = (item) => {
  switch (item.eventType) {
    case "session_started":
      return "Opened this run.";
    case "session_completed":
      return "Run resolved and handed back a visible result.";
    case "session_stopped":
      return "Run stopped before the task fully finished.";
    case "command_started": {
      const command = compactTimelineCommand(item.command);
      return command ? `Started \`${command}\`.` : "Started a workspace action.";
    }
    case "command_completed": {
      const command = compactTimelineCommand(item.command);
      if (command) {
        return item.exitCode !== null && item.exitCode !== 0 ? `A workspace action failed while running \`${command}\`.` : `Ran \`${command}\`.`;
      }
      return item.exitCode !== null && item.exitCode !== 0 ? "A workspace action failed." : "Finished a workspace action.";
    }
    case "file_touched": {
      const fileName = compactTimelinePath(item.filePath);
      if (fileName) {
        switch (item.fileAction) {
          case "read":
            return `Reviewed \`${fileName}\`.`;
          case "created":
            return `Created \`${fileName}\`.`;
          case "deleted":
            return `Removed \`${fileName}\`.`;
          default:
            return `Updated \`${fileName}\`.`;
        }
      }
      switch (item.fileAction) {
        case "read":
          return "Reviewed a workspace file.";
        case "created":
          return "Created a workspace file.";
        case "deleted":
          return "Removed a workspace file.";
        default:
          return "Updated a workspace file.";
      }
    }
    case "message_chunk":
      return item.detail ?? "Shared a visible progress update in this run.";
    case "token_usage_recorded":
      return "Updated the run token and cost totals.";
    case "status_changed":
      switch (item.activityKind) {
        case "thinking":
          return "Thinking.";
        case "reading_files":
          return "Thinking.";
        case "running_command":
          return "Thinking.";
        case "editing_files":
          return "Thinking.";
        case "waiting_user_input":
          return "Waiting on approval.";
        default:
          return item.title;
      }
    case "permission_requested":
      return "Opened approval review.";
    case "permission_decided":
      return timelineApprovalDecisionLabel(item.approvalDecision) ? `${timelineApprovalDecisionLabel(item.approvalDecision)}.` : "Recorded approval decision.";
    case "permission_denied":
      return "Approval was denied.";
    case "waiting_user_input":
      return "Waiting on input before continuing.";
    case "error_occurred":
      return item.detail ?? "A visible issue was recorded in this run.";
    default:
      return summarizeTimelineItem(item);
  }
};
const summarizeLatestAgentReply = (run) => {
  const latestAgentMessage = [...run.entries].reverse().find((message) => message.role === "agent") ?? null;
  if (!latestAgentMessage) {
    return null;
  }
  const text = latestAgentMessage.blocks.filter((block) => block.type === "markdown").map((block) => block.text.trim()).find((block) => block.length > 0);
  if (!text) {
    return latestAgentMessage.attachments.length > 0 ? "Shared an attachment-based outcome record." : "Visible outcome is still forming.";
  }
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 220 ? `${compact.slice(0, 219)}...` : compact;
};
const attachmentsToDrafts = (attachments) => attachments.map((attachment) => ({
  ...attachment,
  previewUrl: null
}));
const findRunPromptMessage = (run) => [...run.entries].reverse().find((message) => message.kind === "user_prompt") ?? null;
const buildContinuePrompt = (run) => {
  const resumeLead = run.status === "failed" || run.status === "error" ? "The previous run ended with an error. Continue from the current thread state, avoid repeating finished work, and resolve what is still blocking progress." : run.status === "stopped" ? "The previous run was stopped. Continue from the current thread state and finish the unfinished work without repeating completed steps." : "Continue from the current thread state and take the next most useful step without repeating completed work.";
  const originalBrief = run.initialPrompt?.trim();
  if (!originalBrief) {
    return resumeLead;
  }
  return `${resumeLead}

Original brief:
${originalBrief}`;
};
const formatRunRange = (run) => `${formatTime(run.startedAt)}${run.endedAt ? ` to ${formatTime(run.endedAt)}` : " to live"}`;
const modeLabel = (mode) => mode === "attached" ? "Attached" : "Local";
const approvalLabel = (approvalMode) => {
  switch (approvalMode) {
    case "workspace_write":
      return "Ask";
    case "on_request":
      return "Request";
    case "external":
      return "External";
    default:
      return approvalMode.replace(/_/g, " ");
  }
};
const riskLevelLabel = (riskLevel) => riskLevel === "review" ? "Review required" : "Safe";
const summarizeRiskKinds = (riskKinds) => riskKinds.length > 0 ? riskKinds.join(" - ") : "General risk";
const MODEL_PROFILE_OPTIONS = ["5.4 High", "5.4 Medium", "5.4 Low", "codex-balanced", "default"];
const APPROVAL_MODE_OPTIONS = [
  { value: "workspace_write", label: "Ask" },
  { value: "on_request", label: "Request" },
  { value: "external", label: "External" }
];
const composerStatusTone = (archivedThreadReadOnly, readOnlyExternalAgent, busy, decisionBusy, permissionRequest) => {
  if (archivedThreadReadOnly) {
    return "waiting";
  }
  if (readOnlyExternalAgent) {
    return "neutral";
  }
  if (busy || decisionBusy) {
    return "working";
  }
  if (permissionRequest) {
    return "waiting";
  }
  return "neutral";
};
const composerStatusText = (archivedThreadReadOnly, readOnlyExternalAgent, busy, decisionBusy, permissionRequest) => {
  if (archivedThreadReadOnly) {
    return "Archived";
  }
  if (readOnlyExternalAgent) {
    return "Read-only";
  }
  if (decisionBusy) {
    return "Applying...";
  }
  if (busy) {
    return "Running...";
  }
  if (permissionRequest) {
    return "Approval required.";
  }
  return "Ready.";
};
const draftStatusText = (draftSaveState, draft) => {
  switch (draftSaveState) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Local only";
    default:
      return draft.trim().length > 0 ? "Unsaved" : "Empty";
  }
};
const contextSaveText = (contextSaveState) => {
  switch (contextSaveState) {
    case "dirty":
      return "Unsaved";
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    default:
      return "Ready";
  }
};
const sendButtonLabel = (isEmptyThread, archivedThreadReadOnly, readOnlyExternalAgent, busy, decisionBusy, permissionRequest) => {
  if (archivedThreadReadOnly) {
    return "Archived";
  }
  if (readOnlyExternalAgent) {
    return "Read-only";
  }
  if (decisionBusy) {
    return "Applying";
  }
  if (permissionRequest) {
    return "Review";
  }
  if (busy) {
    return "Running";
  }
  return "Run";
};
const composerPlaceholder = (isEmptyThread, archivedThreadReadOnly, readOnlyExternalAgent, permissionRequest) => {
  if (archivedThreadReadOnly) {
    return "Restore this archived thread before starting another run";
  }
  if (readOnlyExternalAgent) {
    return "This attached session is read-only";
  }
  if (permissionRequest) {
    return "Resolve the pending approval before starting another run";
  }
  return isEmptyThread ? "Describe the first task or outcome for this thread" : "Ask for the next step or follow-up in this thread";
};
const buildComposerHintText = (archivedThreadReadOnly, readOnlyExternalAgent, dragActive, attachmentCount) => {
  if (archivedThreadReadOnly) {
    return "Restore this thread to start another run. The saved context is preserved.";
  }
  if (readOnlyExternalAgent) {
    return "This attached session is read-only.";
  }
  if (dragActive) {
    return "Drop files to attach them to the next run.";
  }
  if (attachmentCount > 0) {
    return `Enter to run. Shift+Enter adds a newline. ${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"} staged for the next run.`;
  }
  return "Enter to run. Shift+Enter adds a newline. Paste or drop files to attach them.";
};
const draftSignalTone = (draftSaveState) => {
  switch (draftSaveState) {
    case "saving":
      return "working";
    case "error":
      return "error";
    default:
      return "neutral";
  }
};
const contextSignalTone = (contextSaveState) => {
  switch (contextSaveState) {
    case "dirty":
      return "waiting";
    case "saving":
      return "working";
    case "error":
      return "error";
    default:
      return "neutral";
  }
};
const setupNote = (title, detail, tone = "neutral") => ({
  title,
  detail,
  tone,
  variant: "workspace-update"
});
const reservedComposerSlotNote = (slot) => {
  if (slot === "goal") {
    return setupNote(
      "Goal entry slot reserved",
      "This composer keeps a dedicated goal entry point so planning can land here later without displacing attachments, context controls, or the main run action."
    );
  }
  return setupNote(
    "Voice entry slot reserved",
    "This composer keeps a dedicated voice entry point so spoken input can land here later without changing the thread, run, or approval workflow."
  );
};
export function AgentConversationWorkspace({
  agent,
  onClose,
  onDelete
}: AgentConversationWorkspaceProps) {
  const textareaRef = reactExports.useRef(null);
  const attachmentsRef = reactExports.useRef([]);
  const draftSaveTimeoutRef = reactExports.useRef(null);
  const hydrateThreadTimeoutRef = reactExports.useRef(null);
  const runCardRefs = reactExports.useRef(/* @__PURE__ */ new Map());
  const lastAutoExpandedRunKeyRef = reactExports.useRef("");
  const lastAutoExpandedProcessKeyRef = reactExports.useRef("");
  const lastAutoFocusedRunKeyRef = reactExports.useRef("");
  const loadedDraftRef = reactExports.useRef(false);
  const lastPersistedDraftRef = reactExports.useRef("");
  const headerActionMenuRef = reactExports.useRef(null);
  const workspaces = useIntegrationStore((state) => state.workspaces);
  const activeWorkspaceId = useIntegrationStore((state) => state.activeWorkspaceId);
  const selectWorkspace = useIntegrationStore((state) => state.selectWorkspace);
  const profiles = useProfileStore((state) => state.profiles);
  const hydrateProfiles = useProfileStore((state) => state.hydrate);
  const [thread, setThread] = reactExports.useState(null);
  const [context, setContext] = reactExports.useState(
    () => normalizeComposer(agent, workspaces, activeWorkspaceId)
  );
  const contextRef = reactExports.useRef(context);
  const contextSaveRequestRef = reactExports.useRef(0);
  const [draft, setDraft] = reactExports.useState("");
  const [attachments, setAttachments] = reactExports.useState([]);
  const [busy, setBusy] = reactExports.useState(false);
  const [submitError, setSubmitError] = reactExports.useState(null);
  const [permissionRequest, setPermissionRequest] = reactExports.useState(null);
  const [pendingInput, setPendingInput] = reactExports.useState(null);
  const [decisionBusy, setDecisionBusy] = reactExports.useState(false);
  const [threadTransitionBusy, setThreadTransitionBusy] = reactExports.useState(false);
  const [expandedRunIds, setExpandedRunIds] = reactExports.useState([]);
  const [expandedProcessRunIds, setExpandedProcessRunIds] = reactExports.useState([]);
  const [expandedRecordRunIds, setExpandedRecordRunIds] = reactExports.useState([]);
  const [expandedTimelineResourceIds, setExpandedTimelineResourceIds] = reactExports.useState([]);
  const [collapsedRecordGroupIds, setCollapsedRecordGroupIds] = reactExports.useState([]);
  const [runActionState, setRunActionState] = reactExports.useState({});
  const [draftSaveState, setDraftSaveState] = reactExports.useState("idle");
  const [contextSaveState, setContextSaveState] = reactExports.useState("idle");
  const [dragActive, setDragActive] = reactExports.useState(false);
  const [editingThreadTitle, setEditingThreadTitle] = reactExports.useState(false);
  const [threadTitleDraft, setThreadTitleDraft] = reactExports.useState("");
  const [threadTitleBusy, setThreadTitleBusy] = reactExports.useState(false);
  const [threadArchiveBusyId, setThreadArchiveBusyId] = reactExports.useState(null);
  const [showArchivedThreads, setShowArchivedThreads] = reactExports.useState(false);
  const [historyPanelOpen, setHistoryPanelOpen] = reactExports.useState(false);
  const [headerActionMenuOpen, setHeaderActionMenuOpen] = reactExports.useState(false);
  const [emptyPromptSuggestionsOpen, setEmptyPromptSuggestionsOpen] = reactExports.useState(false);
  const [composerSetupNote, setComposerSetupNote] = reactExports.useState(null);
  const [branchFieldFocused, setBranchFieldFocused] = reactExports.useState(false);
  const applyThreadSnapshot = reactExports.useCallback(
    (nextThread, nextPendingRequest, options) => {
      contextRef.current = nextThread.composer;
      contextSaveRequestRef.current += 1;
      const latestRun2 = nextThread.runs.at(-1) ?? null;
      const shouldExpandLatestRun = latestRun2 && (latestRun2.status === "waiting_user_input" || nextPendingRequest?.sessionId === latestRun2.id);
      const shouldResetDraft = Boolean(options?.forceDraft || !loadedDraftRef.current);
      if (shouldResetDraft) {
        lastPersistedDraftRef.current = nextThread.draft;
        loadedDraftRef.current = true;
      }
      reactExports.startTransition(() => {
        setThread(nextThread);
        setPermissionRequest(nextPendingRequest);
        setContext(nextThread.composer);
        if (shouldResetDraft) {
          setDraft(nextThread.draft);
          setDraftSaveState(nextThread.draft.trim().length > 0 ? "saved" : "idle");
        }
        setContextSaveState("saved");
        if (options?.forceDraft) {
          setExpandedRunIds(shouldExpandLatestRun ? [latestRun2.id] : []);
          setExpandedProcessRunIds([]);
          return;
        }
        if (shouldExpandLatestRun) {
          setExpandedRunIds((current) => current.includes(latestRun2.id) ? current : [...current, latestRun2.id]);
        }
      });
    },
    []
  );
  const hydrateThread = reactExports.useCallback(async () => {
    const [nextThread, nextPendingRequest] = await Promise.all([
      window.codexOffice.conversations.getThread(agent.id),
      window.codexOffice.permissions.getPendingForAgent(agent.id)
    ]);
    applyThreadSnapshot(nextThread, nextPendingRequest);
  }, [agent.id, applyThreadSnapshot]);
  const scheduleHydrateThread = reactExports.useCallback(() => {
    if (hydrateThreadTimeoutRef.current !== null) {
      return;
    }
    hydrateThreadTimeoutRef.current = window.setTimeout(() => {
      hydrateThreadTimeoutRef.current = null;
      void hydrateThread();
    }, 80);
  }, [hydrateThread]);
  const clearPendingDraftSave = reactExports.useCallback(() => {
    if (draftSaveTimeoutRef.current) {
      clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }
  }, []);
  const persistDraftImmediately = reactExports.useCallback(
    async (draftValue) => {
      clearPendingDraftSave();
      if (!loadedDraftRef.current || draftValue === lastPersistedDraftRef.current) {
        setDraftSaveState(draftValue.trim().length > 0 ? "saved" : "idle");
        return;
      }
      setDraftSaveState("saving");
      try {
        const savedDraft = await window.codexOffice.conversations.saveDraft({
          agentId: agent.id,
          threadId: thread?.threadId,
          draft: draftValue
        });
        lastPersistedDraftRef.current = savedDraft;
        setDraftSaveState(savedDraft.trim().length > 0 ? "saved" : "idle");
      } catch {
        setDraftSaveState("error");
      }
    },
    [agent.id, clearPendingDraftSave, thread?.threadId]
  );
  reactExports.useEffect(() => {
    loadedDraftRef.current = false;
    lastPersistedDraftRef.current = "";
    clearPendingDraftSave();
    setThread(null);
    setContext(normalizeComposer(agent, workspaces, activeWorkspaceId));
    contextSaveRequestRef.current += 1;
    setDraft("");
    setAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      return [];
    });
    setBusy(false);
    setSubmitError(null);
    setPermissionRequest(null);
    setPendingInput(null);
    setDecisionBusy(false);
    setThreadTransitionBusy(false);
    setExpandedRunIds([]);
    setExpandedProcessRunIds([]);
    setExpandedRecordRunIds([]);
    setCollapsedRecordGroupIds([]);
    setRunActionState({});
    setDraftSaveState("idle");
    setContextSaveState("idle");
    setDragActive(false);
    setEditingThreadTitle(false);
    setThreadTitleDraft("");
    setThreadTitleBusy(false);
    setThreadArchiveBusyId(null);
    setShowArchivedThreads(false);
    setHistoryPanelOpen(false);
    setHeaderActionMenuOpen(false);
    setBranchFieldFocused(false);
    lastAutoExpandedRunKeyRef.current = "";
    lastAutoExpandedProcessKeyRef.current = "";
    lastAutoFocusedRunKeyRef.current = "";
    if (hydrateThreadTimeoutRef.current !== null) {
      window.clearTimeout(hydrateThreadTimeoutRef.current);
      hydrateThreadTimeoutRef.current = null;
    }
  }, [agent.id, clearPendingDraftSave]);
  reactExports.useEffect(() => {
    void hydrateThread();
  }, [hydrateThread]);
  reactExports.useEffect(() => {
    void hydrateProfiles();
  }, [hydrateProfiles]);
  reactExports.useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  reactExports.useEffect(() => {
    contextRef.current = context;
  }, [context]);
  reactExports.useEffect(() => {
    if (!headerActionMenuOpen) {
      return;
    }
    const handlePointerDown = (event) => {
      if (!headerActionMenuRef.current?.contains(event.target)) {
        setHeaderActionMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setHeaderActionMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [headerActionMenuOpen]);
  reactExports.useEffect(() => {
    return () => {
      clearPendingDraftSave();
      if (hydrateThreadTimeoutRef.current !== null) {
        window.clearTimeout(hydrateThreadTimeoutRef.current);
        hydrateThreadTimeoutRef.current = null;
      }
      for (const attachment of attachmentsRef.current) {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      }
    };
  }, [clearPendingDraftSave]);
  reactExports.useEffect(() => {
    if (!loadedDraftRef.current || draft === lastPersistedDraftRef.current) {
      setDraftSaveState(draft.trim().length > 0 ? "saved" : "idle");
      return;
    }
    clearPendingDraftSave();
    draftSaveTimeoutRef.current = setTimeout(() => {
      draftSaveTimeoutRef.current = null;
      setDraftSaveState("saving");
      void window.codexOffice.conversations.saveDraft({
        agentId: agent.id,
        threadId: thread?.threadId,
        draft
      }).then((savedDraft) => {
        lastPersistedDraftRef.current = savedDraft;
        setDraftSaveState(savedDraft.trim().length > 0 ? "saved" : "idle");
      }).catch(() => {
        setDraftSaveState("error");
      });
    }, 220);
    return () => {
      clearPendingDraftSave();
    };
  }, [agent.id, clearPendingDraftSave, draft, thread?.threadId]);
  reactExports.useEffect(() => {
    const unsubscribe = window.codexOffice.runtime.onEvent((event) => {
      if (event.agentId !== agent.id || event.type === "log_line") {
        return;
      }
      scheduleHydrateThread();
    });
    return unsubscribe;
  }, [agent.id, scheduleHydrateThread]);
  reactExports.useEffect(() => {
    setThreadTitleDraft(thread?.title ?? "");
    setEditingThreadTitle(false);
    setThreadTitleBusy(false);
  }, [thread?.threadId, thread?.title]);
  const persistComposer = reactExports.useCallback(
    async (patch) => {
      const next = normalizeComposer(agent, workspaces, activeWorkspaceId, { ...contextRef.current, ...patch });
      const requestId = contextSaveRequestRef.current + 1;
      contextSaveRequestRef.current = requestId;
      contextRef.current = next;
      setContext(next);
      setContextSaveState("saving");
      try {
        const saved = await window.codexOffice.conversations.saveComposer({
          agentId: agent.id,
          threadId: thread?.threadId,
          composer: next
        });
        if (contextSaveRequestRef.current !== requestId) {
          return;
        }
        contextRef.current = saved;
        setContext(saved);
        setContextSaveState("saved");
      } catch {
        if (contextSaveRequestRef.current !== requestId) {
          return;
        }
        setContextSaveState("error");
      }
    },
    [activeWorkspaceId, agent, thread?.threadId, workspaces]
  );
  const selectedWorkspace = reactExports.useMemo(
    () => workspaces.find((workspace) => workspace.id === context.workspaceId) ?? null,
    [context.workspaceId, workspaces]
  );
  const availableWorkspaceChoices = reactExports.useMemo(
    () => workspaces.length > 0 ? workspaces : [{ id: context.workspaceId, name: context.workspaceId, rootPath: context.workspaceRoot, createdAt: "" }],
    [context.workspaceId, context.workspaceRoot, workspaces]
  );
  const availableThreads = thread?.availableThreads ?? [];
  const currentThreadSummary = reactExports.useMemo(
    () => availableThreads.find((candidate) => candidate.id === thread?.threadId) ?? null,
    [availableThreads, thread?.threadId]
  );
  const visibleThreads = reactExports.useMemo(
    () => sortThreadRail(
      availableThreads.filter(
        (candidate) => !candidate.archived || showArchivedThreads || candidate.id === thread?.threadId
      ),
      thread?.threadId
    ),
    [availableThreads, showArchivedThreads, thread?.threadId]
  );
  const visibleThreadDigest = reactExports.useMemo(() => {
    const blocked = visibleThreads.filter((candidate) => candidate.blockedRunCount > 0).length;
    const recovery = visibleThreads.filter((candidate) => candidate.recoveryRunCount > 0).length;
    const active = visibleThreads.filter((candidate) => candidate.activeRunCount > 0).length;
    return { blocked, recovery, active };
  }, [visibleThreads]);
  const workspaceNameById = reactExports.useMemo(
    () => new Map(workspaces.map((workspace) => [workspace.id, presentWorkspaceLabel(workspace)])),
    [workspaces]
  );
  const selectedWorkspaceLabel = reactExports.useMemo(
    () => presentWorkspaceLabel(selectedWorkspace, context.workspaceId),
    [context.workspaceId, selectedWorkspace]
  );
  const readOnlyExternalAgent = context.mode === "attached";
  const isCurrentThreadArchived = Boolean(currentThreadSummary?.archived);
  const archivedThreadReadOnly = isCurrentThreadArchived;
  const controlsDisabled = busy || decisionBusy || threadTransitionBusy || threadTitleBusy || threadArchiveBusyId !== null;
  const contextControlsDisabled = controlsDisabled || archivedThreadReadOnly;
  const hasComposerInput = draft.trim().length > 0 || attachments.length > 0;
  const composerBlockedByApproval = permissionRequest !== null;
  const composerInputDisabled = busy || decisionBusy || readOnlyExternalAgent || archivedThreadReadOnly || composerBlockedByApproval;
  const sendDisabled = controlsDisabled || readOnlyExternalAgent || archivedThreadReadOnly || composerBlockedByApproval || !hasComposerInput;
  const runs = thread?.runs ?? [];
  const latestRun = runs.at(-1) ?? null;
  const featuredRunId = reactExports.useMemo(() => selectFeaturedRunId(runs, permissionRequest), [permissionRequest, runs]);
  const featuredRun = reactExports.useMemo(
    () => featuredRunId ? runs.find((run) => run.id === featuredRunId) ?? null : null,
    [featuredRunId, runs]
  );
  const runRailRuns = reactExports.useMemo(() => sortRunRail(runs, permissionRequest, featuredRunId), [featuredRunId, permissionRequest, runs]);
  const runRailDigest = reactExports.useMemo(() => {
    const blocked = runs.filter(
      (run) => runAttentionKind(run, permissionRequest?.sessionId === run.id ? permissionRequest : null, featuredRunId === run.id) === "approval"
    ).length;
    const recovery = runs.filter(
      (run) => runAttentionKind(run, permissionRequest?.sessionId === run.id ? permissionRequest : null, featuredRunId === run.id) === "failure"
    ).length;
    const active = runs.filter(
      (run) => runAttentionKind(run, permissionRequest?.sessionId === run.id ? permissionRequest : null, featuredRunId === run.id) === "live"
    ).length;
    return { blocked, recovery, active };
  }, [featuredRunId, permissionRequest, runs]);
  const isEmptyThread = runs.length === 0;
  const newThreadDisabled = controlsDisabled || permissionRequest !== null || isEmptyThread && draft.trim().length === 0 && attachments.length === 0;
  const hasInlinePendingApproval = permissionRequest ? runs.some((run) => run.id === permissionRequest.sessionId) : false;
  const composerStatus = composerStatusText(archivedThreadReadOnly, readOnlyExternalAgent, busy, decisionBusy, permissionRequest);
  const composerStatusVariant = composerStatusTone(archivedThreadReadOnly, readOnlyExternalAgent, busy, decisionBusy, permissionRequest);
  const headerStateFlags = reactExports.useMemo(() => [], []);
  const autoExpandedRunIds = reactExports.useMemo(() => {
    return [];
  }, []);
  const autoExpandedProcessRunIds = reactExports.useMemo(() => {
    return [];
  }, []);
  const archivedThreadCount = availableThreads.filter((candidate) => candidate.archived).length;
  const showThreadRail = visibleThreads.length > 0 || archivedThreadCount > 0;
  const showRunRail = !isEmptyThread;
  const showWorkspaceStrip = false;
  const showWorkspaceSidebar = !isEmptyThread && historyPanelOpen && (showThreadRail || showRunRail);
  const showThreadRailContent = historyPanelOpen;
  const showRunRailContent = historyPanelOpen && showRunRail;
  const showEmptyThreadUtility = isEmptyThread && showThreadRail && historyPanelOpen;
  const showHeaderActionMenu = Boolean(thread || onDelete);
  const threadRailSummary = reactExports.useMemo(() => {
    const facts = [`${visibleThreads.length} thread${visibleThreads.length === 1 ? "" : "s"}`];
    if (visibleThreadDigest.blocked > 0) {
      facts.push(`${visibleThreadDigest.blocked} blocked`);
    } else if (visibleThreadDigest.active > 0) {
      facts.push(`${visibleThreadDigest.active} live`);
    } else if (visibleThreadDigest.recovery > 0) {
      facts.push(`${visibleThreadDigest.recovery} recovery`);
    } else {
      facts.push("Workspace ready");
    }
    return facts.join(" / ");
  }, [visibleThreadDigest.active, visibleThreadDigest.blocked, visibleThreadDigest.recovery, visibleThreads.length]);
  const runRailSummary = reactExports.useMemo(() => {
    const facts = [`${runs.length} run${runs.length === 1 ? "" : "s"}`];
    if (runRailDigest.blocked > 0) {
      facts.push(`${runRailDigest.blocked} blocked`);
    } else if (runRailDigest.active > 0) {
      facts.push(`${runRailDigest.active} live`);
    } else if (runRailDigest.recovery > 0) {
      facts.push(`${runRailDigest.recovery} recovery`);
    } else if (latestRun) {
      facts.push(runStatusLabel(latestRun.status));
    } else {
      facts.push("Workspace ready");
    }
    return facts.join(" / ");
  }, [latestRun, runRailDigest.active, runRailDigest.blocked, runRailDigest.recovery, runs.length]);
  const showComposerSignals = busy || decisionBusy || permissionRequest !== null || archivedThreadReadOnly || readOnlyExternalAgent || draftSaveState === "saving" || draftSaveState === "error" || contextSaveState === "dirty" || contextSaveState === "saving" || contextSaveState === "error";
  const composerSignalItems = reactExports.useMemo(
    () => {
      const items = [];
      if (busy || decisionBusy || permissionRequest !== null || archivedThreadReadOnly || readOnlyExternalAgent) {
        items.push({ id: "run", label: "Run", value: composerStatus, tone: composerStatusVariant });
      }
      if (draftSaveState === "saving" || draftSaveState === "error") {
        items.push({ id: "draft", label: "Draft", value: draftStatusText(draftSaveState, draft), tone: draftSignalTone(draftSaveState) });
      }
      if (contextSaveState === "dirty" || contextSaveState === "saving" || contextSaveState === "error") {
        items.push({ id: "context", label: "Context", value: contextSaveText(contextSaveState), tone: contextSignalTone(contextSaveState) });
      }
      return items;
    },
    [composerStatus, composerStatusVariant, contextSaveState, draft, draftSaveState]
  );
  const composerHintText = reactExports.useMemo(
    () => buildComposerHintText(archivedThreadReadOnly, readOnlyExternalAgent, dragActive, attachments.length),
    [archivedThreadReadOnly, attachments.length, dragActive, readOnlyExternalAgent]
  );
  const showComposerHint = isEmptyThread || dragActive || attachments.length > 0 || composerBlockedByApproval || archivedThreadReadOnly || readOnlyExternalAgent;
  const currentThreadTitle = thread?.title?.trim() || "New thread";
  const showNamedEmptyThread = isEmptyThread && currentThreadTitle !== "New thread";
  const referenceRun = featuredRun ?? latestRun;
  const compactThreadHeader = !isEmptyThread && runs.length === 1 && Boolean(referenceRun?.initialPrompt) && normalizeHeadingText(currentThreadTitle) === normalizeHeadingText(referenceRun.initialPrompt);
  const threadDigest = reactExports.useMemo(() => {
    const uniqueFiles = Array.from(new Set(runs.flatMap((run) => run.summary.changedFiles)));
    const reviewedFiles = Array.from(new Set(runs.flatMap((run) => run.summary.reviewedFiles)));
    const totalCommands = runs.reduce((sum, run) => sum + run.summary.commandCount, 0);
    const totalTokens = runs.reduce((sum, run) => sum + run.summary.totalTokens, 0);
    const totalCost = runs.some((run) => run.summary.estimatedCost !== null) ? runs.reduce((sum, run) => sum + (run.summary.estimatedCost ?? 0), 0) : null;
    const waitingRuns = runs.filter((run) => run.summary.waitingForApproval).length;
    const approvalChecks = runs.reduce((sum, run) => sum + run.summary.approvalRequestCount, 0);
    return {
      uniqueFiles,
      reviewedFiles,
      totalCommands,
      totalTokens,
      totalCost,
      waitingRuns,
      approvalChecks
    };
  }, [runs]);
  const branchSuggestions = reactExports.useMemo(
    () => Array.from(
      new Set(
        [context.branch, agent.current_branch ?? null, "master", ...runs.map((run) => run.context.branch)].filter(
          (value) => Boolean(value && value.trim())
        )
      )
    ),
    [agent.current_branch, context.branch, runs]
  );
  const profileById = reactExports.useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const availableProfileChoices = reactExports.useMemo(() => {
    const seen = new Set([""]);
    const choices = [
      {
        id: "",
        name: "No profile",
        default_model_profile: null,
        default_permission_mode: null
      }
    ];
    for (const candidate of profiles) {
      if (seen.has(candidate.id)) {
        continue;
      }
      choices.push(candidate);
      seen.add(candidate.id);
    }
    if (context.profileId && !seen.has(context.profileId)) {
      choices.push({
        id: context.profileId,
        name: profileLabel(context) ?? context.profileId,
        default_model_profile: null,
        default_permission_mode: null
      });
    }
    return choices;
  }, [context, profiles]);
  const modelOptions = reactExports.useMemo(
    () => Array.from(/* @__PURE__ */ new Set([...MODEL_PROFILE_OPTIONS, context.modelProfile, ...runs.map((run) => run.context.modelProfile)])),
    [context.modelProfile, runs]
  );
  const threadSnapshotFactsList = reactExports.useMemo(() => threadSnapshotFacts(threadDigest), [threadDigest]);
  const compactThreadSnapshotFactsList = reactExports.useMemo(() => threadSnapshotFactsList.slice(0, 3), [threadSnapshotFactsList]);
  const composerGuide = reactExports.useMemo(() => {
    if (archivedThreadReadOnly && thread) {
      return {
        kicker: "Thread access",
        title: "This thread is archived.",
        detail: "Restore it before launching another run from this thread history.",
        tone: "neutral",
        variant: "system-note",
        actions: [{ kind: "restore_thread", label: "Restore thread", threadId: thread.threadId }]
      };
    }
    return null;
  }, [archivedThreadReadOnly, thread]);
  const composerPreface = reactExports.useMemo(() => {
    if (composerSetupNote) {
      return {
        kicker: "Workspace update",
        title: composerSetupNote.title,
        detail: composerSetupNote.detail,
        tone: composerSetupNote.tone,
        variant: composerSetupNote.variant ?? "system-note",
        dismissible: true
      };
    }
    if (composerGuide) {
      return {
        kicker: composerGuide.kicker,
        title: composerGuide.title,
        detail: composerGuide.detail,
        tone: composerGuide.tone,
        variant: composerGuide.variant ?? "system-note",
        actions: composerGuide.actions
      };
    }
    return null;
  }, [composerGuide, composerSetupNote]);
  const emptyStageHeading = "Start the first run.";
  const emptyStageDetail = selectedWorkspaceLabel && selectedWorkspaceLabel !== "Workspace" ? `Start with the brief or outcome you want from ${selectedWorkspaceLabel}. Once you run it, the thread, context, approvals, and visible work stay attached here.` : "Start with the brief or outcome you want. Once you run it, the thread, context, approvals, and visible work stay attached here.";
  const canShowEmptyPromptSuggestions = isEmptyThread && draft.trim().length === 0 && attachments.length === 0;
  const showEmptyPromptSuggestions = canShowEmptyPromptSuggestions && emptyPromptSuggestionsOpen;
  const workspaceHeaderKicker = "";
  const compactHeaderChrome = !isEmptyThread && compactThreadHeader;
  const workspaceHeaderTitle = isEmptyThread
    ? showNamedEmptyThread
      ? currentThreadTitle
      : selectedWorkspaceLabel
    : "Conversation";
  const workspaceHeaderSubtitle = "";
  const showWorkspaceHeaderKicker = false;
  const showWorkspaceHeaderSubtitle = false;
  const showCompactHeaderOnly = false;
  const showHistoryAction = showThreadRail || !isEmptyThread && showRunRail;
  const compactHistoryInsideThreadGroup = showCompactHeaderOnly && showHistoryAction;
  const workspaceHeaderFacts = [];
  const contextBarTitle = isEmptyThread ? "Launch context" : "Saved thread context";
  const contextBarSummary = isEmptyThread ? "The first run will launch with the context below." : "Workspace, mode, branch, model, and approvals stay attached to this thread.";
  const contextBarDetail = isEmptyThread ? "Adjust workspace, mode, branch, profile, model, and approval before you launch the first run." : context.workspaceRoot;
  const contextBarFacts = reactExports.useMemo(() => {
    const facts = [];
    if (archivedThreadReadOnly) {
      facts.push("Read only");
    } else if (readOnlyExternalAgent) {
      facts.push("Attached mode");
    }
    if (permissionRequest !== null) {
      facts.push("Approval pending");
    } else if (contextSaveState === "dirty") {
      facts.push("Unsaved context");
    } else if (contextSaveState === "saving") {
      facts.push("Saving context");
    }
    return facts;
  }, [archivedThreadReadOnly, contextSaveState, isEmptyThread, permissionRequest, readOnlyExternalAgent]);
  const showContextTopline = isEmptyThread;
  const showBranchSuggestions = !isEmptyThread && branchFieldFocused && branchSuggestions.length > 0;
  const showContextMetaRow = isEmptyThread || attachments.length > 0 || showComposerSignals;
  const showComposerPreface = composerPreface !== null && (!permissionRequest || !hasInlinePendingApproval || composerPreface.variant !== "thread-continuation");
  const currentSendButtonLabel = sendButtonLabel(isEmptyThread, archivedThreadReadOnly, readOnlyExternalAgent, busy, decisionBusy, permissionRequest);
  const renderAttachButton = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      className: "conversation-action-button conversation-action-button-attach",
      disabled: contextControlsDisabled || readOnlyExternalAgent,
      onClick: openFilePicker,
      type: "button",
      children: attachments.length > 0 ? `Attach (${attachments.length})` : "Attach"
    }
  );
  const renderGoalButton = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      "aria-label": "Open goal slot note",
      className: "conversation-action-button conversation-action-button-reserved conversation-toolbar-slot conversation-toolbar-slot-reserved",
      onClick: () => showReservedComposerSlotNote("goal"),
      title: "Open the reserved goal entry note.",
      type: "button",
      children: "Goal"
    }
  );
  const renderVoiceButton = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      "aria-label": "Open voice slot note",
      className: "conversation-action-button conversation-action-button-reserved conversation-toolbar-slot conversation-toolbar-slot-reserved",
      onClick: () => showReservedComposerSlotNote("voice"),
      title: "Open the reserved voice entry note.",
      type: "button",
      children: "Voice"
    }
  );
  const renderModelSelect = (className) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className, "data-chip-label": "Model", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-chip-label", children: "Model" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "select",
      {
        "aria-label": "Model",
        disabled: contextControlsDisabled,
        onChange: (event) => void persistComposer({ modelProfile: event.target.value }),
        value: context.modelProfile,
        children: modelOptions.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option, children: option }, option))
      }
    )
  ] });
  const renderApprovalSelect = (className) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className, "data-chip-label": "Approval", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-chip-label", children: "Approval" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "select",
      {
        "aria-label": "Approval",
        disabled: contextControlsDisabled,
        onChange: (event) => void persistComposer({ approvalMode: event.target.value }),
        value: context.approvalMode,
        children: APPROVAL_MODE_OPTIONS.map((option) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: option.value, children: option.label }, option.value))
      }
    )
  ] });
  const renderSendButton = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      className: "conversation-send-button",
      disabled: sendDisabled,
      onClick: () => void sendCurrentMessage(),
      type: "button",
      children: currentSendButtonLabel
    }
  );
  const renderComposerPrefacePanel = () => {
    if (!showComposerPreface || !composerPreface) {
      return null;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: "conversation-composer-preface",
        "data-tone": composerPreface.tone ?? "neutral",
        "data-variant": composerPreface.variant ?? "system-note",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-preface-copy", children: [
            composerPreface.kicker ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-run-section-kicker", children: composerPreface.kicker }) : null,
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: composerPreface.title }),
            composerPreface.detail ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: composerPreface.detail }) : null
          ] }),
          composerPreface.actions?.length || composerPreface.dismissible ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-preface-actions", children: [
            composerPreface.actions?.map((action) => /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                disabled: controlsDisabled,
                onClick: () => void handleComposerGuideAction(action),
                type: "button",
                children: action.label
              },
              `${composerPreface.title}-${action.kind}-${action.label}`
            )),
            composerPreface.dismissible ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                onClick: () => setComposerSetupNote(null),
                type: "button",
                children: "Dismiss"
              }
            ) : null
          ] }) : null
        ]
      }
    );
  };
  const renderAttachmentStrip = () => {
    if (attachments.length === 0) {
      return null;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "section",
      {
        className: `conversation-attachment-strip${isEmptyThread ? "" : " conversation-attachment-strip-inline"}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-attachment-strip-header", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-attachment-strip-copy", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-run-section-kicker", children: "Local context" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "strong",
                {
                  children: `${attachments.length} attachment${attachments.length === 1 ? "" : "s"} staged`
                }
              )
            ] }),
            attachments.length > 1 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                disabled: composerInputDisabled,
                onClick: clearDraftAttachments,
                type: "button",
                children: "Clear"
              }
            ) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-attachment-strip-grid", children: attachments.map((attachment) => {
            const badge = attachmentBadgeLabel(attachment);
            const previewSrc = attachmentPreviewSrc(attachment);
            const location = formatAttachmentLocation(attachment);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "conversation-attachment-chip", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-attachment-chip-visual", children: [
                previewSrc ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { alt: attachment.name, loading: "lazy", src: previewSrc }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-file-badge", children: badge }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-attachment-chip-kind", children: badge })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-attachment-chip-copy", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: attachment.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
                  attachment.mimeType,
                  " / ",
                  formatAttachmentSize(attachment.size)
                ] }),
                location ? /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: location }) : null
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  "aria-label": `Remove ${attachment.name}`,
                  className: "conversation-attachment-remove",
                  disabled: composerInputDisabled,
                  onClick: () => removeAttachment(attachment.id),
                  type: "button",
                  children: "x"
                }
              )
            ] }, attachment.id);
          }) })
        ]
      }
    );
  };
  const renderComposerContextBar = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "conversation-context-bar conversation-context-bar-attached",
      "data-empty": isEmptyThread ? "true" : "false",
      children: [
        showContextTopline ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-topline", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-caption", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-caption-label", children: contextBarTitle }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: contextBarSummary }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: contextBarDetail })
          ] }),
          contextBarFacts.length > 0 || composerSignalItems.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-topline-meta", children: [
            contextBarFacts.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-context-bar-facts", children: contextBarFacts.map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, fact)) }) : null,
            composerSignalItems.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-context-bar-signals", children: composerSignalItems.map((signal) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `conversation-signal-pill tone-${signal.tone ?? "neutral"}`, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-signal-label", children: signal.label }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: signal.value })
            ] }, signal.id)) }) : null
          ] }) : null
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-controls", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-control-group conversation-context-control-group-leading", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "conversation-context-chip", "data-chip-label": "Workspace", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-chip-label", children: "Workspace" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  "aria-label": "Workspace",
                  disabled: contextControlsDisabled,
                  onChange: (event) => {
                    const workspaceId = event.target.value;
                    const workspace = availableWorkspaceChoices.find((candidate) => candidate.id === workspaceId) ?? null;
                    selectWorkspace(workspaceId);
                    void persistComposer({
                      workspaceId,
                      workspaceRoot: workspace?.rootPath ?? context.workspaceRoot
                    });
                  },
                  value: context.workspaceId,
                  children: availableWorkspaceChoices.map((workspace) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: workspace.id, children: presentWorkspaceLabel(workspace) }, workspace.id))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "conversation-context-chip", "data-chip-label": "Mode", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-chip-label", children: "Mode" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  "aria-label": "Mode",
                  disabled: contextControlsDisabled,
                  onChange: (event) => void persistComposer({ mode: event.target.value }),
                  value: context.mode,
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "local", children: "Local" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "attached", children: "Attached" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "conversation-context-chip", "data-chip-label": "Profile", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-chip-label", children: "Profile" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  "aria-label": "Profile",
                  disabled: contextControlsDisabled,
                  onChange: (event) => {
                    const profileId = event.target.value;
                    const profile = profileById.get(profileId) ?? availableProfileChoices.find((candidate) => candidate.id === profileId) ?? null;
                    void persistComposer({
                      profileId: profileId || null,
                      profileLabel: profileId ? profile?.name ?? null : null,
                      modelProfile: profile?.default_model_profile ?? context.modelProfile,
                      approvalMode: profile?.default_permission_mode ?? context.approvalMode
                    });
                  },
                  value: context.profileId ?? "",
                  children: availableProfileChoices.map((profile) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: profile.id, children: profile.name }, profile.id || "no-profile"))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "conversation-context-chip conversation-context-chip-branch", "data-chip-label": "Branch", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-context-chip-label", children: "Branch" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  "aria-label": "Branch",
                  disabled: contextControlsDisabled,
                  onBlur: () => {
                    setBranchFieldFocused(false);
                    if (context.branch !== contextRef.current.branch) {
                      void persistComposer({ branch: context.branch });
                    }
                  },
                  onChange: (event) => applyComposerLocally({ branch: event.target.value }),
                  onFocus: () => setBranchFieldFocused(true),
                  value: context.branch
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-control-group conversation-context-control-group-trailing", children: [
            renderModelSelect("conversation-context-chip"),
            renderApprovalSelect("conversation-context-chip")
          ] })
        ] }),
        showBranchSuggestions ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-branch-suggestions", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-branch-suggestions-label", children: "Branch suggestions" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-branch-suggestions-list", children: branchSuggestions.map((branch) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "conversation-branch-suggestion",
              "data-active": branch === context.branch ? "true" : "false",
              disabled: contextControlsDisabled,
              onClick: () => applyBranchSuggestion(branch),
              type: "button",
              children: branch
            },
            branch
          )) })
        ] }) : null,
        showContextMetaRow ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-context-meta-row", "data-empty": isEmptyThread ? "true" : "false", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `conversation-context-meta-path${isEmptyThread ? " conversation-context-meta-path-empty" : ""}`, children: context.workspaceRoot }),
          composerSignalItems.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-context-meta-signals", children: composerSignalItems.map((signal) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `conversation-context-inline-signal tone-${signal.tone ?? "neutral"}`, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: signal.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: signal.value })
          ] }, signal.id)) }) : null
        ] }) : null
      ]
    }
  );
  const renderConversationComposerShell = () => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "section",
    {
      className: "conversation-composer-shell",
      "data-empty": isEmptyThread ? "true" : "false",
      children: [
        isEmptyThread ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-empty-stage", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-empty-stage-copy", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-empty-stage-kicker", children: "Thread ready" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: emptyStageHeading }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-empty-stage-detail", children: emptyStageDetail })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-empty-stage-meta", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: selectedWorkspaceLabel }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: modeLabel(context.mode) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: context.modelProfile })
          ] }),
          canShowEmptyPromptSuggestions ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "conversation-run-toggle conversation-empty-stage-toggle",
              onClick: () => setEmptyPromptSuggestionsOpen((current) => !current),
              type: "button",
              children: showEmptyPromptSuggestions ? "Hide examples" : "Use an example"
            }
          ) : null
        ] }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-panel", children: [
          showEmptyPromptSuggestions ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-empty-suggestions-shell", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-empty-suggestions-label", children: "Prompt starters" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-empty-suggestions", children: EMPTY_PROMPT_SUGGESTIONS.map((suggestion) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => {
                  applyQuickPrompt(suggestion.prompt);
                  setEmptyPromptSuggestionsOpen(false);
                },
                type: "button",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-empty-suggestion-kicker", children: suggestion.label }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: suggestion.title }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: suggestion.detail })
                ]
              },
              suggestion.id
            )) })
          ] }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-workbench", "data-empty": isEmptyThread ? "true" : "false", children: [
            renderComposerPrefacePanel(),
            renderAttachmentStrip(),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "conversation-composer-stack",
                "data-drag-active": dragActive ? "true" : "false",
                "data-has-attachments": attachments.length > 0 ? "true" : "false",
                onDragEnter: handleDragEnter,
                onDragLeave: handleDragLeave,
                onDragOver: (event) => event.preventDefault(),
                onDrop: handleDrop,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-card", "data-has-attachments": attachments.length > 0 ? "true" : "false", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "textarea",
                      {
                        disabled: composerInputDisabled,
                        onChange: handleDraftChange,
                        onKeyDown: handleComposerKeyDown,
                        onPaste: handlePaste,
                        placeholder: composerPlaceholder(isEmptyThread, archivedThreadReadOnly, readOnlyExternalAgent, permissionRequest),
                        ref: textareaRef,
                        rows: 1,
                        value: draft
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-toolbar", "data-empty": isEmptyThread ? "true" : "false", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-actions conversation-composer-actions-leading", children: [
                        renderAttachButton(),
                        renderGoalButton()
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-composer-actions conversation-composer-actions-trailing", children: [
                        renderVoiceButton(),
                        renderSendButton()
                      ] })
                    ] })
                  ] }),
                  renderComposerContextBar()
                ]
              }
            ),
            showComposerHint ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-composer-hint", children: composerHintText }) : null
          ] })
        ] })
      ]
    }
  );
  reactExports.useEffect(() => {
    if (!canShowEmptyPromptSuggestions && emptyPromptSuggestionsOpen) {
      setEmptyPromptSuggestionsOpen(false);
    }
  }, [canShowEmptyPromptSuggestions, emptyPromptSuggestionsOpen]);
  const syncComposerHeight = reactExports.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
  }, []);
  reactExports.useLayoutEffect(() => {
    syncComposerHeight();
  }, [draft, syncComposerHeight]);
  reactExports.useEffect(() => {
    if (!textareaRef.current || readOnlyExternalAgent || archivedThreadReadOnly || busy) {
      return;
    }
    if (document.activeElement === textareaRef.current) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, isEmptyThread ? 80 : 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [agent.id, archivedThreadReadOnly, busy, isEmptyThread, readOnlyExternalAgent]);
  reactExports.useEffect(() => {
    const nextKey = autoExpandedRunIds.join("|");
    if (!nextKey || nextKey === lastAutoExpandedRunKeyRef.current) {
      return;
    }
    setExpandedRunIds((current) => Array.from(/* @__PURE__ */ new Set([...current, ...autoExpandedRunIds])));
    lastAutoExpandedRunKeyRef.current = nextKey;
  }, [autoExpandedRunIds]);
  reactExports.useEffect(() => {
    const nextKey = autoExpandedProcessRunIds.join("|");
    if (!nextKey || nextKey === lastAutoExpandedProcessKeyRef.current) {
      return;
    }
    setExpandedProcessRunIds((current) => Array.from(/* @__PURE__ */ new Set([...current, ...autoExpandedProcessRunIds])));
    lastAutoExpandedProcessKeyRef.current = nextKey;
  }, [autoExpandedProcessRunIds]);
  reactExports.useEffect(() => {
    if (!featuredRun) {
      return;
    }
    const featuredAttention = runAttentionKind(
      featuredRun,
      permissionRequest?.sessionId === featuredRun.id ? permissionRequest : null,
      true
    );
    if (featuredAttention === "none") {
      return;
    }
    const target = runCardRefs.current.get(featuredRun.id);
    if (!target) {
      return;
    }
    const nextKey = `${featuredRun.id}:${featuredAttention}:${featuredRun.status}`;
    if (nextKey === lastAutoFocusedRunKeyRef.current) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 40);
    lastAutoFocusedRunKeyRef.current = nextKey;
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [featuredRun, permissionRequest]);
  const clearDraftAttachments = () => {
    replaceDraftAttachments([]);
  };
  const replaceDraftAttachments = (nextAttachments) => {
    setAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.previewUrl) {
          URL.revokeObjectURL(attachment.previewUrl);
        }
      });
      return nextAttachments;
    });
  };
  const addFiles = (files) => {
    if (!files || files.length === 0) {
      return;
    }
    setAttachments((current) => [...current, ...Array.from(files).map(buildAttachmentFromFile)]);
  };
  const openFilePicker = () => {
    if (contextControlsDisabled || readOnlyExternalAgent) {
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.addEventListener("change", () => {
      addFiles(input.files);
      input.remove();
    }, { once: true });
    input.click();
  };
  const showReservedComposerSlotNote = (slot) => {
    setSubmitError(null);
    setComposerSetupNote(reservedComposerSlotNote(slot));
  };
  const removeAttachment = (attachmentId) => {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === attachmentId) ?? null;
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };
  const createNewThread = async () => {
    if (newThreadDisabled) {
      return;
    }
    setThreadTransitionBusy(true);
    setSubmitError(null);
    try {
      await persistDraftImmediately(draft);
      const nextThread = await window.codexOffice.conversations.createThread(agent.id);
      clearDraftAttachments();
      setPendingInput(null);
      applyThreadSnapshot(nextThread, null, { forceDraft: true });
      setComposerSetupNote(
        setupNote(
          "New thread ready",
          "Copied the current run context into a fresh thread. Draft text and local attachments were cleared so you can start the next brief cleanly."
        )
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create a new thread.");
    } finally {
      setThreadTransitionBusy(false);
    }
  };
  const switchThread = async (threadId) => {
    if (thread?.threadId === threadId) {
      return;
    }
    setThreadTransitionBusy(true);
    setSubmitError(null);
    try {
      await persistDraftImmediately(draft);
      const [nextThread, nextPendingRequest] = await Promise.all([
        window.codexOffice.conversations.switchThread({ agentId: agent.id, threadId }),
        window.codexOffice.permissions.getPendingForAgent(agent.id)
      ]);
      clearDraftAttachments();
      setPendingInput(null);
      applyThreadSnapshot(nextThread, nextPendingRequest, { forceDraft: true });
      setComposerSetupNote(
        setupNote(
          "Thread loaded",
          "Loaded this thread's saved draft and context. Local attachments from the previous thread were cleared."
        )
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to switch threads.");
    } finally {
      setThreadTransitionBusy(false);
    }
  };
  const saveThreadTitle = async () => {
    if (!thread) {
      return;
    }
    const nextTitle = threadTitleDraft.trim();
    if (!nextTitle) {
      setThreadTitleDraft(thread.title);
      setEditingThreadTitle(false);
      return;
    }
    if (nextTitle === thread.title) {
      setEditingThreadTitle(false);
      return;
    }
    setThreadTitleBusy(true);
    setSubmitError(null);
    try {
      const nextThread = await window.codexOffice.conversations.renameThread({
        agentId: agent.id,
        threadId: thread.threadId,
        title: nextTitle
      });
      applyThreadSnapshot(nextThread, permissionRequest);
      setEditingThreadTitle(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to rename this thread.");
    } finally {
      setThreadTitleBusy(false);
    }
  };
  const setThreadArchived = async (threadId, archived) => {
    if (permissionRequest) {
      return;
    }
    setThreadArchiveBusyId(threadId);
    setSubmitError(null);
    try {
      await persistDraftImmediately(draft);
      const [nextThread, nextPendingRequest] = await Promise.all([
        archived ? window.codexOffice.conversations.archiveThread({ agentId: agent.id, threadId }) : window.codexOffice.conversations.restoreThread({ agentId: agent.id, threadId }),
        window.codexOffice.permissions.getPendingForAgent(agent.id)
      ]);
      if (!archived) {
        setShowArchivedThreads(true);
        setComposerSetupNote(
          setupNote(
            "Archived thread restored",
            "This thread is active again with its saved draft and run context restored."
          )
        );
      }
      applyThreadSnapshot(nextThread, nextPendingRequest, { forceDraft: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : `Unable to ${archived ? "archive" : "restore"} this thread.`);
    } finally {
      setThreadArchiveBusyId(null);
    }
  };
  const buildConversationInput = () => {
    const content = draft.trim();
    if (!content && attachments.length === 0) {
      return null;
    }
    return {
      agentId: agent.id,
      threadId: thread?.threadId,
      content: content || "Please review the attached files.",
      attachments: attachments.map(({ previewUrl: _previewUrl, ...attachment }) => attachment),
      composer: context
    };
  };
  const sendInput = reactExports.useCallback(
    async (input, clearOnSuccess) => {
      clearPendingDraftSave();
      setBusy(true);
      setSubmitError(null);
      try {
        const result = await window.codexOffice.conversations.sendMessage(input);
        lastPersistedDraftRef.current = result.thread.draft;
        if (result.status === "permission_required") {
          const request = await window.codexOffice.permissions.getRequest(result.requestId);
          reactExports.startTransition(() => {
            setThread(result.thread);
            setContext(result.thread.composer);
            setContextSaveState("saved");
            setPermissionRequest(request);
            setPendingInput(input);
          });
          return;
        }
        reactExports.startTransition(() => {
          setThread(result.thread);
          setContext(result.thread.composer);
          setContextSaveState("saved");
          setPermissionRequest(null);
          setPendingInput(null);
          if (clearOnSuccess) {
            setDraft(result.thread.draft);
          }
          setComposerSetupNote(null);
          setDraftSaveState(result.thread.draft.trim().length > 0 ? "saved" : "idle");
        });
        if (clearOnSuccess) {
          clearDraftAttachments();
        }
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Unable to start this run.");
      } finally {
        setBusy(false);
      }
    },
    [clearDraftAttachments, clearPendingDraftSave]
  );
  const sendCurrentMessage = async () => {
    const input = buildConversationInput();
    if (!input) {
      return;
    }
    await sendInput(input, true);
  };
  const handleDecision = async (decision) => {
    if (!permissionRequest) {
      return;
    }
    setDecisionBusy(true);
    try {
      const result = await window.codexOffice.permissions.decide({
        requestId: permissionRequest.id,
        decision
      });
      if (result.status === "approved" && pendingInput) {
        await sendInput(pendingInput, true);
      } else if (result.status === "denied") {
        setSubmitError("The blocked action was denied.");
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to apply the permission decision.");
    } finally {
      setDecisionBusy(false);
      setPermissionRequest(null);
      setPendingInput(null);
      await hydrateThread();
    }
  };
  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    syncComposerHeight();
  };
  const handlePaste = (event) => {
    if (event.clipboardData.files.length > 0) {
      addFiles(event.clipboardData.files);
    }
  };
  const handleDragEnter = (event) => {
    event.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (event) => {
    event.preventDefault();
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setDragActive(false);
  };
  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };
  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendCurrentMessage();
    }
  };
  const toggleRunExpansion = (runId) => {
    setExpandedRunIds((current) => current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId]);
  };
  const toggleRunRecord = (run) => {
    const runId = run.id;
    const recordGroupKeys = run.recordGroups.map((group) => `${runId}:${group.id}`);
    setExpandedRecordRunIds((current) => {
      if (current.includes(runId)) {
        return current.filter((id) => id !== runId);
      }
      setCollapsedRecordGroupIds((collapsed) => Array.from(/* @__PURE__ */ new Set([...collapsed, ...recordGroupKeys])));
      return [...current, runId];
    });
  };
  const toggleRunProcess = (runId) => {
    setExpandedProcessRunIds((current) => current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId]);
  };
  const toggleTimelineResource = (resourceKey) => {
    setExpandedTimelineResourceIds(
      (current) => current.includes(resourceKey) ? current.filter((id) => id !== resourceKey) : [...current, resourceKey]
    );
  };
  const toggleRecordGroup = (groupKey) => {
    setCollapsedRecordGroupIds(
      (current) => current.includes(groupKey) ? current.filter((id) => id !== groupKey) : [...current, groupKey]
    );
  };
  const setRunActionBusy = (runId, state) => {
    setRunActionState((current) => ({
      ...current,
      [runId]: state
    }));
  };
  const clearRunActionBusy = (runId) => {
    setRunActionState((current) => {
      if (!(runId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[runId];
      return next;
    });
  };
  const applyComposerLocally = (patch) => {
    setContext((current) => {
      const next = normalizeComposer(agent, workspaces, activeWorkspaceId, { ...current, ...patch });
      contextRef.current = next;
      return next;
    });
    setContextSaveState("dirty");
  };
  const applyBranchSuggestion = (branch) => {
    if (!branch || branch === context.branch || contextControlsDisabled) {
      return;
    }
    applyComposerLocally({ branch });
    void persistComposer({ branch });
  };
  const applyQuickPrompt = (prompt) => {
    setDraft(prompt);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(prompt.length, prompt.length);
    });
  };
  const restoreRunBrief = (run) => {
    const originalBrief = run.initialPrompt?.trim();
    if (!originalBrief) {
      return;
    }
    const promptMessage = findRunPromptMessage(run);
    setContext(run.context);
    setContextSaveState("dirty");
    replaceDraftAttachments(attachmentsToDrafts(promptMessage?.attachments ?? []));
    applyQuickPrompt(originalBrief);
    setComposerSetupNote(
      setupNote(
        "Original brief restored",
        "Copied the original brief, its run context, and any prompt attachments back into the composer."
      )
    );
  };
  const continueFromRun = (run) => {
    setContext(run.context);
    setContextSaveState("dirty");
    replaceDraftAttachments([]);
    applyQuickPrompt(buildContinuePrompt(run));
    setComposerSetupNote(
      setupNote(
        "Continuation brief prepared",
        "Kept this run's context, drafted a follow-up brief, and cleared attachments so you can add fresh local context if needed.",
        "working"
      )
    );
  };
  const retryRun = async (run) => {
    const originalBrief = run.initialPrompt?.trim();
    if (!originalBrief) {
      continueFromRun(run);
      return;
    }
    const promptMessage = findRunPromptMessage(run);
    setRunActionBusy(run.id, "launching");
    setContext(run.context);
    setContextSaveState("saving");
    try {
      await sendInput(
        {
          agentId: agent.id,
          threadId: thread?.threadId,
          content: originalBrief,
          attachments: promptMessage?.attachments ?? [],
          composer: run.context
        },
        true
      );
    } finally {
      clearRunActionBusy(run.id);
    }
  };
  const focusRun = (runId) => {
    const target = runCardRefs.current.get(runId);
    if (!target) {
      return;
    }
    if (!expandedRunIds.includes(runId)) {
      setExpandedRunIds((current) => [...current, runId]);
    }
    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  const handleComposerGuideAction = async (action) => {
    switch (action.kind) {
      case "focus_run":
        focusRun(action.runId);
        return;
      case "continue_run": {
        const targetRun = runs.find((run) => run.id === action.runId) ?? null;
        if (targetRun) {
          continueFromRun(targetRun);
        }
        return;
      }
      case "retry_run": {
        const targetRun = runs.find((run) => run.id === action.runId) ?? null;
        if (targetRun) {
          await retryRun(targetRun);
        }
        return;
      }
      case "restore_thread":
        await setThreadArchived(action.threadId, false);
        return;
    }
  };
  const copyLatestReply = async (run) => {
    const latestAgentMessage = [...run.entries].reverse().find((message) => message.role === "agent") ?? null;
    const text = latestAgentMessage?.content.trim() ?? "";
    if (!text) {
      return;
    }
    setRunActionBusy(run.id, "copying");
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to copy the latest outcome.");
    } finally {
      window.setTimeout(() => {
        clearRunActionBusy(run.id);
      }, 900);
    }
  };
  const stopRun = async (run) => {
    setRunActionBusy(run.id, "stopping");
    setSubmitError(null);
    try {
      await window.codexOffice.runtime.stopAgent(run.id);
      await hydrateThread();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to stop this run.");
    } finally {
      clearRunActionBusy(run.id);
    }
  };
  const renderMessageBlock = (block, message) => {
    if (block.type === "attachments") {
      return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-message-block conversation-message-block-attachments", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-block-heading", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Local context" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: `${block.attachments.length} attachment${block.attachments.length === 1 ? "" : "s"}` })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-message-attachment-grid", children: block.attachments.map((attachment) => {
          const badge = attachmentBadgeLabel(attachment);
          const previewSrc = attachmentPreviewSrc(attachment);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "conversation-message-attachment-card", "data-has-preview": previewSrc ? "true" : "false", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-attachment-visual", children: [
              previewSrc ? /* @__PURE__ */ jsxRuntimeExports.jsx("img", { alt: attachment.name, loading: "lazy", src: previewSrc }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-attachment-badge", children: badge }),
              previewSrc ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-message-attachment-kind", children: badge }) : null
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-attachment-copy", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: attachment.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("small", { children: [
                attachment.mimeType,
                " / ",
                formatAttachmentSize(attachment.size)
              ] }),
              formatAttachmentLocation(attachment) ? /* @__PURE__ */ jsxRuntimeExports.jsx("small", { children: formatAttachmentLocation(attachment) }) : null
            ] })
          ] }, attachment.id);
        }) })
      ] }, `${message.id}-attachments`);
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "conversation-message-block conversation-message-block-markdown", children: renderMarkdownContent(block.text, `${message.id}-markdown-${block.text.slice(0, 24)}`) }, `${message.id}-markdown-${block.text.slice(0, 24)}`);
  };
  const renderRunMessageCard = (message, _messageIndex, options) => {
    const isStreaming = message.role === "agent" && message.streamState === "streaming";
    const showIndicator = isStreaming && !blocksContainVisibleText(message.blocks);
    const isLinear = Boolean(options?.linear);
    const recordState = messageRecordState(message);
    const className = options?.linear ? "conversation-message-card conversation-message-card-linear" : "conversation-message-card";
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className, "data-kind": message.kind, "data-layout": options?.linear ? "linear" : "stacked", "data-role": message.role, "data-streaming": isStreaming, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-main", children: [
        !isLinear ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-ledger", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-ledger-primary", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-message-record-kind", children: messageRecordKind(message) }),
            recordState ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-message-record-state", children: recordState }) : null
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-message-ledger-secondary", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatTime(message.createdAt) }) })
        ] }) : null,
        !isLinear ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-message-header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-message-header-main", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-message-title-block", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { className: "conversation-message-kicker", children: recordEntryKicker(message) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: recordEntryTitle(message) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-message-facts", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: messageMetaSummary(message) }) })
        ] }) }) }) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-message-body", children: showIndicator ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { "aria-label": "Assistant is responding", className: "conversation-stream-indicator", role: "status", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {}),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", {})
        ] }) : message.blocks.map((block) => renderMessageBlock(block, message)) })
      ] })
    ] });
  };
  const renderTimelineItemCard = (item, options) => {
    const compact = Boolean(options?.compact);
    const compactApprovalEvent = compact && (item.eventType === "permission_requested" || item.eventType === "permission_decided" || item.eventType === "permission_denied" || item.eventType === "waiting_user_input" || item.eventType === "status_changed" && item.activityKind === "waiting_user_input");
    const commandResourceKey = `${item.id}:command`;
    const fileResourceKey = `${item.id}:file`;
    const commandResourceExpanded = expandedTimelineResourceIds.includes(commandResourceKey);
    const fileResourceExpanded = expandedTimelineResourceIds.includes(fileResourceKey);
    const detailCopy = item.detail && item.detail !== item.command && item.detail !== item.filePath ? item.detail : null;
    const compactCopy = compact ? compactChatProcessCopy(item) : null;
    const usageStats = item.usage ? [
      {
        label: "Tokens",
        value: item.usage.totalTokens.toLocaleString()
      },
      item.usage.reasoningTokens > 0 ? {
        label: "Reasoning",
        value: item.usage.reasoningTokens.toLocaleString()
      } : null,
      {
        label: "Cost",
        value: item.usage.estimatedCost !== null ? `$${item.usage.estimatedCost.toFixed(4)}` : "Not recorded"
      }
    ].filter(Boolean) : [];
    const timelineFacts = item.usage ? [] : item.facts;
    const visibleTimelineFacts = compact ? [] : timelineFacts;
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: `conversation-timeline-item tone-${item.tone}`, "data-compact": compact ? "true" : "false", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "aria-hidden": "true", className: "conversation-timeline-marker" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-copy", children: [
        compact ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-heading conversation-timeline-heading-compact", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-timeline-compact-summary", children: renderInlineMarkdown(compactCopy ?? item.title, `${item.id}-compact-summary`) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("small", { className: "conversation-timeline-time", children: formatTime(item.createdAt) })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-heading", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-title-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: item.title }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("small", { className: "conversation-timeline-time", children: formatTime(item.createdAt) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-timeline-label", children: item.label })
        ] }),
        !compact && detailCopy ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: detailCopy }) : null,
        compact && !compactApprovalEvent && detailCopy && detailCopy !== compactCopy ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-timeline-compact-detail", children: detailCopy }) : null,
        item.command && !compact && !compactApprovalEvent ? (
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-disclosure", "data-open": commandResourceExpanded, "data-resource": "command", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "conversation-timeline-resource-summary", onClick: () => toggleTimelineResource(commandResourceKey), type: "button", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-summary-copy", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Command" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: compactTimelineCommand(item.command) ?? "View exact command" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-summary-meta", children: [
                item.exitCode !== null ? /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: item.exitCode === 0 ? "Exit 0" : `Exit ${item.exitCode}` }) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: commandResourceExpanded ? "Hide command" : "Show command" })
              ] })
            ] }),
            commandResourceExpanded ? (
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-block", "data-resource": "command", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-heading", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Exact command" }),
                  item.exitCode !== null ? /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: item.exitCode === 0 ? "Exit 0" : `Exit ${item.exitCode}` }) : null
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: item.command })
              ] })
            ) : null
          ] })
        ) : null,
        item.filePath && !compact && !compactApprovalEvent ? (
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-disclosure", "data-open": fileResourceExpanded, "data-resource": "file", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { className: "conversation-timeline-resource-summary", onClick: () => toggleTimelineResource(fileResourceKey), type: "button", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-summary-copy", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "File" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: compactTimelinePath(item.filePath) ?? "View exact path" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-summary-meta", children: [
                timelineFileActionLabel(item.fileAction) ? /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: timelineFileActionLabel(item.fileAction) }) : null,
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fileResourceExpanded ? "Hide path" : "Show path" })
              ] })
            ] }),
            fileResourceExpanded ? (
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-block", "data-resource": "file", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-resource-heading", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Exact path" }),
                  timelineFileActionLabel(item.fileAction) ? /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: timelineFileActionLabel(item.fileAction) }) : null
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: item.filePath })
              ] })
            ) : null
          ] })
        ) : null,
        usageStats.length > 0 ? (
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-timeline-usage-grid", children: usageStats.map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: stat.label }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: stat.value })
          ] }, `${item.id}-${stat.label}`)) })
        ) : null,
        !compactApprovalEvent && (visibleTimelineFacts.length > 0 || item.riskKinds.length > 0 || item.approvalDecision) ? (
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-timeline-facts", children: [
            visibleTimelineFacts.map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, `${item.id}-${fact}`)),
            item.riskKinds.filter((risk) => !visibleTimelineFacts.includes(risk)).map((risk) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tone": "risk", children: risk }, `${item.id}-risk-${risk}`)),
            timelineApprovalDecisionLabel(item.approvalDecision) && !visibleTimelineFacts.includes(timelineApprovalDecisionLabel(item.approvalDecision) ?? "") ? (
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { "data-tone": item.approvalDecision === "deny" ? "error" : "ok", children: timelineApprovalDecisionLabel(item.approvalDecision) })
            ) : null
          ] })
        ) : null
      ] })
    ] }, item.id);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { "aria-label": "Thread workspace", className: "conversation-workspace-shell", "data-empty": isEmptyThread, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "conversation-workspace-header", "data-compact": showCompactHeaderOnly ? "true" : "false", "data-empty": isEmptyThread ? "true" : "false", children: [
      !showCompactHeaderOnly ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-workspace-title conversation-workspace-chrome", "data-compact": compactHeaderChrome ? "true" : "false", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        editingThreadTitle && thread ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-title-editor", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-workspace-kicker", children: "Rename thread" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "conversation-thread-title-input",
              disabled: threadTitleBusy,
              onChange: (event) => setThreadTitleDraft(event.target.value),
              onKeyDown: (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveThreadTitle();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setThreadTitleDraft(thread.title);
                  setEditingThreadTitle(false);
                }
              },
              value: threadTitleDraft
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-title-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "conversation-run-toggle", disabled: threadTitleBusy, onClick: () => void saveThreadTitle(), type: "button", children: threadTitleBusy ? "Saving..." : "Save" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                disabled: threadTitleBusy,
                onClick: () => {
                  setThreadTitleDraft(thread.title);
                  setEditingThreadTitle(false);
                },
                type: "button",
                children: "Cancel"
              }
            )
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          showWorkspaceHeaderKicker ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-workspace-kicker", children: workspaceHeaderKicker }) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-heading-row", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: workspaceHeaderTitle })
          ] }),
          showWorkspaceHeaderSubtitle ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-workspace-subtitle", children: workspaceHeaderSubtitle }) : null,
          workspaceHeaderFacts.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-workspace-utility-facts", children: workspaceHeaderFacts.map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, fact)) }) : null,
          headerStateFlags.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-workspace-meta", children: headerStateFlags.map((flag) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: flag }, flag)) }) : null
        ] })
      ] }) }) : null,
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-actions", children: [
        showHistoryAction && !compactHistoryInsideThreadGroup ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "conversation-workspace-action-group",
            "data-role": "history",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                "data-active": historyPanelOpen ? "true" : "false",
                onClick: () => setHistoryPanelOpen((current) => !current),
                type: "button",
                children: "History"
              }
            )
          }
        ) : null,
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-action-group", "data-role": "thread", children: [
          compactHistoryInsideThreadGroup ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "conversation-run-toggle",
              "data-active": historyPanelOpen ? "true" : "false",
              onClick: () => setHistoryPanelOpen((current) => !current),
              type: "button",
              children: "History"
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "conversation-ghost-button",
              "data-emphasis": "primary",
              disabled: newThreadDisabled,
              onClick: () => void createNewThread(),
              type: "button",
              children: "New thread"
            }
          ),
          onClose ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "conversation-ghost-button", onClick: onClose, type: "button", children: "Office" }) : null,
          showHeaderActionMenu ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-action-menu-wrap", ref: headerActionMenuRef, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                "aria-expanded": headerActionMenuOpen ? "true" : "false",
                "aria-haspopup": "menu",
                className: "conversation-ghost-button",
                disabled: controlsDisabled,
                onClick: () => setHeaderActionMenuOpen((current) => !current),
                type: "button",
                children: "More"
              }
            ),
            headerActionMenuOpen ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-action-menu-panel", role: "menu", children: [
              thread ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-action-menu-section", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "conversation-action-menu-item",
                    disabled: threadTitleBusy || threadTransitionBusy,
                    onClick: () => {
                      setThreadTitleDraft(thread.title);
                      setEditingThreadTitle((current) => !current);
                      setHeaderActionMenuOpen(false);
                    },
                    type: "button",
                    children: editingThreadTitle ? "Close rename" : "Rename"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "conversation-action-menu-item",
                    disabled: controlsDisabled || permissionRequest !== null,
                    onClick: () => {
                      setHeaderActionMenuOpen(false);
                      void setThreadArchived(thread.threadId, !isCurrentThreadArchived);
                    },
                    type: "button",
                    children: threadArchiveBusyId === thread.threadId ? isCurrentThreadArchived ? "Restoring..." : "Archiving..." : isCurrentThreadArchived ? "Restore" : "Archive"
                  }
                )
              ] }) : null,
              onDelete ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-action-menu-section", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    className: "conversation-action-menu-item conversation-action-menu-item-danger",
                    onClick: () => {
                      setHeaderActionMenuOpen(false);
                      void onDelete(agent.id);
                    },
                    type: "button",
                    children: "Remove"
                  }
                )
              ] }) : null
            ] }) : null
          ] }) : null
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-body", "data-sidebar-open": showWorkspaceSidebar ? "true" : "false", children: [
      showWorkspaceSidebar ? /* @__PURE__ */ jsxRuntimeExports.jsxs("aside", { className: "conversation-workspace-sidebar", "aria-label": "Workspace navigation", children: [
        showWorkspaceStrip ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-workspace-strip", "aria-label": "Workspace navigation", children: [
          showThreadRail ? /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "conversation-workspace-strip-card", "data-open": "true", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-strip-copy", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-run-section-kicker", children: "Thread history" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: currentThreadTitle }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Drafts, run history, approvals, and context stay attached to this thread." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-strip-facts", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${visibleThreads.length} visible` }),
          visibleThreadDigest.blocked > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${visibleThreadDigest.blocked} blocked` }) : null,
          visibleThreadDigest.active > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${visibleThreadDigest.active} live` }) : null,
          visibleThreadDigest.recovery > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${visibleThreadDigest.recovery} recovery` }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-strip-actions", children: [
          archivedThreadCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              className: "conversation-run-toggle",
              onClick: () => setShowArchivedThreads((current) => !current),
              type: "button",
              children: showArchivedThreads ? "Hide archived" : `Archived ${archivedThreadCount}`
            }
          ) : null,
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-rail-status", children: "Attached" })
        ] })
          ] }) : null,
          !isEmptyThread && showRunRail ? /* @__PURE__ */ jsxRuntimeExports.jsxs("article", { className: "conversation-workspace-strip-card", "data-open": "true", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-strip-copy", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-run-section-kicker", children: "Run history" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: featuredRun ? summarizeInitialPrompt(featuredRun.initialPrompt) : "Run history" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Move between outcomes, approvals, and recovery points without losing the current brief." })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-workspace-strip-facts", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${runs.length} run${runs.length === 1 ? "" : "s"}` }),
          runRailDigest.blocked > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${runRailDigest.blocked} blocked` }) : null,
          runRailDigest.active > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${runRailDigest.active} live` }) : null,
          runRailDigest.recovery > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: `${runRailDigest.recovery} recovery` }) : null
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-workspace-strip-actions", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-rail-status", children: runRailSummary }) })
          ] }) : null
        ] }) : null,
        showThreadRail || !isEmptyThread && showRunRail ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-supporting-nav", "aria-label": "Thread navigation", children: [
          showThreadRail ? isEmptyThread ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-thread-utility", "aria-label": "Thread history", "data-open": showThreadRailContent ? "true" : "false", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-utility-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-utility-copy", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Thread history" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open another thread without leaving this workspace." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-utility-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-rail-status", children: `${visibleThreads.length} thread${visibleThreads.length === 1 ? "" : "s"}` }),
            archivedThreadCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                "data-active": showArchivedThreads ? "true" : "false",
                onClick: () => setShowArchivedThreads((current) => !current),
                type: "button",
                children: showArchivedThreads ? "Hide archived" : `Archived ${archivedThreadCount}`
              }
            ) : null
          ] })
        ] }),
        showThreadRailContent ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-utility-content", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-grid", children: visibleThreads.map((item, index) => {
          const tone = item.latestStatus ? runStatusTone(item.latestStatus) : "neutral";
          const attention = threadAttentionLabel(item);
          const isActiveThread = thread?.threadId === item.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "article",
            {
              className: "conversation-thread-list-card",
              "data-active": isActiveThread,
              "data-attention": attention ? "true" : "false",
              "data-tone": tone,
              onClick: () => {
                if (!controlsDisabled && permissionRequest === null) {
                  void switchThread(item.id);
                }
              },
              onKeyDown: (event) => {
                if (controlsDisabled || permissionRequest !== null) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void switchThread(item.id);
                }
              },
              role: "button",
              tabIndex: controlsDisabled || permissionRequest !== null ? -1 : 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-card-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `conversation-pill ${tone}`, children: attention ?? (item.latestStatus ? runStatusLabel(item.latestStatus) : "New") }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: item.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-thread-list-summary", children: threadCardSummary(item, Boolean(isActiveThread), attention) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-meta", children: buildThreadCardFacts(item, Boolean(isActiveThread), attention).map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, `${item.id}-${fact}`)) })
              ]
            },
            item.id
          );
        }) }) }) : null
          ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-nav-section conversation-thread-list", "aria-label": "Thread history", "data-open": showThreadRailContent ? "true" : "false", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-nav-panel-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-nav-copy", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-run-section-kicker", children: "Thread history" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Thread history" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: isEmptyThread ? "Open an earlier thread from this workspace." : "Move between thread histories without losing the current draft." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-nav-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-rail-status", children: `${visibleThreads.length} thread${visibleThreads.length === 1 ? "" : "s"}` }),
            archivedThreadCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                "data-active": showArchivedThreads ? "true" : "false",
                onClick: () => setShowArchivedThreads((current) => !current),
                type: "button",
                children: showArchivedThreads ? "Hide archived" : `Archived ${archivedThreadCount}`
              }
            ) : null
          ] })
        ] }),
        showThreadRailContent ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-nav-content", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-grid", children: visibleThreads.map((item, index) => {
          const tone = item.latestStatus ? runStatusTone(item.latestStatus) : "neutral";
          const attention = threadAttentionLabel(item);
          const isActiveThread = thread?.threadId === item.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "article",
            {
              className: "conversation-thread-list-card",
              "data-active": isActiveThread,
              "data-attention": attention ? "true" : "false",
              "data-tone": tone,
              onClick: () => {
                if (!controlsDisabled && permissionRequest === null) {
                  void switchThread(item.id);
                }
              },
              onKeyDown: (event) => {
                if (controlsDisabled || permissionRequest !== null) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void switchThread(item.id);
                }
              },
              role: "button",
              tabIndex: controlsDisabled || permissionRequest !== null ? -1 : 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-card-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `conversation-pill ${tone}`, children: attention ?? (item.latestStatus ? runStatusLabel(item.latestStatus) : "New") }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: item.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-thread-list-summary", children: threadCardSummary(item, Boolean(isActiveThread), attention) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-meta", children: buildThreadCardFacts(item, Boolean(isActiveThread), attention).map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, `${item.id}-${fact}`)) })
              ]
            },
            item.id
          );
        }) }) }) : null
          ] }) : null,
          !isEmptyThread && showRunRail ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-nav-section conversation-thread-map", "aria-label": "Run history", "data-open": showRunRailContent ? "true" : "false", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-nav-panel-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-nav-copy", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-run-section-kicker", children: "Run history" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Run history" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Move between run outcomes, approvals, and recoveries." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-nav-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-rail-status", children: `${runs.length} run${runs.length === 1 ? "" : "s"}` })
          ] })
        ] }),
        showRunRailContent ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-nav-content", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-map-grid", children: runRailRuns.map((run) => {
          const tone = runStatusTone(run.status);
          const latestReplyPreview = summarizeLatestAgentReply(run);
          const preview = latestReplyPreview ?? summarizeTimelineEntry(run);
          const expanded = expandedRunIds.includes(run.id);
          const isFeaturedRun = featuredRunId === run.id;
          const attentionKind = runAttentionKind(
            run,
            permissionRequest?.sessionId === run.id ? permissionRequest : null,
            isFeaturedRun
          );
          const runMapFacts = buildRunMapFacts(run);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              className: "conversation-thread-map-card",
              "data-active": isFeaturedRun,
              "data-attention": attentionKind,
              "data-expanded": expanded,
              "data-tone": tone,
              onClick: () => focusRun(run.id),
              type: "button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-map-card-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `conversation-pill ${tone}`, children: runAttentionLabel(attentionKind, isFeaturedRun).join(" / ") || runStatusLabel(run.status) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: summarizeInitialPrompt(run.initialPrompt) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: preview }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-map-facts", children: runMapFacts.map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, `${run.id}-${fact}`)) })
              ]
            },
            `${run.id}-map`
          );
        }) }) }) : null
          ] }) : null
        ] }) : null
      ] }) : null,
      !isEmptyThread ? /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "conversation-thread-surface", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-scroll", children: runs.map((run) => {
      const minimalRunIsLive = !isRunTerminal(run);
      const minimalInlineApprovalRequest = permissionRequest?.sessionId === run.id ? permissionRequest : null;
      const minimalRunBusyState = runActionState[run.id] ?? "idle";
      const minimalShowRetryAction = isRunRecoveryState(run);
      const minimalMaskRecoveryDuringLaunch = busy && featuredRunId === run.id && !minimalRunIsLive && permissionRequest === null;
      const minimalDisplayRunIsLive = minimalRunIsLive || minimalMaskRecoveryDuringLaunch;
      const minimalShowRecoveryAction = minimalShowRetryAction && !minimalMaskRecoveryDuringLaunch;
      const minimalCompactTokenLine = !minimalDisplayRunIsLive && run.summary.totalTokens > 0 ? `${run.summary.totalTokens.toLocaleString()} tokens${run.summary.reasoningTokens > 0 ? ` / ${run.summary.reasoningTokens.toLocaleString()} reasoning` : ""}` : null;
      const minimalRunStatusText = minimalDisplayRunIsLive ? "Thinking" : minimalShowRecoveryAction ? run.status === "stopped" ? "Run stopped early." : "Run ended early." : null;
      const minimalRenderVisibleItems = run.entries.filter((entry) => entry.kind !== "system_note").map((entry, runEntryIndex) => ({
        entryId: entry.id,
        runEntryIndex,
        entry
      })).filter(
        (item) =>
          !(item.entry.role === "agent" && item.entry.streamState === "streaming" && !blocksContainVisibleText(item.entry.blocks) && item.entry.attachments.length === 0)
      );
      const minimalRunActionDisabled = decisionBusy || minimalRunBusyState === "stopping" || minimalRunBusyState === "launching";

      return (
        <article
          key={run.id}
          className="conversation-run-thread"
          data-active={featuredRunId === run.id}
          data-attention={runAttentionKind(run, minimalInlineApprovalRequest, featuredRunId === run.id)}
          data-expanded="false"
          data-layout="minimal"
          ref={(node) => {
            runCardRefs.current.set(run.id, node);
          }}
        >
          <section className="conversation-run-main-flow">
            <section className="conversation-run-visible-stream-shell" data-flat="true" data-layout="minimal">
              {minimalInlineApprovalRequest ? (
                <section className="conversation-approval-card conversation-run-inline-approval conversation-run-inline-approval-flow">
                  <div>
                    <p className="conversation-empty-kicker">Approval needed</p>
                    <strong>{minimalInlineApprovalRequest.redactedCommand}</strong>
                    <div className="conversation-approval-meta">
                      <span>{riskLevelLabel(minimalInlineApprovalRequest.riskLevel)}</span>
                      <span>{summarizeRiskKinds(minimalInlineApprovalRequest.riskKinds)}</span>
                    </div>
                    <p>{minimalInlineApprovalRequest.reasons.join(" - ") || "Allow or deny the blocked action to move the run forward."}</p>
                  </div>
                  <div className="conversation-approval-actions">
                    <button disabled={decisionBusy} onClick={() => void handleDecision("allow_once")} type="button">
                      Allow once
                    </button>
                    <button disabled={decisionBusy} onClick={() => void handleDecision("allow_project")} type="button">
                      Allow for project
                    </button>
                    <button disabled={decisionBusy} onClick={() => void handleDecision("deny")} type="button">
                      Deny
                    </button>
                  </div>
                </section>
              ) : null}
              {minimalRenderVisibleItems.length > 0 ? (
                <div className="conversation-record-group-list conversation-record-group-list-flat">
                  {minimalRenderVisibleItems.map((item) => (
                    <div
                      className="conversation-run-visible-entry conversation-run-visible-entry-flat"
                      data-kind={item.entry.kind}
                      key={`${run.id}-flat-visible-${item.entryId}`}
                    >
                      {renderRunMessageCard(item.entry, item.runEntryIndex, { linear: true })}
                    </div>
                  ))}
                </div>
              ) : null}
              {minimalRunStatusText || minimalCompactTokenLine || minimalDisplayRunIsLive || minimalShowRecoveryAction ? (
                <div className="conversation-run-minimal-footer">
                  <div className="conversation-run-minimal-meta">
                    <div className="conversation-run-minimal-copy">
                      {minimalRunStatusText ? <p>{minimalRunStatusText}</p> : null}
                      {minimalCompactTokenLine ? (
                        <div className="conversation-run-minimal-facts">
                          <span>{minimalCompactTokenLine}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="conversation-run-actions conversation-run-actions-minimal">
                      {minimalShowRecoveryAction ? (
                        <button
                          className="conversation-run-toggle conversation-run-toggle-utility"
                          disabled={controlsDisabled}
                          onClick={() => continueFromRun(run)}
                          type="button"
                        >
                          Continue
                        </button>
                      ) : null}
                      {minimalShowRecoveryAction ? (
                        <button
                          className="conversation-run-toggle conversation-run-toggle-utility"
                          disabled={controlsDisabled}
                          onClick={() => void retryRun(run)}
                          type="button"
                        >
                          {minimalRunBusyState === "launching" ? "Retrying..." : "Retry"}
                        </button>
                      ) : null}
                      {minimalShowRecoveryAction && run.initialPrompt && !run.summary.waitingForApproval ? (
                        <button
                          className="conversation-run-toggle conversation-run-toggle-utility"
                          disabled={controlsDisabled}
                          onClick={() => restoreRunBrief(run)}
                          type="button"
                        >
                          Reuse brief
                        </button>
                      ) : null}
                      {minimalDisplayRunIsLive ? (
                        <button
                          className="conversation-run-toggle conversation-run-toggle-utility"
                          disabled={minimalRunActionDisabled}
                          onClick={() => void stopRun(run)}
                          type="button"
                        >
                          {minimalRunBusyState === "stopping" ? "Stopping..." : "Stop"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </section>
        </article>
      );

        }) }) }) : null,
      showEmptyThreadUtility ? /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "conversation-thread-utility conversation-empty-thread-utility", "aria-label": "Thread history", "data-open": showThreadRailContent ? "true" : "false", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-utility-head", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-utility-copy", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Thread history" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Open another thread without leaving this workspace." })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "conversation-thread-utility-actions", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "conversation-rail-status", children: `${visibleThreads.length} thread${visibleThreads.length === 1 ? "" : "s"}` }),
            archivedThreadCount > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                className: "conversation-run-toggle",
                "data-active": showArchivedThreads ? "true" : "false",
                onClick: () => setShowArchivedThreads((current) => !current),
                type: "button",
                children: showArchivedThreads ? "Hide archived" : `Archived ${archivedThreadCount}`
              }
            ) : null
          ] })
        ] }),
        showThreadRailContent ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-utility-content", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-grid", children: visibleThreads.map((item, index) => {
          const tone = item.latestStatus ? runStatusTone(item.latestStatus) : "neutral";
          const attention = threadAttentionLabel(item);
          const isActiveThread = thread?.threadId === item.id;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "article",
            {
              className: "conversation-thread-list-card",
              "data-active": isActiveThread,
              "data-attention": attention ? "true" : "false",
              "data-tone": tone,
              onClick: () => {
                if (!controlsDisabled && permissionRequest === null) {
                  void switchThread(item.id);
                }
              },
              onKeyDown: (event) => {
                if (controlsDisabled || permissionRequest !== null) {
                  return;
                }
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void switchThread(item.id);
                }
              },
              role: "button",
              tabIndex: controlsDisabled || permissionRequest !== null ? -1 : 0,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-card-top", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: `conversation-pill ${tone}`, children: attention ?? (item.latestStatus ? runStatusLabel(item.latestStatus) : "New") }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: item.title }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-thread-list-summary", children: threadCardSummary(item, Boolean(isActiveThread), attention) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "conversation-thread-list-meta", children: buildThreadCardFacts(item, Boolean(isActiveThread), attention).map((fact) => /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: fact }, `${item.id}-${fact}`)) })
              ]
            },
            item.id
          );
        }) }) }) : null
      ] }) : null,
      renderConversationComposerShell(),
      submitError ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "conversation-submit-error", children: submitError }) : null
    ] })
  ] });
}
