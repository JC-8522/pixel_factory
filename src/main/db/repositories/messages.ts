import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type MessageRecord = {
  id: string;
  session_id: string | null;
  agent_id: string | null;
  meeting_id: string | null;
  role: string;
  content: string;
  stream_state: string;
  parent_message_id: string | null;
  metadata_json: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  usage_source: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateMessageInput = {
  id: string;
  role: string;
  content: string;
  sessionId?: string | null;
  agentId?: string | null;
  meetingId?: string | null;
  streamState?: string;
  parentMessageId?: string | null;
  metadata?: unknown;
};

export const createMessage = (client: DatabaseClient, input: CreateMessageInput): MessageRecord => {
  const timestamp = nowIso();

  client.run(
    `INSERT INTO messages (
      id,
      session_id,
      agent_id,
      meeting_id,
      role,
      content,
      stream_state,
      parent_message_id,
      metadata_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      nullable(input.sessionId),
      nullable(input.agentId),
      nullable(input.meetingId),
      input.role,
      input.content,
      input.streamState ?? "complete",
      nullable(input.parentMessageId),
      jsonStringify(input.metadata, "{}"),
      timestamp,
      timestamp
    ]
  );

  return getMessage(client, input.id) as MessageRecord;
};

export const getMessage = (client: DatabaseClient, messageId: string): MessageRecord | null =>
  client.get<MessageRecord>("SELECT * FROM messages WHERE id = ?", [messageId]);

export const listMessagesBySession = (client: DatabaseClient, sessionId: string): MessageRecord[] =>
  client.all<MessageRecord>("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", [sessionId]);

export const appendMessageContent = (client: DatabaseClient, messageId: string, chunk: string): MessageRecord => {
  client.run("UPDATE messages SET content = content || ?, updated_at = ? WHERE id = ?", [chunk, nowIso(), messageId]);
  const message = getMessage(client, messageId);

  if (!message) {
    throw new Error(`Message not found: ${messageId}`);
  }

  return message;
};
