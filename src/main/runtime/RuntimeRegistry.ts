import type { RuntimeKind, SendRuntimeMessageInput, SpawnRuntimeInput } from "../../shared/types/agent";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "./AgentRuntime";
import { CodexCliRuntime } from "./CodexCliRuntime";
import { MockAgentRuntime } from "./MockAgentRuntime";
import { AttachedCodexRuntime } from "./AttachedCodexRuntime";

export class RuntimeRegistry {
  private readonly runtimes = new Map<RuntimeKind, AgentRuntime>();
  private readonly sessions = new Map<string, AgentRuntime>();
  private readonly eventHandlers = new Set<RuntimeEventHandler>();
  private readonly runtimeUnsubscribers: UnsubscribeRuntimeEvent[] = [];

  constructor(runtimes: AgentRuntime[]) {
    for (const runtime of runtimes) {
      this.runtimes.set(runtime.kind, runtime);
      this.runtimeUnsubscribers.push(
        runtime.onEvent(async (event) => {
          for (const handler of this.eventHandlers) {
            await handler(event);
          }
        })
      );
    }
  }

  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent {
    this.eventHandlers.add(handler);
    return () => {
      this.eventHandlers.delete(handler);
    };
  }

  async spawn(kind: RuntimeKind, input: SpawnRuntimeInput): Promise<void> {
    const runtime = this.requireRuntime(kind);
    await runtime.spawn(input);
    this.sessions.set(input.sessionId, runtime);
  }

  async sendMessage(input: SendRuntimeMessageInput): Promise<void> {
    await this.requireSessionRuntime(input.sessionId).sendMessage(input);
  }

  async stop(sessionId: string): Promise<void> {
    await this.requireSessionRuntime(sessionId).stop(sessionId);
  }

  dispose(): void {
    for (const unsubscribe of this.runtimeUnsubscribers) {
      unsubscribe();
    }
    this.runtimeUnsubscribers.length = 0;
    this.eventHandlers.clear();
    this.sessions.clear();
  }

  private requireRuntime(kind: RuntimeKind): AgentRuntime {
    const runtime = this.runtimes.get(kind);

    if (!runtime) {
      throw new Error(`Runtime not registered: ${kind}`);
    }

    return runtime;
  }

  private requireSessionRuntime(sessionId: string): AgentRuntime {
    const runtime = this.sessions.get(sessionId);

    if (!runtime) {
      throw new Error(`Runtime session not registered: ${sessionId}`);
    }

    return runtime;
  }
}

export const createDefaultRuntimeRegistry = (): RuntimeRegistry =>
  new RuntimeRegistry([new MockAgentRuntime(), new CodexCliRuntime(), new AttachedCodexRuntime()]);
