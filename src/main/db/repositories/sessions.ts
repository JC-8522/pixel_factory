import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type SessionRecord = {
  id: string;
  agent_id: string;
  runtime_kind: string;
  external_session_id: string | null;
  process_id: number | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  working_directory: string;
  initial_prompt: string | null;
  model_profile: string | null;
  exit_code: number | null;
  error_message: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached_tokens: number;
  reasoning_tokens: number;
  estimated_cost: number | null;
  cost_currency: string | null;
  usage_source: string | null;
  metadata_json: string;
};

export type CreateSessionInput = {
  id: string;
  agentId: string;
  runtimeKind: string;
  status: string;
  workingDirectory: string;
  externalSessionId?: string | null;
  processId?: number | null;
  initialPrompt?: string | null;
  modelProfile?: string | null;
  metadata?: unknown;
};

export const createSession = (client: DatabaseClient, input: CreateSessionInput): SessionRecord => {
  client.run(
    `INSERT INTO sessions (
      id,
      agent_id,
      runtime_kind,
      external_session_id,
      process_id,
      status,
      started_at,
      working_directory,
      initial_prompt,
      model_profile,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.agentId,
      input.runtimeKind,
      nullable(input.externalSessionId),
      input.processId ?? null,
      input.status,
      nowIso(),
      input.workingDirectory,
      nullable(input.initialPrompt),
      nullable(input.modelProfile),
      jsonStringify(input.metadata, "{}")
    ]
  );

  return getSession(client, input.id) as SessionRecord;
};

export const getSession = (client: DatabaseClient, sessionId: string): SessionRecord | null =>
  client.get<SessionRecord>("SELECT * FROM sessions WHERE id = ?", [sessionId]);

export const listSessionsForAgent = (client: DatabaseClient, agentId: string): SessionRecord[] =>
  client.all<SessionRecord>("SELECT * FROM sessions WHERE agent_id = ? ORDER BY started_at ASC", [agentId]);

export const endSession = (
  client: DatabaseClient,
  input: { sessionId: string; status: string; exitCode?: number | null; errorMessage?: string | null }
): SessionRecord => {
  client.run("UPDATE sessions SET status = ?, ended_at = ?, exit_code = ?, error_message = ? WHERE id = ?", [
    input.status,
    nowIso(),
    input.exitCode ?? null,
    input.errorMessage ?? null,
    input.sessionId
  ]);
  const session = getSession(client, input.sessionId);

  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  return session;
};

export const updateSessionMetadata = (client: DatabaseClient, sessionId: string, metadata: unknown): SessionRecord => {
  client.run("UPDATE sessions SET metadata_json = ? WHERE id = ?", [jsonStringify(metadata, "{}"), sessionId]);
  const session = getSession(client, sessionId);

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  return session;
};
