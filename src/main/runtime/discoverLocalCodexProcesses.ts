import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AgentRecord } from "../../shared/types/records";

const execFileAsync = promisify(execFile);

type DiscoveredProcess = {
  pid: number;
  name: string;
  path: string | null;
};

const nowRecord = (): string => new Date().toISOString();

const toAgentRecord = (processInfo: DiscoveredProcess): AgentRecord => {
  const timestamp = nowRecord();

  return {
    id: `local-codex-${processInfo.pid}`,
    name: processInfo.name,
    role: "Detected Codex Process",
    profile_id: null,
    profile_snapshot_json: "{}",
    status: "running_command",
    current_task: "Detected local Codex process",
    working_directory: processInfo.path ?? "",
    current_branch: null,
    last_command: processInfo.path ?? processInfo.name,
    runtime_kind: "codex_cli",
    permission_mode: "external",
    auto_run_mode: "external",
    position_x: 0,
    position_y: 0,
    metadata_json: JSON.stringify({ detected: true, processId: processInfo.pid, executablePath: processInfo.path }),
    created_at: timestamp,
    updated_at: timestamp
  };
};

const parseWindowsProcessJson = (stdout: string): DiscoveredProcess[] => {
  if (stdout.trim().length === 0) {
    return [];
  }

  const parsed = JSON.parse(stdout) as unknown;
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows
    .map((row) => row as { Id?: number; ProcessName?: string; Path?: string })
    .filter((row) => typeof row.Id === "number" && typeof row.ProcessName === "string")
    .map((row) => ({ pid: row.Id as number, name: row.ProcessName as string, path: row.Path ?? null }));
};

const discoverWindowsCodexProcesses = async (): Promise<DiscoveredProcess[]> => {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "Get-Process | Where-Object { $_.ProcessName -like '*codex*' } | Select-Object Id,ProcessName,Path | ConvertTo-Json"
  ]);

  return parseWindowsProcessJson(stdout);
};

const discoverUnixCodexProcesses = async (): Promise<DiscoveredProcess[]> => {
  const { stdout } = await execFileAsync("ps", ["-eo", "pid=,comm=,args="]);

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\bcodex\b/i.test(line))
    .map((line) => {
      const [pidRaw, name, ...args] = line.split(/\s+/);
      return { pid: Number(pidRaw), name: name || "codex", path: args.join(" ") || null };
    })
    .filter((row) => Number.isFinite(row.pid));
};

export const discoverLocalCodexProcesses = async (): Promise<AgentRecord[]> => {
  try {
    const processes =
      process.platform === "win32" ? await discoverWindowsCodexProcesses() : await discoverUnixCodexProcesses();
    return processes.map(toAgentRecord);
  } catch {
    return [];
  }
};
