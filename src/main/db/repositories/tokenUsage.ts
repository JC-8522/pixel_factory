import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type TokenUsageRecord = {
  id: string;
  agent_id: string | null;
  session_id: string | null;
  message_id: string | null;
  task_id: string | null;
  model_profile: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number | null;
  cost_currency: string | null;
  usage_source: string;
  metadata_json: string;
  created_at: string;
};

export type CreateTokenUsageInput = {
  id: string;
  agentId?: string | null;
  sessionId?: string | null;
  messageId?: string | null;
  taskId?: string | null;
  modelProfile?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  estimatedCost?: number | null;
  costCurrency?: string | null;
  usageSource: "reported" | "estimated" | "manual";
  metadata?: unknown;
};

export const createTokenUsage = (client: DatabaseClient, input: CreateTokenUsageInput): TokenUsageRecord => {
  const inputTokens = input.inputTokens ?? 0;
  const outputTokens = input.outputTokens ?? 0;
  const totalTokens = input.totalTokens ?? inputTokens + outputTokens;
  const cachedTokens = input.cachedTokens ?? 0;
  const reasoningTokens = input.reasoningTokens ?? 0;
  const estimatedCost = input.estimatedCost ?? null;

  client.run(
    `INSERT INTO token_usage (
      id,
      agent_id,
      session_id,
      message_id,
      task_id,
      model_profile,
      input_tokens,
      output_tokens,
      total_tokens,
      cached_tokens,
      reasoning_tokens,
      estimated_cost,
      cost_currency,
      usage_source,
      metadata_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      nullable(input.agentId),
      nullable(input.sessionId),
      nullable(input.messageId),
      nullable(input.taskId),
      nullable(input.modelProfile),
      inputTokens,
      outputTokens,
      totalTokens,
      cachedTokens,
      reasoningTokens,
      estimatedCost,
      nullable(input.costCurrency),
      input.usageSource,
      jsonStringify(input.metadata, "{}"),
      nowIso()
    ]
  );

  if (input.sessionId) {
    client.run(
      `UPDATE sessions
       SET input_tokens = input_tokens + ?,
           output_tokens = output_tokens + ?,
           total_tokens = total_tokens + ?,
           cached_tokens = cached_tokens + ?,
           reasoning_tokens = reasoning_tokens + ?,
           estimated_cost = COALESCE(estimated_cost, 0) + COALESCE(?, 0),
           cost_currency = COALESCE(?, cost_currency),
           usage_source = ?
       WHERE id = ?`,
      [
        inputTokens,
        outputTokens,
        totalTokens,
        cachedTokens,
        reasoningTokens,
        estimatedCost,
        nullable(input.costCurrency),
        input.usageSource,
        input.sessionId
      ]
    );
  }

  if (input.messageId) {
    client.run(
      `UPDATE messages
       SET input_tokens = input_tokens + ?,
           output_tokens = output_tokens + ?,
           total_tokens = total_tokens + ?,
           usage_source = ?
       WHERE id = ?`,
      [inputTokens, outputTokens, totalTokens, input.usageSource, input.messageId]
    );
  }

  return client.get<TokenUsageRecord>("SELECT * FROM token_usage WHERE id = ?", [input.id]) as TokenUsageRecord;
};

export const listTokenUsageByAgent = (client: DatabaseClient, agentId: string): TokenUsageRecord[] =>
  client.all<TokenUsageRecord>("SELECT * FROM token_usage WHERE agent_id = ? ORDER BY created_at ASC", [agentId]);

export const summarizeTokenUsageByAgent = (
  client: DatabaseClient,
  agentId: string
): { input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost: number } =>
  client.get<{ input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost: number }>(
    `SELECT
      COALESCE(SUM(input_tokens), 0) AS input_tokens,
      COALESCE(SUM(output_tokens), 0) AS output_tokens,
      COALESCE(SUM(total_tokens), 0) AS total_tokens,
      COALESCE(SUM(estimated_cost), 0) AS estimated_cost
    FROM token_usage
    WHERE agent_id = ?`,
    [agentId]
  ) as { input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost: number };
