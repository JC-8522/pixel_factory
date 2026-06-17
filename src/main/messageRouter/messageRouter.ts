import type { DatabaseClient } from "../db/client";
import { createMessage, getMessage, getSession, type MessageRecord } from "../db/repositories";
import type { RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { recordAuditEvent } from "../audit/auditEngine";
import { buildAgentRuntimeContext } from "../context/contextBuilder";

export type RouteSessionMessageInput = {
  sessionId: string;
  message: string;
};

export const routeSessionMessage = async (
  client: DatabaseClient,
  runtimeRegistry: RuntimeRegistry,
  input: RouteSessionMessageInput,
  nextId: (prefix: string) => string
): Promise<MessageRecord> => {
  const session = getSession(client, input.sessionId);

  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const userMessage = createMessage(client, {
    id: nextId(`message-user-${input.sessionId}`),
    sessionId: input.sessionId,
    agentId: session.agent_id,
    role: "user",
    content: input.message
  });
  const responseMessage = createMessage(client, {
    id: nextId(`message-agent-${input.sessionId}`),
    sessionId: input.sessionId,
    agentId: session.agent_id,
    role: "agent",
    content: "",
    streamState: "streaming",
    parentMessageId: userMessage.id
  });

  recordAuditEvent(client, {
    id: nextId(`event-message-${userMessage.id}`),
    type: "message_sent",
    actorType: "user",
    actorId: "local-user",
    agentId: session.agent_id,
    sessionId: input.sessionId,
    payload: { messageId: userMessage.id, role: "user", route: "human_to_agent" }
  });
  client.save();

  const runtimeContext = buildAgentRuntimeContext(client, session.agent_id);
  await runtimeRegistry.sendMessage({
    sessionId: input.sessionId,
    agentId: session.agent_id,
    message: input.message,
    inputMessageId: userMessage.id,
    responseMessageId: responseMessage.id,
    modelProfile: session.model_profile,
    skillPromptContext: runtimeContext.skillPromptContext
  });

  return getMessage(client, responseMessage.id) ?? responseMessage;
};
