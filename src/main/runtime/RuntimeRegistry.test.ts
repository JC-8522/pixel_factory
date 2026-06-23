/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("createDefaultRuntimeRegistry", () => {
  it("keeps the mock runtime available when codex_cli initialization fails", async () => {
    vi.doMock("./CodexCliRuntime", () => ({
      CodexCliRuntime: class {
        constructor() {
          throw new Error("codex launch path unavailable");
        }
      }
    }));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { createDefaultRuntimeRegistry } = await import("./RuntimeRegistry");

    const registry = createDefaultRuntimeRegistry({
      codexExecutablePath: "C:/Codex/codex.exe"
    });
    const events: Array<{ type: string }> = [];

    registry.onEvent((event) => {
      events.push({ type: event.type });
    });

    await registry.spawn("mock", {
      agentId: "agent-runtime-fallback",
      sessionId: "session-runtime-fallback",
      workingDirectory: "C:/repo/pixel_factory"
    });

    await registry.sendMessage({
      agentId: "agent-runtime-fallback",
      sessionId: "session-runtime-fallback",
      message: "verify fallback still works",
      inputMessageId: "message-user-1",
      responseMessageId: "message-agent-1"
    });

    expect(events.map((event) => event.type)).toContain("session_started");
    expect(events.map((event) => event.type)).toContain("session_completed");
    expect(warnSpy).toHaveBeenCalledWith(
      "[runtime-registry] Skipping codex_cli runtime because initialization failed:",
      "codex launch path unavailable"
    );
  });

  it("removes completed sessions from the registry after terminal runtime events", async () => {
    const { createDefaultRuntimeRegistry } = await import("./RuntimeRegistry");
    const registry = createDefaultRuntimeRegistry({ includeCodexCli: false });

    await registry.spawn("mock", {
      agentId: "agent-runtime-cleanup",
      sessionId: "session-runtime-cleanup",
      workingDirectory: "C:/repo/pixel_factory"
    });

    await registry.sendMessage({
      agentId: "agent-runtime-cleanup",
      sessionId: "session-runtime-cleanup",
      message: "finish and release the session",
      inputMessageId: "message-user-cleanup",
      responseMessageId: "message-agent-cleanup"
    });

    await expect(
      registry.sendMessage({
        agentId: "agent-runtime-cleanup",
        sessionId: "session-runtime-cleanup",
        message: "this should not reuse a completed session",
        inputMessageId: "message-user-retry",
        responseMessageId: "message-agent-retry"
      })
    ).rejects.toThrow("Runtime session not registered: session-runtime-cleanup");
  });
});
