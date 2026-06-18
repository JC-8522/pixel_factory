import type { DatabaseClient } from "../client";
import { jsonStringify, nowIso, nullable } from "./utils";

export type MeetingRecord = {
  id: string;
  title: string;
  goal: string;
  moderator_agent_id: string | null;
  output_format: string | null;
  status: string;
  summary: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
};

export type MeetingParticipantRecord = {
  meeting_id: string;
  agent_id: string;
  role: string;
  joined_at: string;
};

export type MeetingMessageRecord = {
  id: string;
  meeting_id: string;
  agent_id: string | null;
  role: string;
  content: string;
  created_at: string;
  metadata_json: string;
};

export type CreateMeetingInput = {
  id: string;
  title: string;
  goal: string;
  moderatorAgentId?: string | null;
  outputFormat?: string | null;
  status?: string;
};

export const createMeeting = (client: DatabaseClient, input: CreateMeetingInput): MeetingRecord => {
  const timestamp = nowIso();

  client.run(
    `INSERT INTO meetings (
      id,
      title,
      goal,
      moderator_agent_id,
      output_format,
      status,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.title,
      input.goal,
      nullable(input.moderatorAgentId),
      nullable(input.outputFormat),
      input.status ?? "draft",
      timestamp,
      timestamp
    ]
  );

  return getMeeting(client, input.id) as MeetingRecord;
};

export const getMeeting = (client: DatabaseClient, meetingId: string): MeetingRecord | null =>
  client.get<MeetingRecord>("SELECT * FROM meetings WHERE id = ?", [meetingId]);

export const listMeetings = (client: DatabaseClient): MeetingRecord[] =>
  client.all<MeetingRecord>("SELECT * FROM meetings ORDER BY created_at ASC");

export const addMeetingParticipant = (
  client: DatabaseClient,
  input: { meetingId: string; agentId: string; role: string }
): MeetingParticipantRecord => {
  client.run(
    `INSERT INTO meeting_participants (meeting_id, agent_id, role, joined_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(meeting_id, agent_id) DO UPDATE SET role = excluded.role`,
    [input.meetingId, input.agentId, input.role, nowIso()]
  );

  return client.get<MeetingParticipantRecord>(
    "SELECT * FROM meeting_participants WHERE meeting_id = ? AND agent_id = ?",
    [input.meetingId, input.agentId]
  ) as MeetingParticipantRecord;
};

export const listMeetingParticipants = (client: DatabaseClient, meetingId: string): MeetingParticipantRecord[] =>
  client.all<MeetingParticipantRecord>(
    "SELECT * FROM meeting_participants WHERE meeting_id = ? ORDER BY joined_at ASC",
    [meetingId]
  );

export const addMeetingMessage = (
  client: DatabaseClient,
  input: { id: string; meetingId: string; agentId?: string | null; role: string; content: string; metadata?: unknown }
): MeetingMessageRecord => {
  client.run(
    `INSERT INTO meeting_messages (id, meeting_id, agent_id, role, content, created_at, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.meetingId,
      nullable(input.agentId),
      input.role,
      input.content,
      nowIso(),
      jsonStringify(input.metadata, "{}")
    ]
  );

  return client.get<MeetingMessageRecord>("SELECT * FROM meeting_messages WHERE id = ?", [
    input.id
  ]) as MeetingMessageRecord;
};

export const listMeetingMessages = (client: DatabaseClient, meetingId: string): MeetingMessageRecord[] =>
  client.all<MeetingMessageRecord>("SELECT * FROM meeting_messages WHERE meeting_id = ? ORDER BY created_at ASC", [
    meetingId
  ]);

export const completeMeeting = (client: DatabaseClient, meetingId: string, summary: string): MeetingRecord => {
  client.run("UPDATE meetings SET status = ?, summary = ?, ended_at = ?, updated_at = ? WHERE id = ?", [
    "completed",
    summary,
    nowIso(),
    nowIso(),
    meetingId
  ]);
  const meeting = getMeeting(client, meetingId);

  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  return meeting;
};
