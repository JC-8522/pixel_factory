import type { DatabaseClient } from "../db/client";
import { createEvent, type EventRecord } from "../db/repositories";

export type AuditActorType = "user" | "agent" | "system";

export type RecordAuditEventInput = {
  id: string;
  type: string;
  actorType: AuditActorType;
  actorId?: string | null;
  agentId?: string | null;
  sessionId?: string | null;
  taskId?: string | null;
  meetingId?: string | null;
  severity?: string;
  payload?: unknown;
};

export const recordAuditEvent = (client: DatabaseClient, input: RecordAuditEventInput): EventRecord =>
  createEvent(client, input);
