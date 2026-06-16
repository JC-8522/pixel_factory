import type { AgentStatus } from "../../shared/types/app";
import type { AgentRuntimeEvent, RuntimeFileAction } from "../../shared/types/agent";

const statusValues = new Set<AgentStatus>([
  "idle",
  "thinking",
  "running_command",
  "reading_files",
  "editing_files",
  "waiting_user_input",
  "error",
  "completed",
  "stopped"
]);

export const normalizeAgentStatus = (status: string): AgentStatus | null =>
  statusValues.has(status as AgentStatus) ? (status as AgentStatus) : null;

export const statusForFileAction = (action: RuntimeFileAction): AgentStatus => {
  if (action === "read") {
    return "reading_files";
  }

  return "editing_files";
};

export const deriveStatusFromLogLine = (line: string, stream: "stdout" | "stderr" = "stdout"): AgentStatus | null => {
  const normalized = line.toLowerCase();

  if (stream === "stderr" && /(error|failed|exception|panic)/i.test(line)) {
    return "error";
  }

  if (/(waiting for|needs input|approval required|confirm|permission)/.test(normalized)) {
    return "waiting_user_input";
  }

  if (/(running command|exec|shell|powershell|bash|npm|pnpm|git )/.test(normalized)) {
    return "running_command";
  }

  if (/(reading|read file|open file|inspect|search|rg )/.test(normalized)) {
    return "reading_files";
  }

  if (/(writing|editing|patched|updated|created file|delete file|apply_patch)/.test(normalized)) {
    return "editing_files";
  }

  if (/(complete|completed|done|finished)/.test(normalized)) {
    return "completed";
  }

  if (/(thinking|reasoning|planning)/.test(normalized)) {
    return "thinking";
  }

  return null;
};

export const deriveStatusFromRuntimeEvent = (event: AgentRuntimeEvent): AgentStatus | null => {
  switch (event.type) {
    case "status_changed":
      return normalizeAgentStatus(event.status);
    case "message_chunk":
    case "token_usage":
      return "thinking";
    case "log_line":
      return deriveStatusFromLogLine(event.line, event.stream);
    case "command_started":
      return "running_command";
    case "command_completed":
      return event.exitCode === 0 ? "thinking" : "error";
    case "file_touched":
      return statusForFileAction(event.action);
    case "waiting_user_input":
      return "waiting_user_input";
    case "error":
      return "error";
    case "session_completed":
      return "completed";
    case "session_stopped":
      return "stopped";
    case "session_started":
      return "idle";
  }
};
