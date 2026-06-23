import type { AgentStatus } from "./app";

export type ConversationAttachmentRef = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  source: "local_draft";
  filePath?: string | null;
};

export type ConversationComposerContext = {
  workspaceId: string;
  workspaceRoot: string;
  mode: "local" | "attached";
  branch: string;
  profileId?: string | null;
  profileLabel?: string | null;
  modelProfile: string;
  approvalMode: string;
};

export type ConversationEntryBlock =
  | { type: "markdown"; text: string }
  | { type: "attachments"; attachments: ConversationAttachmentRef[] };

export type ConversationEntryKind = "user_prompt" | "assistant_response" | "system_note";

export type ConversationEntryView = {
  id: string;
  sessionId: string | null;
  role: string;
  kind: ConversationEntryKind;
  streamState: string;
  createdAt: string;
  parentMessageId: string | null;
  blocks: ConversationEntryBlock[];
  attachments: ConversationAttachmentRef[];
  content: string;
};

export type ConversationTimelineEntry = {
  id: string;
  eventType: string;
  stage: "progress" | "commands" | "files" | "approval" | "response" | "usage" | "issues" | "activity";
  activityKind: AgentStatus | "response" | "usage" | "session" | null;
  label: string;
  title: string;
  detail: string | null;
  facts: string[];
  tone: "neutral" | "working" | "waiting" | "error";
  createdAt: string;
  status: string | null;
  command: string | null;
  filePath: string | null;
  fileAction: string | null;
  exitCode: number | null;
  approvalDecision: string | null;
  riskKinds: string[];
  response?:
    | {
        updateCount: number;
        totalChars: number;
      }
    | null;
  usage:
    | {
        totalTokens: number;
        reasoningTokens: number;
        estimatedCost: number | null;
      }
    | null;
};

export type ConversationRunSummary = {
  commandCount: number;
  commands: string[];
  reviewedFiles: string[];
  changedFiles: string[];
  approvalRequestCount: number;
  waitingForApproval: boolean;
  durationMs: number | null;
  totalTokens: number;
  reasoningTokens: number;
  estimatedCost: number | null;
};

export type ConversationProcessStageView = {
  id: string;
  title: string;
  kicker: string;
  summary: string;
  tone: "neutral" | "working" | "waiting" | "error";
  stateLabel: string;
  latestAt: string | null;
  items: ConversationTimelineEntry[];
};

export type ConversationRecordGroupItemView = {
  entryId: string;
  runEntryIndex: number;
  entry: ConversationEntryView;
};

export type ConversationRecordGroupView = {
  id: string;
  kind: ConversationEntryKind;
  title: string;
  detail: string;
  facts: string[];
  items: ConversationRecordGroupItemView[];
};

export type ConversationVisibleFlowBlockView =
  | {
      id: string;
      kind: "process_summary" | "approval_summary";
      kicker: string;
      title: string;
      detail: string;
      facts: string[];
      tone: "neutral" | "working" | "waiting" | "error";
    }
  | {
      id: string;
      kind: "message_group";
      kicker: string;
      title: string;
      detail: string;
      facts: string[];
      tone: "neutral" | "working" | "waiting" | "error";
      group: ConversationRecordGroupView;
    };

export type ConversationRunView = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  initialPrompt: string | null;
  context: ConversationComposerContext;
  entries: ConversationEntryView[];
  process: ConversationTimelineEntry[];
  processStages: ConversationProcessStageView[];
  recordGroups: ConversationRecordGroupView[];
  visibleFlowBlocks: ConversationVisibleFlowBlockView[];
  summary: ConversationRunSummary;
};

export type ConversationThreadSummary = {
  id: string;
  title: string;
  startedAt: string | null;
  lastUpdatedAt: string | null;
  runCount: number;
  latestStatus: string | null;
  blockedRunCount: number;
  recoveryRunCount: number;
  activeRunCount: number;
  archived: boolean;
  archivedAt: string | null;
};

export type ConversationThreadView = {
  agentId: string;
  threadId: string;
  title: string;
  composer: ConversationComposerContext;
  draft: string;
  runs: ConversationRunView[];
  totalEntries: number;
  availableThreads: ConversationThreadSummary[];
};

export type ConversationFlowRule = {
  id: string;
  label: string;
  fromRole: string;
  toRole: string;
  trigger: "after_message" | "review_requested" | "revision_requested" | "accepted" | "max_rounds";
  stopCondition?: "accepted" | "max_rounds" | "manager_escalation";
  maxRounds?: number;
};

export type ConversationTurn = {
  messageId: string;
  sourceAgentId?: string | null;
  targetAgentId?: string | null;
  sourceRole: string;
  content: string;
  accepted?: boolean;
  needsManager?: boolean;
  parentMessageId?: string | null;
  flowRuleId?: string | null;
};

export type ConversationWorkflowState = {
  rules: ConversationFlowRule[];
  turns: ConversationTurn[];
  round: number;
  status: "running" | "accepted" | "max_rounds" | "manager_escalation";
};

export type ConversationWorkflowDecision = {
  status: ConversationWorkflowState["status"];
  nextRole?: string;
  triggeredRuleId?: string;
  reason: string;
};
