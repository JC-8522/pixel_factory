import type { RuntimeKind, SendRuntimeMessageInput, SpawnRuntimeInput } from "../../shared/types/agent";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "./AgentRuntime";
import { CodexCliRuntime } from "./CodexCliRuntime";
import { MockAgentRuntime } from "./MockAgentRuntime";
import { AttachedCodexRuntime } from "./AttachedCodexRuntime";

export type RuntimeRegistryOptions = {
  codexExecutablePath?: string;
  includeCodexCli?: boolean;
};

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
          if (event.type === "session_completed" || event.type === "session_stopped" || event.type === "error") {
            this.sessions.delete(event.sessionId);
          }
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

export const createDefaultRuntimeRegistry = (options: RuntimeRegistryOptions = {}): RuntimeRegistry =>
  new RuntimeRegistry(
    (() => {
      const runtimes: AgentRuntime[] = [new MockAgentRuntime(), new AttachedCodexRuntime()];
      if (options.includeCodexCli !== false) {
        try {
          runtimes.splice(1, 0, new CodexCliRuntime({ executablePath: options.codexExecutablePath }));
        } catch (error) {
          console.warn(
            "[runtime-registry] Skipping codex_cli runtime because initialization failed:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }
      return runtimes;
    })()
  );
