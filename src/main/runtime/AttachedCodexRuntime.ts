import type {
  AgentRuntimeEvent,
  RuntimeSessionDescriptor,
  SendRuntimeMessageInput,
  SpawnRuntimeInput
} from "../../shared/types/agent";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "./AgentRuntime";

type RuntimeEventDraft = AgentRuntimeEvent extends infer Event
  ? Event extends AgentRuntimeEvent
    ? Omit<Event, "id" | "at">
    : never
  : never;

export type AttachCapability = {
  runtimeKind: "codex_cli_attached";
  status: "read_only" | "disabled";
  reason: string;
  controllable: boolean;
  detectedSessions: number;
};

export class AttachedCodexRuntime implements AgentRuntime {
  readonly kind = "codex_cli_attached" as const;

  private readonly handlers = new Set<RuntimeEventHandler>();
  private sequence = 0;

  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  getCapability(detectedSessions = 0): AttachCapability {
    return {
      runtimeKind: this.kind,
      status: detectedSessions > 0 ? "read_only" : "disabled",
      reason:
        detectedSessions > 0
          ? "Existing local Codex processes can be displayed, but reliable bidirectional control is not available yet."
          : "No attachable local Codex session metadata was found.",
      controllable: false,
      detectedSessions
    };
  }

  async spawn(input: SpawnRuntimeInput): Promise<RuntimeSessionDescriptor> {
    await this.emit({
      type: "waiting_user_input",
      agentId: input.agentId,
      sessionId: input.sessionId,
      prompt: "Attach mode is read-only until reliable Codex session control is available."
    });
    return { agentId: input.agentId, sessionId: input.sessionId, runtimeKind: this.kind };
  }

  async sendMessage(input: SendRuntimeMessageInput): Promise<void> {
    await this.emit({
      type: "error",
      agentId: input.agentId,
      sessionId: input.sessionId,
      message: "Attached Codex sessions are currently read-only."
    });
    throw new Error("Attached Codex sessions are currently read-only.");
  }

  async stop(sessionId: string): Promise<void> {
    throw new Error(`Attached Codex session cannot be stopped by the app: ${sessionId}`);
  }

  private async emit(event: RuntimeEventDraft): Promise<void> {
    const runtimeEvent = {
      ...event,
      id: `attached-event-${Date.now()}-${++this.sequence}`,
      at: new Date().toISOString()
    } as AgentRuntimeEvent;

    for (const handler of this.handlers) {
      await handler(runtimeEvent);
    }
  }
}
