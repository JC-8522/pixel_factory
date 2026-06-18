import type { CreateMeetingRequest, FinishMeetingRequest, SendMeetingMessageRequest } from "../../shared/ipc";
import type { ConversationFlowRule } from "../../shared/types/conversation";
import { recordAuditEvent } from "../audit/auditEngine";
import type { DatabaseClient } from "../db/client";
import {
  addMeetingMessage,
  addMeetingParticipant,
  completeMeeting,
  createMeeting,
  setSetting,
  type MeetingMessageRecord,
  type MeetingRecord
} from "../db/repositories";
import { defaultReviewLoopRules } from "./meetingFlowRules";

const rulesSettingKey = (meetingId: string): string => `meeting.flowRules.${meetingId}`;

export const createMeetingThroughOrchestration = (
  client: DatabaseClient,
  input: CreateMeetingRequest
): MeetingRecord => {
  const meeting = createMeeting(client, input);
  const flowRules = input.flowRules?.length ? input.flowRules : defaultReviewLoopRules();

  for (const agentId of input.participantAgentIds ?? []) {
    addMeetingParticipant(client, {
      meetingId: meeting.id,
      agentId,
      role: agentId === input.moderatorAgentId ? "moderator" : "participant"
    });
  }

  setSetting(client, rulesSettingKey(meeting.id), {
    conversationMode: input.conversationMode ?? "review_loop",
    flowRules
  });

  recordAuditEvent(client, {
    id: `event-meeting-created-${meeting.id}`,
    type: "meeting_created",
    actorType: "user",
    actorId: "local-user",
    meetingId: meeting.id,
    payload: {
      title: meeting.title,
      participantAgentIds: input.participantAgentIds ?? [],
      moderatorAgentId: input.moderatorAgentId ?? null,
      conversationMode: input.conversationMode ?? "review_loop"
    }
  });

  return meeting;
};

export const sendMeetingMessageThroughRouter = (
  client: DatabaseClient,
  input: SendMeetingMessageRequest
): MeetingMessageRecord => {
  const message = addMeetingMessage(client, input);
  const metadata = input.metadata ?? {};

  recordAuditEvent(client, {
    id: `event-meeting-message-${message.id}`,
    type: "meeting_message_routed",
    actorType: input.role === "user" ? "user" : "agent",
    actorId: input.agentId ?? "local-user",
    agentId: input.agentId,
    meetingId: input.meetingId,
    payload: {
      messageId: message.id,
      role: input.role,
      sourceAgentId: metadata.sourceAgentId ?? input.agentId ?? null,
      targetAgentId: metadata.targetAgentId ?? null,
      parentMessageId: metadata.parentMessageId ?? null,
      flowRuleId: metadata.flowRuleId ?? null,
      route: metadata.route ?? "meeting_broadcast"
    }
  });

  return message;
};

export const finishMeetingThroughOrchestration = (
  client: DatabaseClient,
  input: FinishMeetingRequest
): MeetingRecord => {
  const meeting = completeMeeting(client, input.meetingId, input.summary);

  recordAuditEvent(client, {
    id: `event-meeting-finished-${input.meetingId}`,
    type: "meeting_summary_saved",
    actorType: "user",
    actorId: "local-user",
    meetingId: input.meetingId,
    payload: { summary: input.summary }
  });

  return meeting;
};

export const serializeFlowRules = (rules: ConversationFlowRule[]): ConversationFlowRule[] => rules;
