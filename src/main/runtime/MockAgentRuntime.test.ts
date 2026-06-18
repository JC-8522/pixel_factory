/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import { MockAgentRuntime } from "./MockAgentRuntime";

describe("MockAgentRuntime", () => {
  it("emits deterministic runtime events for spawn, streaming, usage, completion, and stop", async () => {
    const runtime = new MockAgentRuntime({
      responseFactory: (message) => `Echo ${message}`
    });
    const events: AgentRuntimeEvent[] = [];
    runtime.onEvent((event) => {
      events.push(event);
    });

    await runtime.spawn({
      agentId: "agent-1",
      sessionId: "session-1",
      workingDirectory: "C:/repo"
    });
    await runtime.sendMessage({
      agentId: "agent-1",
      sessionId: "session-1",
      message: "hello runtime",
      inputMessageId: "message-user-1",
      responseMessageId: "message-agent-1"
    });
    await runtime.stop("session-1");

    expect(events.map((event) => event.type)).toEqual([
      "session_started",
      "status_changed",
      "status_changed",
      "message_chunk",
      "message_chunk",
      "token_usage",
      "status_changed",
      "session_completed",
      "status_changed",
      "session_stopped"
    ]);
    const chunks = events.filter((event) => event.type === "message_chunk");
    expect(chunks.map((event) => event.messageId)).toEqual(["message-agent-1", "message-agent-1"]);
    expect(chunks.map((event) => event.chunk).join("")).toBe("Echo hello runtime");
    expect(events.find((event) => event.type === "token_usage")).toMatchObject({
      usage: {
        inputTokens: 2,
        outputTokens: 3,
        totalTokens: 5,
        usageSource: "estimated"
      }
    });
  });
});
