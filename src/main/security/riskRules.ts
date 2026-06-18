import type { PermissionRiskKind } from "../../shared/ipc";
import { redactSensitiveText } from "./secretsRedaction";

export type CommandRiskAssessment = {
  command: string;
  redactedCommand: string;
  commandPattern: string;
  isCommand: boolean;
  riskLevel: "safe" | "review";
  riskKinds: PermissionRiskKind[];
  reasons: string[];
};

const commandPrefixes = [
  "cmd:",
  "command:",
  "/cmd",
  "/command"
];

const knownCommands = new Set([
  "pwd",
  "ls",
  "dir",
  "rg",
  "cat",
  "type",
  "echo",
  "git",
  "npm",
  "pnpm",
  "yarn",
  "pip",
  "python",
  "node",
  "curl",
  "wget",
  "Invoke-WebRequest",
  "irm",
  "iwr",
  "Remove-Item",
  "rm",
  "del",
  "rmdir",
  "winget"
]);

const normalizeCommand = (input: string): string => input.trim().replace(/\s+/g, " ");

export const extractCommandText = (message: string): string | null => {
  const trimmed = message.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const prefix = commandPrefixes.find((item) => lower.startsWith(item));
  if (prefix) {
    const separatorAdjusted = trimmed.slice(prefix.length).trim();
    return separatorAdjusted.length > 0 ? separatorAdjusted : null;
  }

  const firstLine = trimmed.split(/\r?\n/, 1)[0]?.trim() ?? "";
  const firstToken = firstLine.split(/\s+/, 1)[0] ?? "";
  if (knownCommands.has(firstToken)) {
    return firstLine;
  }

  return null;
};

export const assessCommandRisk = (message: string): CommandRiskAssessment => {
  const extracted = extractCommandText(message);
  if (!extracted) {
    return {
      command: "",
      redactedCommand: "",
      commandPattern: "",
      isCommand: false,
      riskLevel: "safe",
      riskKinds: [],
      reasons: []
    };
  }

  const command = normalizeCommand(extracted);
  const lower = command.toLowerCase();
  const riskKinds = new Set<PermissionRiskKind>();
  const reasons: string[] = [];

  if (/\b(rm|del|rmdir|remove-item)\b/.test(lower)) {
    riskKinds.add("delete");
    reasons.push("Deletes files or directories.");
  }

  if (/\b(npm|pnpm|yarn|pip|winget)\b.*\b(install|add|upgrade)\b/.test(lower)) {
    riskKinds.add("install");
    reasons.push("Installs or upgrades local packages or tools.");
  }

  if (/\b(curl|wget|invoke-webrequest|iwr|irm)\b/.test(lower) || /\bgit\s+clone\b/.test(lower)) {
    riskKinds.add("network");
    reasons.push("Accesses the network or downloads remote content.");
  }

  if (/\b(token|secret|password|api[_-]?key)\b/i.test(command)) {
    riskKinds.add("credential");
    reasons.push("Contains credential-like content that should be redacted.");
  }

  if (/\b(sudo|chmod|takeown|icacls|reg\s+add|sc\s+config)\b/.test(lower)) {
    riskKinds.add("system");
    reasons.push("Changes system-level permissions or configuration.");
  }

  return {
    command,
    redactedCommand: redactSensitiveText(command),
    commandPattern: lower,
    isCommand: true,
    riskLevel: riskKinds.size > 0 ? "review" : "safe",
    riskKinds: [...riskKinds],
    reasons
  };
};
