import { spawn as nodeSpawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type {
  AgentRuntimeEvent,
  RuntimeSessionDescriptor,
  SendRuntimeMessageInput,
  SpawnRuntimeInput
} from "../../shared/types/agent";
import { deriveStatusFromLogLine } from "./agentStatusMachine";
import type { AgentRuntime, RuntimeEventHandler, UnsubscribeRuntimeEvent } from "./AgentRuntime";
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
};

export type CodexCliRuntimeOptions = {
  executablePath?: string;
  profile?: string | null;
  spawner?: RuntimeProcessSpawner;
};

export const buildCodexSpawnArgs = (input: SpawnRuntimeInput, profile?: string | null): string[] => {
  const args: string[] = [];
  const selectedProfile = input.modelProfile ?? profile;

  if (selectedProfile) {
    args.push("--profile", selectedProfile);
  }

  if (input.permissionMode) {
    args.push("--ask-for-approval", input.permissionMode);
  }

  if (input.initialPrompt || input.skillPromptContext) {
    args.push("exec", [input.skillPromptContext, input.initialPrompt].filter(Boolean).join("\n\n"));
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
    this.executablePath = options.executablePath ?? process.env.CODEX_EXECUTABLE ?? "codex";
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
      env: { ...process.env }
    });
    const session: CodexSession = {
      agentId: input.agentId,
      sessionId: input.sessionId,
      workingDirectory: input.workingDirectory,
      modelProfile: input.modelProfile ?? this.profile,
      process: child,
      activeResponseMessageId: null,
      pendingInput: input.initialPrompt ?? "",
      outputBuffer: "",
      reportedUsage: false,
      stopping: false
    };
    this.sessions.set(input.sessionId, session);

    await this.emit({ type: "session_started", agentId: input.agentId, sessionId: input.sessionId });
    await this.emit({
      type: "command_started",
      agentId: input.agentId,
      sessionId: input.sessionId,
      command: [this.executablePath, ...args].join(" ")
    });
    await this.emit({ type: "status_changed", agentId: input.agentId, sessionId: input.sessionId, status: "thinking" });

    this.attachStream(session, "stdout", child.stdout);
    this.attachStream(session, "stderr", child.stderr);
    child.on("error", (error) => {
      void this.emit({ type: "error", agentId: session.agentId, sessionId: session.sessionId, message: error.message });
    });
    child.on("exit", (code) => {
      void this.handleExit(session, code);
    });

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

    await this.emit({ type: "status_changed", agentId: input.agentId, sessionId: input.sessionId, status: "thinking" });

    if (!session.process.stdin?.writable) {
      throw new Error(`Codex process is not writable for session: ${input.sessionId}`);
    }

    const message = [input.skillPromptContext, input.message].filter(Boolean).join("\n\n");
    session.process.stdin.write(`${message}\n`);
  }

  async stop(sessionId: string): Promise<void> {
    const session = this.requireSession(sessionId);
    session.stopping = true;
    session.process.kill();
    await this.emit({ type: "status_changed", agentId: session.agentId, sessionId, status: "stopped" });
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
      await this.emit({ type: "status_changed", agentId: session.agentId, sessionId: session.sessionId, status });
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
      await this.emit({ type: "status_changed", agentId: session.agentId, sessionId: session.sessionId, status: "completed" });
      await this.emit({ type: "session_completed", agentId: session.agentId, sessionId: session.sessionId });
    } else {
      await this.emit({
        type: "error",
        agentId: session.agentId,
        sessionId: session.sessionId,
        message: `Codex process exited with code ${code ?? "unknown"}`
      });
    }
  }

  private requireSession(sessionId: string): CodexSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Codex session not found: ${sessionId}`);
    }

    return session;
  }

  private async emit(event: RuntimeEventDraft): Promise<void> {
    const runtimeEvent = {
      ...event,
      id: `codex-event-${++this.sequence}`,
      at: new Date().toISOString()
    } as AgentRuntimeEvent;

    for (const handler of this.handlers) {
      await handler(runtimeEvent);
    }
  }
}
