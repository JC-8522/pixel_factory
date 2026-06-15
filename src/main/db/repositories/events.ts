import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type EventRecord = {
  id: string;
  type: string;
  actor_type: string;
  actor_id: string | null;
  agent_id: string | null;
  session_id: string | null;
  task_id: string | null;
  meeting_id: string | null;
  severity: string;
  payload_json: string;
  created_at: string;
};

export type CreateEventInput = {
  id: string;
  type: string;
  actorType: "user" | "agent" | "system";
  actorId?: string | null;
  agentId?: string | null;
  sessionId?: string | null;
  taskId?: string | null;
  meetingId?: string | null;
  severity?: string;
  payload?: unknown;
};

export type EventFilter = {
  agentId?: string;
  taskId?: string;
  meetingId?: string;
  type?: string;
};

export const createEvent = (client: DatabaseClient, input: CreateEventInput): EventRecord => {
  client.run(
    `INSERT INTO events (
      id,
      type,
      actor_type,
      actor_id,
      agent_id,
      session_id,
      task_id,
      meeting_id,
      severity,
      payload_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.type,
      input.actorType,
      nullable(input.actorId),
      nullable(input.agentId),
      nullable(input.sessionId),
      nullable(input.taskId),
      nullable(input.meetingId),
      input.severity ?? "info",
      jsonStringify(input.payload, "{}"),
      nowIso()
    ]
  );

  return getEvent(client, input.id) as EventRecord;
};

export const getEvent = (client: DatabaseClient, eventId: string): EventRecord | null =>
  client.get<EventRecord>("SELECT * FROM events WHERE id = ?", [eventId]);

export const listEvents = (client: DatabaseClient, filter: EventFilter = {}): EventRecord[] => {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filter.agentId) {
    clauses.push("agent_id = ?");
    params.push(filter.agentId);
  }

  if (filter.taskId) {
    clauses.push("task_id = ?");
    params.push(filter.taskId);
  }

  if (filter.meetingId) {
    clauses.push("meeting_id = ?");
    params.push(filter.meetingId);
  }

  if (filter.type) {
    clauses.push("type = ?");
    params.push(filter.type);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return client.all<EventRecord>(`SELECT * FROM events ${where} ORDER BY created_at ASC`, params);
};

