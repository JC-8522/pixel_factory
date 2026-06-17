import type {
  AgentRuntimeEvent,
  RuntimeSessionDescriptor,
  SendRuntimeMessageInput,
  SpawnRuntimeInput,
  TokenUsage
} from "../../shared/types/agent";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "./AgentRuntime";

type RuntimeEventDraft = AgentRuntimeEvent extends infer Event
  ? Event extends AgentRuntimeEvent
    ? Omit<Event, "id" | "at">
    : never
  : never;

type MockSession = {
  agentId: string;
  sessionId: string;
  workingDirectory: string;
  modelProfile: string | null;
  stopped: boolean;
};

export type MockAgentRuntimeOptions = {
  chunkDelayMs?: number;
  responseFactory?: (message: string, input: SendRuntimeMessageInput) => string;
};

const countTokens = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const splitResponse = (response: string): string[] => {
  const words = response.split(/(\s+)/).filter((chunk) => chunk.length > 0);
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += 4) {
    chunks.push(words.slice(index, index + 4).join(""));
  }

  return chunks.length > 0 ? chunks : [response];
};

const delay = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

export class MockAgentRuntime implements AgentRuntime {
  readonly kind = "mock" as const;

  private readonly handlers = new Set<RuntimeEventHandler>();
  private readonly sessions = new Map<string, MockSession>();
  private readonly chunkDelayMs: number;
  private readonly responseFactory: (message: string, input: SendRuntimeMessageInput) => string;
  private sequence = 0;

  constructor(options: MockAgentRuntimeOptions = {}) {
    this.chunkDelayMs = options.chunkDelayMs ?? 0;
    this.responseFactory =
      options.responseFactory ??
      ((message) => `Mock agent received: ${message}. I can stream deterministic responses for runtime testing.`);
  }

  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async spawn(input: SpawnRuntimeInput): Promise<RuntimeSessionDescriptor> {
    const session: MockSession = {
      agentId: input.agentId,
      sessionId: input.sessionId,
      workingDirectory: input.workingDirectory,
      modelProfile: input.modelProfile ?? null,
      stopped: false
    };
    this.sessions.set(input.sessionId, session);

    await this.emit({ type: "session_started", agentId: input.agentId, sessionId: input.sessionId });
    await this.emit({ type: "status_changed", agentId: input.agentId, sessionId: input.sessionId, status: "idle" });

    return {
      agentId: input.agentId,
      sessionId: input.sessionId,
      runtimeKind: this.kind
    };
  }

  async sendMessage(input: SendRuntimeMessageInput): Promise<void> {
    const session = this.requireSession(input.sessionId);
    session.stopped = false;

    await this.emit({ type: "status_changed", agentId: input.agentId, sessionId: input.sessionId, status: "thinking" });

    const response = this.responseFactory(input.message, input);
    for (const chunk of splitResponse(response)) {
      if (session.stopped) {
        return;
      }

      await delay(this.chunkDelayMs);
      await this.emit({
        type: "message_chunk",
        agentId: input.agentId,
        sessionId: input.sessionId,
        messageId: input.responseMessageId,
        chunk
      });
    }

    const inputTokens = countTokens(input.message);
    const outputTokens = countTokens(response);
    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      estimatedCost: Number(((inputTokens + outputTokens) * 0.00001).toFixed(6)),
      costCurrency: "USD",
      usageSource: "estimated"
    };

    await this.emit({
      type: "token_usage",
      agentId: input.agentId,
      sessionId: input.sessionId,
      messageId: input.responseMessageId,
      taskId: input.taskId ?? undefined,
      modelProfile: input.modelProfile ?? session.modelProfile,
      usage
    });
    await this.emit({ type: "status_changed", agentId: input.agentId, sessionId: input.sessionId, status: "completed" });
    await this.emit({ type: "session_completed", agentId: input.agentId, sessionId: input.sessionId });
  }

  async stop(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    session.stopped = true;
    await this.emit({ type: "status_changed", agentId: session.agentId, sessionId, status: "stopped" });
    await this.emit({ type: "session_stopped", agentId: session.agentId, sessionId });
  }

  private requireSession(sessionId: string): MockSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Mock session not found: ${sessionId}`);
    }

    return session;
  }

  private async emit(event: RuntimeEventDraft): Promise<void> {
    const eventScope = event as { agentId: string; sessionId?: string };
    const scope = eventScope.sessionId ?? eventScope.agentId;
    const runtimeEvent = {
      ...event,
      id: `mock-event-${scope}-${++this.sequence}`,
      at: new Date().toISOString()
    } as AgentRuntimeEvent;

    for (const handler of this.handlers) {
      await handler(runtimeEvent);
    }
  }
}
