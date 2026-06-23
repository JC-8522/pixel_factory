import { randomUUID } from "node:crypto";
import { spawn as nodeSpawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type {
  AgentRuntimeEvent,
  RuntimeSessionDescriptor,
  SendRuntimeMessageInput,
  SpawnRuntimeInput
} from "../../shared/types/agent";
import type { AgentStatus } from "../../shared/types/app";
import { deriveStatusFromLogLine } from "./agentStatusMachine";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "./AgentRuntime";
import { prepareCodexLaunchPath } from "./codexInstallation";
import { estimateTokenUsage, parseTokenUsageFromLine } from "./tokenUsageParser";

type RuntimeEventDraft = AgentRuntimeEvent extends infer Event
  ? Event extends AgentRuntimeEvent
    ? Omit<Event, "id" | "at">
    : never
  : never;

export type RuntimeChildProcess = {
  pid?: number;
  stdout?: Readable | null;
  stderr?: Readable | null;
  stdin?: Writable | null;
  kill(signal?: NodeJS.Signals | number): boolean;
  on(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): RuntimeChildProcess;
  on(event: "error", listener: (error: Error) => void): RuntimeChildProcess;
};

export type RuntimeProcessSpawner = (
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) => RuntimeChildProcess;

type CodexSession = {
  agentId: string;
  sessionId: string;
  workingDirectory: string;
  modelProfile: string | null;
  process: RuntimeChildProcess;
  activeResponseMessageId: string | null;
  pendingInput: string;
  outputBuffer: string;
  reportedUsage: boolean;
  stopping: boolean;
  oneShotExec: boolean;
  lastStatus: AgentStatus | null;
};

export type CodexCliRuntimeOptions = {
  executablePath?: string;
  profile?: string | null;
  spawner?: RuntimeProcessSpawner;
};

type CodexLaunchSelection =
  | { type: "inherit" }
  | { type: "profile"; profile: string }
  | { type: "model"; model: string; reasoningEffort?: "low" | "medium" | "high" | "xhigh" };

const MODEL_PRESET_SELECTIONS: Record<string, Extract<CodexLaunchSelection, { type: "model" }>> = {
  "5.4 Low": { type: "model", model: "gpt-5.4", reasoningEffort: "low" },
  "5.4 Medium": { type: "model", model: "gpt-5.4", reasoningEffort: "medium" },
  "5.4 High": { type: "model", model: "gpt-5.4", reasoningEffort: "high" },
  "5.4 XHigh": { type: "model", model: "gpt-5.4", reasoningEffort: "xhigh" },
  "codex-balanced": { type: "model", model: "gpt-5.4", reasoningEffort: "medium" }
};

const createRuntimeEventId = (prefix: string, agentId: string, sessionId: string, sequence: number): string =>
  `${prefix}-${agentId}-${sessionId}-${sequence}-${randomUUID()}`;

const mapApprovalPolicy = (permissionMode: string | null | undefined): string | null => {
  switch (permissionMode) {
    case "ask":
    case "ask_before_edit":
    case "workspace_write":
      return "on-request";
    case "on_request":
    case "readonly":
      return "untrusted";
    case "full":
      return "never";
    case "external":
      return null;
    default:
      return null;
  }
};

export const resolveCodexExecutablePath = (configuredPath: string): string => {
  if (configuredPath === "codex") {
    const windowsStoreInstall = process.env.LOCAL_CODEX_WINDOWS_STORE_PATH;
    if (windowsStoreInstall) {
      return prepareCodexLaunchPath(windowsStoreInstall);
    }
  }

  return prepareCodexLaunchPath(configuredPath);
};

export const resolveCodexHome = (baseEnv: NodeJS.ProcessEnv = process.env): string => {
  const configuredHome = baseEnv.CODEX_HOME;
  const defaultHome = join(homedir(), ".codex");

  if (configuredHome && existsSync(join(configuredHome, "auth.json"))) {
    return configuredHome;
  }

  if (existsSync(join(defaultHome, "auth.json"))) {
    return defaultHome;
  }

  return configuredHome ?? defaultHome;
};

export const buildCodexSpawnEnv = (baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv => ({
  ...baseEnv,
  CODEX_HOME: resolveCodexHome(baseEnv)
});

export const resolveCodexLaunchSelection = (modelProfile: string | null | undefined): CodexLaunchSelection => {
  const value = modelProfile?.trim();
  if (!value || value === "default") {
    return { type: "inherit" };
  }

  const preset = MODEL_PRESET_SELECTIONS[value];
  if (preset) {
    return preset;
  }

  const reasoningPreset = /^(\d+(?:\.\d+)?)\s+(low|medium|high|xhigh)$/i.exec(value);
  if (reasoningPreset) {
    return {
      type: "model",
      model: `gpt-${reasoningPreset[1]}`,
      reasoningEffort: reasoningPreset[2].toLowerCase() as "low" | "medium" | "high" | "xhigh"
    };
  }

  if (value.startsWith("gpt-") || /^o\d/i.test(value)) {
    return { type: "model", model: value };
  }

  if (/^[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    return { type: "profile", profile: value };
  }

  return { type: "inherit" };
};

export const buildCodexSpawnArgs = (input: SpawnRuntimeInput, profile?: string | null): string[] => {
  const args: string[] = [];
  const selection = resolveCodexLaunchSelection(input.modelProfile ?? profile);
  const approvalPolicy = mapApprovalPolicy(input.permissionMode);
  const initialPrompt = input.initialPrompt?.trim();

  if (selection.type === "profile") {
    args.push("--profile", selection.profile);
  }

  if (selection.type === "model") {
    args.push("--model", selection.model);
    if (selection.reasoningEffort) {
      args.push("-c", `model_reasoning_effort="${selection.reasoningEffort}"`);
    }
  }

  if (approvalPolicy) {
    args.push("--ask-for-approval", approvalPolicy);
  }

  if (initialPrompt) {
    args.push("exec", [input.skillPromptContext, initialPrompt].filter(Boolean).join("\n\n"));
  }

  return args;
};

export class CodexCliRuntime implements AgentRuntime {
  readonly kind = "codex_cli" as const;

  private readonly executablePath: string;
  private readonly profile: string | null;
  private readonly spawner: RuntimeProcessSpawner;
  private readonly sessions = new Map<string, CodexSession>();
  private readonly handlers = new Set<RuntimeEventHandler>();
  private sequence = 0;

  constructor(options: CodexCliRuntimeOptions = {}) {
    this.executablePath = resolveCodexExecutablePath(
      options.executablePath ?? process.env.CODEX_EXECUTABLE ?? process.env.LOCAL_CODEX_WINDOWS_STORE_PATH ?? "codex"
    );
    this.profile = options.profile ?? process.env.CODEX_PROFILE ?? null;
    this.spawner =
      options.spawner ??
      ((command, args, spawnOptions) =>
        nodeSpawn(command, args, {
          cwd: spawnOptions.cwd,
          env: spawnOptions.env,
          shell: false,
          windowsHide: true,
          stdio: ["pipe", "pipe", "pipe"]
        }) as RuntimeChildProcess);
  }

  onEvent(handler: RuntimeEventHandler): UnsubscribeRuntimeEvent {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async spawn(input: SpawnRuntimeInput): Promise<RuntimeSessionDescriptor> {
    const args = buildCodexSpawnArgs(input, this.profile);
    const child = this.spawner(this.executablePath, args, {
      cwd: input.workingDirectory,
      env: buildCodexSpawnEnv(process.env)
    });
    const session: CodexSession = {
      agentId: input.agentId,
      sessionId: input.sessionId,
      workingDirectory: input.workingDirectory,
      modelProfile: input.modelProfile ?? this.profile,
      process: child,
      activeResponseMessageId: input.responseMessageId ?? null,
      pendingInput: input.initialPrompt ?? "",
      outputBuffer: "",
      reportedUsage: false,
      stopping: false,
      oneShotExec: Boolean(input.initialPrompt?.trim()),
      lastStatus: null
    };
    this.sessions.set(input.sessionId, session);

    await this.emit({ type: "session_started", agentId: input.agentId, sessionId: input.sessionId });
    await this.emit({
      type: "command_started",
      agentId: input.agentId,
      sessionId: input.sessionId,
      command: [this.executablePath, ...args].join(" ")
    });
    await this.emitStatus(session, "thinking");

    this.attachStream(session, "stdout", child.stdout);
    this.attachStream(session, "stderr", child.stderr);
    child.stdin?.on("error", (error) => {
      const errorCode =
        error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
      if (session.oneShotExec || session.stopping) {
        return;
      }
      if (errorCode === "EPIPE") {
        this.sessions.delete(session.sessionId);
        return;
      }
      void this.emit({ type: "error", agentId: session.agentId, sessionId: session.sessionId, message: error.message });
    });
    child.on("error", (error) => {
      void this.emit({ type: "error", agentId: session.agentId, sessionId: session.sessionId, message: error.message });
    });
    child.on("exit", (code) => {
      void this.handleExit(session, code);
    });

    if (input.initialPrompt?.trim()) {
      session.process.stdin?.end();
    }

    return {
      agentId: input.agentId,
      sessionId: input.sessionId,
      runtimeKind: this.kind
    };
  }

  async sendMessage(input: SendRuntimeMessageInput): Promise<void> {
    const session = this.requireSession(input.sessionId);
    session.activeResponseMessageId = input.responseMessageId;
    session.pendingInput = input.message;
    session.outputBuffer = "";
    session.reportedUsage = false;
    const stdin = session.process.stdin;

    await this.emitStatus(session, "thinking");

    if (!stdin?.writable || stdin.writableEnded || stdin.destroyed) {
      this.sessions.delete(input.sessionId);
      throw new Error(`Codex run is no longer accepting input for session: ${input.sessionId}`);
    }

    const message = [input.skillPromptContext, input.message].filter(Boolean).join("\n\n");
    try {
      stdin.write(`${message}\n`);
    } catch (error) {
      const errorCode =
        error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : null;
      if (errorCode === "EPIPE") {
        this.sessions.delete(input.sessionId);
        throw new Error(`Codex run already ended for session: ${input.sessionId}`);
      }
      throw error;
    }
  }

  async stop(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    session.stopping = true;
    session.process.kill();
    await this.emitStatus(session, "stopped");
    await this.emit({ type: "session_stopped", agentId: session.agentId, sessionId });
  }

  private attachStream(session: CodexSession, stream: "stdout" | "stderr", readable?: Readable | null): void {
    if (!readable) {
      return;
    }

    const lines = createInterface({ input: readable });
    lines.on("line", (line) => {
      void this.handleLine(session, stream, line);
    });
  }

  private async handleLine(session: CodexSession, stream: "stdout" | "stderr", line: string): Promise<void> {
    await this.emit({ type: "log_line", agentId: session.agentId, sessionId: session.sessionId, stream, line });

    const status = deriveStatusFromLogLine(line, stream);
    if (status) {
      await this.emitStatus(session, status);
    }

    const usage = parseTokenUsageFromLine(line);
    if (usage) {
      session.reportedUsage = true;
      await this.emit({
        type: "token_usage",
        agentId: session.agentId,
        sessionId: session.sessionId,
        messageId: session.activeResponseMessageId ?? undefined,
        modelProfile: session.modelProfile,
        usage
      });
      return;
    }

    if (stream === "stdout" && session.activeResponseMessageId && line.trim().length > 0) {
      const chunk = `${line}\n`;
      session.outputBuffer += chunk;
      await this.emit({
        type: "message_chunk",
        agentId: session.agentId,
        sessionId: session.sessionId,
        messageId: session.activeResponseMessageId,
        chunk
      });
    }
  }

  private async handleExit(session: CodexSession, code: number | null): Promise<void> {
    try {
      await this.emit({
        type: "command_completed",
        agentId: session.agentId,
        sessionId: session.sessionId,
        command: this.executablePath,
        exitCode: code
      });

      if (session.activeResponseMessageId && !session.reportedUsage) {
        await this.emit({
          type: "token_usage",
          agentId: session.agentId,
          sessionId: session.sessionId,
          messageId: session.activeResponseMessageId,
          modelProfile: session.modelProfile,
          usage: estimateTokenUsage(session.pendingInput, session.outputBuffer)
        });
      }

      if (session.stopping) {
        return;
      }

      if (code === 0) {
        await this.emitStatus(session, "completed");
        await this.emit({ type: "session_completed", agentId: session.agentId, sessionId: session.sessionId });
      } else {
        await this.emit({
          type: "error",
          agentId: session.agentId,
          sessionId: session.sessionId,
          message: `Codex process exited with code ${code ?? "unknown"}`
        });
      }
    } finally {
      this.sessions.delete(session.sessionId);
    }
  }

  private requireSession(sessionId: string): CodexSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Codex session not found: ${sessionId}`);
    }

    return session;
  }

  private async emitStatus(session: CodexSession, status: AgentStatus): Promise<void> {
    if (session.lastStatus === status) {
      return;
    }

    session.lastStatus = status;
    await this.emit({ type: "status_changed", agentId: session.agentId, sessionId: session.sessionId, status });
  }

  private async emit(event: RuntimeEventDraft): Promise<void> {
    const sequence = ++this.sequence;
    const runtimeEvent = {
      ...event,
      id: createRuntimeEventId("codex-event", event.agentId, event.sessionId, sequence),
      at: new Date().toISOString()
    } as AgentRuntimeEvent;

    for (const handler of this.handlers) {
      await handler(runtimeEvent);
    }
  }
}
