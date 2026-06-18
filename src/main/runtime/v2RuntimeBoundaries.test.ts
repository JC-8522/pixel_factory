/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { AttachedCodexRuntime } from "./AttachedCodexRuntime";
import { DisabledMcpRuntimeBridge } from "./McpRuntimeBridge";

describe("V2 runtime boundaries", () => {
  it("reports attached Codex sessions as read-only when detected", () => {
    const runtime = new AttachedCodexRuntime();
    const capability = runtime.getCapability(1);

    expect(capability.status).toBe("read_only");
    expect(capability.controllable).toBe(false);
  });

  it("emits a read-only error when sending to attached sessions", async () => {
    const runtime = new AttachedCodexRuntime();
    const events: string[] = [];
    runtime.onEvent((event) => {
      events.push(event.type);
    });

    await expect(
      runtime.sendMessage({
        sessionId: "attached-session",
        agentId: "attached-agent",
        inputMessageId: "message-in",
        responseMessageId: "message-out",
        message: "hello"
      })
    ).rejects.toThrow("read-only");
    expect(events).toContain("error");
  });

  it("normalizes MCP provider events into runtime events", () => {
    const bridge = new DisabledMcpRuntimeBridge();
    const event = bridge.normalizeEvent({
      id: "mcp-event-1",
      agentId: "agent-1",
      sessionId: "session-1",
      type: "tool_call",
      message: "github.create_pr"
    });

    expect(event.type).toBe("command_started");
    expect(event.agentId).toBe("agent-1");
  });
});
