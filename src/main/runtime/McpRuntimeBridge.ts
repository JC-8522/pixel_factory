import type { AgentRuntimeEvent, RuntimeKind } from "../../shared/types/agent";

export type McpBridgeStatus = {
  runtimeKind: Extract<RuntimeKind, "mcp">;
  configured: boolean;
  status: "not_configured" | "ready" | "error";
  reason: string;
};

export type McpBridgeRequest = {
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

export type McpBridgeResponse = {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
};

export type McpProviderEvent = {
  id: string;
  agentId: string;
  sessionId: string;
  type: "tool_call" | "tool_result" | "log" | "error" | "completed";
  message?: string;
  at?: string;
};

export interface McpRuntimeBridge {
  getStatus(): Promise<McpBridgeStatus>;
  call(request: McpBridgeRequest): Promise<McpBridgeResponse>;
  normalizeEvent(event: McpProviderEvent): AgentRuntimeEvent;
}

export class DisabledMcpRuntimeBridge implements McpRuntimeBridge {
  async getStatus(): Promise<McpBridgeStatus> {
    return {
      runtimeKind: "mcp",
      configured: false,
      status: "not_configured",
      reason: "MCP runtime bridge is defined, but no MCP provider is configured in this V2 foundation."
    };
  }

  async call(request: McpBridgeRequest): Promise<McpBridgeResponse> {
    return { id: request.id, ok: false, error: "MCP bridge is not configured." };
  }

  normalizeEvent(event: McpProviderEvent): AgentRuntimeEvent {
    const base = {
      id: event.id,
      agentId: event.agentId,
      sessionId: event.sessionId,
      at: event.at ?? new Date().toISOString()
    };

    if (event.type === "tool_call") {
      return { ...base, type: "command_started", command: event.message ?? "mcp_tool_call" };
    }

    if (event.type === "tool_result") {
      return { ...base, type: "command_completed", command: event.message ?? "mcp_tool_result", exitCode: 0 };
    }

    if (event.type === "error") {
      return { ...base, type: "error", message: event.message ?? "MCP provider error" };
    }

    if (event.type === "completed") {
      return { ...base, type: "session_completed" };
    }

    return { ...base, type: "log_line", stream: "stdout", line: event.message ?? "MCP log event" };
  }
}
