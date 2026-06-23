import type { DatabaseClient } from "../db/client";
import { createMessage, getMessage, getSession, type MessageRecord } from "../db/repositories";
import type { RuntimeRegistry } from "../runtime/RuntimeRegistry";
import { recordAuditEvent } from "../audit/auditEngine";
import { buildAgentRuntimeContext } from "../context/contextBuilder";
import type { PermissionPolicyEngine } from "../security/permissionPolicy";
import { gateCommandOrThrow } from "../runtime/safeCommandGate";

export type RouteSessionMessageInput = {
  sessionId: string;
  message: string;
  metadata?: {
    userEntry?: unknown;
    responseEntry?: unknown;
    /** Backward-compatible aliases while callers migrate to entry terminology. */
    userMessage?: unknown;
    responseMessage?: unknown;
  };
};

export type RecordedSessionMessages = {
  userMessage: MessageRecord;
  responseMessage: MessageRecord;
};

const parseJson = <T,>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const recordSessionMessages = (
  client: DatabaseClient,
  permissionPolicy: PermissionPolicyEngine,
  input: RouteSessionMessageInput,
  nextId: (prefix: string) => string
): RecordedSessionMessages => {
  const session = getSession(client, input.sessionId);

  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  gateCommandOrThrow(permissionPolicy, {
    requestId: nextId(`permission-${input.sessionId}`),
    agentId: session.agent_id,
    sessionId: input.sessionId,
    projectPath: session.working_directory,
    commandSource: input.message
  });

  const userMessage = createMessage(client, {
    id: nextId(`message-user-${input.sessionId}`),
    sessionId: input.sessionId,
    agentId: session.agent_id,
    role: "user",
    content: input.message,
    metadata: input.metadata?.userEntry ?? input.metadata?.userMessage
  });
  const responseMessage = createMessage(client, {
    id: nextId(`message-agent-${input.sessionId}`),
    sessionId: input.sessionId,
    agentId: session.agent_id,
    role: "agent",
    content: "",
    streamState: "streaming",
    parentMessageId: userMessage.id,
    metadata: input.metadata?.responseEntry ?? input.metadata?.responseMessage
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

  return { userMessage, responseMessage };
};

export const routeSessionMessage = async (
  client: DatabaseClient,
  runtimeRegistry: RuntimeRegistry,
  permissionPolicy: PermissionPolicyEngine,
  input: RouteSessionMessageInput,
  nextId: (prefix: string) => string
): Promise<MessageRecord> => {
  const session = getSession(client, input.sessionId);

  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const { responseMessage, userMessage } = recordSessionMessages(client, permissionPolicy, input, nextId);
  const sessionMetadata = parseJson<{ composerContext?: { profileId?: string | null } }>(session.metadata_json, {});
  const runtimeContext = buildAgentRuntimeContext(client, session.agent_id, sessionMetadata.composerContext?.profileId ?? null);
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
