/**
 * @vitest-environment node
 */
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import type { AgentRuntimeEvent } from "../../shared/types/agent";
import {
  buildCodexSpawnEnv,
  buildCodexSpawnArgs,
  CodexCliRuntime,
  resolveCodexHome,
  resolveCodexExecutablePath,
  type RuntimeChildProcess,
  type RuntimeProcessSpawner
} from "./CodexCliRuntime";

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
  it("copies Windows store executables to a local cache path", () => {
    if (process.platform !== "win32") {
      expect(resolveCodexExecutablePath("codex")).toBe("codex");
      return;
    }

    const tempRoot = mkdtempSync(join(tmpdir(), "codex-runtime-test-"));
    const sourcePath = join(tempRoot, "Program Files", "WindowsApps", "codex.exe");
    mkdirSync(join(tempRoot, "Program Files", "WindowsApps"), { recursive: true });
    writeFileSync(sourcePath, "stub");
    const previousLocalAppData = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = tempRoot;

    try {
      const resolved = resolveCodexExecutablePath(sourcePath);
      expect(resolved).toContain(join("local-codex-office", "bin", "codex.exe"));
    } finally {
      process.env.LOCALAPPDATA = previousLocalAppData;
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

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
    ).toEqual(["--profile", "default", "--ask-for-approval", "on-request", "exec", "Assigned skills\n\nDo work"]);
  });

  it("does not force exec mode when only skill context is present", () => {
    expect(
      buildCodexSpawnArgs(
        {
          agentId: "agent",
          sessionId: "session",
          workingDirectory: "C:/repo",
          permissionMode: "ask",
          skillPromptContext: "Assigned skills"
        },
        null
      )
    ).toEqual(["--ask-for-approval", "on-request"]);
  });

  it("prefers a real auth-bearing CODEX_HOME for spawned processes", () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "codex-home-test-"));
    const authHome = join(tempRoot, "auth-home");
    mkdirSync(authHome, { recursive: true });
    writeFileSync(join(authHome, "auth.json"), '{"auth_mode":"chatgpt"}');

    try {
      const env = buildCodexSpawnEnv({ CODEX_HOME: authHome });
      expect(resolveCodexHome({ CODEX_HOME: authHome })).toBe(authHome);
      expect(env.CODEX_HOME).toBe(authHome);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("streams stdout, parses usage, and emits completion events", async () => {
    const child = new FakeChildProcess();
    const calls: Array<{ command: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv }> = [];
    const spawner: RuntimeProcessSpawner = (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd, env: options.env });
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
    expect(calls[0]?.env.CODEX_HOME).toBe(resolveCodexHome(process.env));
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["session_started", "command_started", "log_line", "message_chunk", "token_usage", "command_completed", "session_completed"])
    );
    expect(events.find((event) => event.type === "token_usage")).toMatchObject({
      usage: { inputTokens: 4, outputTokens: 5, totalTokens: 9, usageSource: "reported" }
    });
  });

  it("closes stdin for one-shot exec invocations", async () => {
    const child = new FakeChildProcess();
    const runtime = new CodexCliRuntime({ spawner: () => child });

    await runtime.spawn({
      agentId: "agent",
      sessionId: "session-exec",
      workingDirectory: "C:/repo",
      initialPrompt: "Do work"
    });

    expect(child.stdin.writableEnded).toBe(true);
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

  it("emits event ids that stay unique across runtime instances", async () => {
    const firstChild = new FakeChildProcess();
    const secondChild = new FakeChildProcess();
    const firstRuntime = new CodexCliRuntime({ spawner: () => firstChild });
    const secondRuntime = new CodexCliRuntime({ spawner: () => secondChild });
    const firstEvents: AgentRuntimeEvent[] = [];
    const secondEvents: AgentRuntimeEvent[] = [];

    firstRuntime.onEvent((event) => {
      firstEvents.push(event);
    });
    secondRuntime.onEvent((event) => {
      secondEvents.push(event);
    });

    await firstRuntime.spawn({ agentId: "agent-a", sessionId: "session-a", workingDirectory: "C:/repo" });
    await secondRuntime.spawn({ agentId: "agent-a", sessionId: "session-a", workingDirectory: "C:/repo" });

    expect(firstEvents[0]?.id).toBeDefined();
    expect(secondEvents[0]?.id).toBeDefined();
    expect(firstEvents[0]?.id).not.toBe(secondEvents[0]?.id);
  });
});
