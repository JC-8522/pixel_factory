import type {
  AgentRuntimeEvent,
  RuntimeKind,
  RuntimeSessionDescriptor,
  SendRuntimeMessageInput,
  SpawnRuntimeInput
} from "../../shared/types/agent";

export type RuntimeEventHandler = (event: AgentRuntimeEvent) => void | Promise<void>;

export type UnsubscribeRuntimeEvent = () => void;

export interface AgentRuntime {
  readonly kind: RuntimeKind;
  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent;
  spawn(input: SpawnRuntimeInput): Promise<RuntimeSessionDescriptor>;
  sendMessage(input: SendRuntimeMessageInput): Promise<void>;
  stop(sessionId: string): Promise<void>;
}
