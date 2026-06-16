import type { AgentStatus } from "./app";

export type RuntimeKind = "mock" | "codex_cli";

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  estimatedCost?: number | null;
  costCurrency?: string | null;
  usageSource: "reported" | "estimated" | "manual";
};

type RuntimeEventBase = {
  id: string;
  agentId: string;
  sessionId: string;
  at: string;
};

export type RuntimeFileAction = "read" | "created" | "updated" | "deleted";

export type AgentRuntimeEvent =
  | (RuntimeEventBase & { type: "session_started" })
  | (RuntimeEventBase & { type: "status_changed"; status: AgentStatus })
  | (RuntimeEventBase & { type: "message_chunk"; messageId: string; chunk: string })
  | (RuntimeEventBase & { type: "log_line"; stream: "stdout" | "stderr"; line: string })
  | (RuntimeEventBase & { type: "token_usage"; messageId?: string; taskId?: string; modelProfile?: string | null; usage: TokenUsage })
  | (RuntimeEventBase & { type: "command_started"; command: string })
  | (RuntimeEventBase & { type: "command_completed"; command: string; exitCode: number | null })
  | (RuntimeEventBase & { type: "file_touched"; path: string; action: RuntimeFileAction })
  | (RuntimeEventBase & { type: "waiting_user_input"; prompt?: string })
  | (RuntimeEventBase & { type: "error"; message: string })
  | (RuntimeEventBase & { type: "session_completed" })
  | (RuntimeEventBase & { type: "session_stopped" });

export type SpawnRuntimeInput = {
  agentId: string;
  sessionId: string;
  workingDirectory: string;
  initialPrompt?: string | null;
  modelProfile?: string | null;
  permissionMode?: string | null;
  skillPromptContext?: string | null;
};

export type SendRuntimeMessageInput = {
  sessionId: string;
  agentId: string;
  message: string;
  inputMessageId: string;
  responseMessageId: string;
  taskId?: string | null;
  modelProfile?: string | null;
  skillPromptContext?: string | null;
};

export type RuntimeSessionDescriptor = {
  agentId: string;
  sessionId: string;
  runtimeKind: RuntimeKind;
};
