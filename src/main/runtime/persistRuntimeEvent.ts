import type { AgentRuntimeEvent } from "../../shared/types/agent";
import type { DatabaseClient } from "../db/client";
import {
  appendMessageContent,
  completeMessageStream,
  createEvent,
  createTokenUsage,
  endSession,
  updateAgentStatus
} from "../db/repositories";
import { deriveStatusFromRuntimeEvent } from "./agentStatusMachine";

export const persistRuntimeEvent = (client: DatabaseClient, event: AgentRuntimeEvent): void => {
  const derivedStatus = deriveStatusFromRuntimeEvent(event);

  if (derivedStatus && event.type !== "status_changed" && event.type !== "error") {
    updateAgentStatus(client, event.agentId, derivedStatus);
  }

  switch (event.type) {
    case "session_started":
      createEvent(client, {
        id: event.id,
        type: "session_started",
        actorType: "system",
        agentId: event.agentId,
        sessionId: event.sessionId
      });
      return;
    case "status_changed":
      updateAgentStatus(client, event.agentId, event.status);
      createEvent(client, {
        id: event.id,
        type: "status_changed",
        actorType: "agent",
        actorId: event.agentId,
        agentId: event.agentId,
        sessionId: event.sessionId,
        payload: { status: event.status }
      });
      return;
    case "message_chunk":
      appendMessageContent(client, event.messageId, event.chunk);
      createEvent(client, {
        id: event.id,
        type: "message_chunk",
        actorType: "agent",
        actorId: event.agentId,
        agentId: event.agentId,
        sessionId: event.sessionId,
        payload: { messageId: event.messageId, chunkLength: event.chunk.length }
      });
      return;
    case "log_line":
      createEvent(client, {
        id: event.id,
        type: "log_line",
        actorType: "agent",
        actorId: event.agentId,
        agentId: event.agentId,
        sessionId: event.sessionId,
        severity: event.stream === "stderr" ? "warning" : "info",
        payload: { stream: event.stream, line: event.line }
      });
      return;
    case "token_usage":
      createTokenUsage(client, {
        id: event.id,
        agentId: event.agentId,
        sessionId: event.sessionId,
        messageId: event.messageId,
        taskId: event.taskId,
        modelProfile: event.modelProfile,
        inputTokens: event.usage.inputTokens,
        outputTokens: event.usage.outputTokens,
        totalTokens: event.usage.totalTokens,
        cachedTokens: event.usage.cachedTokens,
        reasoningTokens: event.usage.reasoningTokens,
        estimatedCost: event.usage.estimatedCost,
        costCurrency: event.usage.costCurrency,
        usageSource: event.usage.usageSource
      });
      createEvent(client, {
        id: `${event.id}-recorded`,
        type: "token_usage_recorded",
        actorType: "system",
        agentId: event.agentId,
        sessionId: event.sessionId,
        taskId: event.taskId,
        payload: { messageId: event.messageId, usage: event.usage }
      });
      return;
    case "session_completed":
      completeMessageStream(client, event.sessionId);
      endSession(client, { sessionId: event.sessionId, status: "completed", exitCode: 0 });
      createEvent(client, {
        id: event.id,
        type: "session_completed",
        actorType: "agent",
        actorId: event.agentId,
        agentId: event.agentId,
        sessionId: event.sessionId
      });
      return;
    case "session_stopped":
      endSession(client, { sessionId: event.sessionId, status: "stopped" });
      createEvent(client, {
        id: event.id,
        type: "session_stopped",
        actorType: "system",
        agentId: event.agentId,
        sessionId: event.sessionId
      });
      return;
    case "error":
      updateAgentStatus(client, event.agentId, "error");
      endSession(client, { sessionId: event.sessionId, status: "failed", errorMessage: event.message });
      createEvent(client, {
        id: event.id,
        type: "error_occurred",
        actorType: "system",
        agentId: event.agentId,
        sessionId: event.sessionId,
        severity: "error",
        payload: { message: event.message }
      });
      return;
    case "command_started":
    case "command_completed":
    case "file_touched":
    case "waiting_user_input":
      createEvent(client, {
        id: event.id,
        type: event.type,
        actorType: "agent",
        actorId: event.agentId,
        agentId: event.agentId,
        sessionId: event.sessionId,
        payload: event
      });
      return;
  }
};
