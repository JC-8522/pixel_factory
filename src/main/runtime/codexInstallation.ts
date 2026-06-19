import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

export type LocalCodexStatus = "ready" | "missing" | "blocked";

export type LocalCodexAvailability = {
  status: LocalCodexStatus;
  sourcePath: string | null;
  launchPath: string | null;
  version: string | null;
  message: string;
  guidance: string[];
};

const WINDOWS_STORE_SEGMENT = `${["Program Files", "WindowsApps"].join("\\")}\\`;

export const isWindowsStorePath = (value: string): boolean =>
  value.replaceAll("/", "\\").includes(WINDOWS_STORE_SEGMENT);

const getLocalExecutableCachePath = (sourcePath: string): string => {
  const localBase =
    process.env.LOCALAPPDATA ??
    process.env.APPDATA ??
    join(homedir(), "AppData", "Local");
  return join(localBase, "local-codex-office", "bin", sourcePath.toLowerCase().endsWith(".exe") ? "codex.exe" : "codex");
};

const parseVersionParts = (value: string): number[] =>
  value
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

const compareVersionStrings = (left: string, right: string): number => {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
};

const detectFromWindowsApps = (): string | null => {
  if (process.platform !== "win32") {
    return null;
  }

  const windowsAppsPath = join(process.env.ProgramFiles ?? "C:\\Program Files", "WindowsApps");

  try {
    const candidates = readdirSync(windowsAppsPath)
      .filter((name) => name.startsWith("OpenAI.Codex_"))
      .map((name) => {
        const match = /^OpenAI\.Codex_([^_]+)_x64__/.exec(name);
        return {
          name,
          version: match?.[1] ?? "0.0.0.0",
          executablePath: join(windowsAppsPath, name, "app", "resources", "codex.exe")
        };
      })
      .filter((candidate) => existsSync(candidate.executablePath))
      .sort((left, right) => compareVersionStrings(right.version, left.version));

    return candidates[0]?.executablePath ?? null;
  } catch {
    return null;
  }
};

export const prepareCodexLaunchPath = (configuredPath: string): string => {
  if (process.platform !== "win32") {
    return configuredPath;
  }

  if (isAbsolute(configuredPath)) {
    if (!isWindowsStorePath(configuredPath)) {
      return configuredPath;
    }

    const localCopyPath = getLocalExecutableCachePath(configuredPath);
    mkdirSync(dirname(localCopyPath), { recursive: true });
    try {
      copyFileSync(configuredPath, localCopyPath);
    } catch {
      if (!existsSync(localCopyPath)) {
        throw new Error(`Unable to prepare cached Codex executable at ${localCopyPath}`);
      }
    }
    return localCopyPath;
  }

  return configuredPath;
};

const detectCodexSourcePath = (): string | null => {
  if (process.env.CODEX_EXECUTABLE) {
    return process.env.CODEX_EXECUTABLE;
  }

  const windowsAppsSource = detectFromWindowsApps();
  if (windowsAppsSource) {
    return windowsAppsSource;
  }

  try {
    const locator = process.platform === "win32" ? "where.exe" : "which";
    const output = execFileSync(locator, ["codex"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
    return (
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? null
    );
  } catch {
    return null;
  }
};

const safeReadVersion = (launchPath: string): string | null => {
  try {
    const output = execFileSync(launchPath, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
      windowsHide: true
    });
    return output.trim() || null;
  } catch {
    return null;
  }
};

export const inspectLocalCodexAvailability = (): LocalCodexAvailability => {
  const sourcePath = detectCodexSourcePath();

  if (!sourcePath) {
    return {
      status: "missing",
      sourcePath: null,
      launchPath: null,
      version: null,
      message: "Local Codex is not installed or not discoverable on this machine.",
      guidance: [
        "Install the Codex desktop app first.",
        "Open Codex once so the local executable alias is registered.",
        "Restart this app after Codex is available."
      ]
    };
  }

  try {
    const launchPath = prepareCodexLaunchPath(sourcePath);
    if (!existsSync(launchPath)) {
      return {
        status: "blocked",
        sourcePath,
        launchPath,
        version: null,
        message: "Codex was detected, but the local launch path could not be prepared.",
        guidance: [
          "Check that the Codex desktop installation is complete.",
          "Reopen Codex and then restart this app.",
          "If this is Windows, confirm the app can copy the Codex executable into local app data."
        ]
      };
    }

    return {
      status: "ready",
      sourcePath,
      launchPath,
      version: safeReadVersion(launchPath),
      message: "Local Codex is ready for agent creation.",
      guidance: []
    };
  } catch {
    return {
      status: "blocked",
      sourcePath,
      launchPath: null,
      version: null,
      message: "Codex was detected, but this app could not prepare a runnable local executable.",
      guidance: [
        "Reopen Codex and restart this app.",
        "Confirm this machine allows local process execution from app data.",
        "If the problem persists, reinstall Codex and try again."
      ]
    };
  }
};
