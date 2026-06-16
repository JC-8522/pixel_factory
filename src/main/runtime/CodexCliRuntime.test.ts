/**
 * @vitest-environment node
 */
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import { buildCodexSpawnArgs, CodexCliRuntime, type RuntimeChildProcess, type RuntimeProcessSpawner } from "./CodexCliRuntime";

class FakeChildProcess extends EventEmitter implements RuntimeChildProcess {
  stdout = new PassThrough();
  stderr = new PassThrough();
  stdin = new PassThrough();
  pid = 1234;
  killed = false;

  kill(): boolean {
    this.killed = true;
    this.emit("exit", null, "SIGTERM");
    return true;
  }
}

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe("CodexCliRuntime", () => {
  it("builds spawn args from profile, approval mode, skill context, and prompt", () => {
    expect(
      buildCodexSpawnArgs(
        {
          agentId: "agent",
          sessionId: "session",
          workingDirectory: "C:/repo",
          modelProfile: "default",
          permissionMode: "ask",
          skillPromptContext: "Assigned skills",
          initialPrompt: "Do work"
        },
        null
      )
    ).toEqual(["--profile", "default", "--ask-for-approval", "ask", "exec", "Assigned skills\n\nDo work"]);
  });

  it("streams stdout, parses usage, and emits completion events", async () => {
    const child = new FakeChildProcess();
    const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
    const spawner: RuntimeProcessSpawner = (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd });
      return child;
    };
    const runtime = new CodexCliRuntime({ executablePath: "codex", spawner });
    const events: AgentRuntimeEvent[] = [];
    runtime.onEvent((event) => {
      events.push(event);
    });

    await runtime.spawn({ agentId: "agent", sessionId: "session", workingDirectory: "C:/repo" });
    await runtime.sendMessage({
      agentId: "agent",
      sessionId: "session",
      message: "hello",
      inputMessageId: "message-user",
      responseMessageId: "message-agent"
    });
    child.stdout.write("hello manager\n");
    child.stdout.write('{"usage":{"input_tokens":4,"output_tokens":5,"total_tokens":9}}\n');
    child.emit("exit", 0, null);
    await settle();

    expect(calls[0]).toMatchObject({ command: "codex", cwd: "C:/repo" });
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["session_started", "command_started", "log_line", "message_chunk", "token_usage", "command_completed", "session_completed"])
    );
    expect(events.find((event) => event.type === "token_usage")).toMatchObject({
      usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9, usageSource: "reported" }
    });
  });

  it("marks missing usage as estimated and can stop the process", async () => {
    const child = new FakeChildProcess();
    const runtime = new CodexCliRuntime({ spawner: () => child });
    const events: AgentRuntimeEvent[] = [];
    runtime.onEvent((event) => {
      events.push(event);
    });

    await runtime.spawn({ agentId: "agent", sessionId: "session", workingDirectory: "C:/repo" });
    await runtime.sendMessage({
      agentId: "agent",
      sessionId: "session",
      message: "hello",
      inputMessageId: "message-user",
      responseMessageId: "message-agent"
    });
    child.stdout.write("estimated response\n");
    child.emit("exit", 0, null);
    await settle();

    expect(events.find((event) => event.type === "token_usage")).toMatchObject({
      usage: { usageSource: "estimated" }
    });

    const nextChild = new FakeChildProcess();
    const stopped = new CodexCliRuntime({ spawner: () => nextChild });
    await stopped.spawn({ agentId: "agent", sessionId: "stopped-session", workingDirectory: "C:/repo" });
    await stopped.stop("stopped-session");
    expect(nextChild.killed).toBe(true);
  });
});
