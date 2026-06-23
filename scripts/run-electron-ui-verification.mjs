import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import net from "node:net";
import { pathToFileURL } from "node:url";

const verifyScriptArg = process.argv[2]?.trim();

if (!verifyScriptArg) {
  throw new Error("Expected a verification script path, for example: scripts/verify-current-app-ui.mjs");
}

const projectRoot = process.cwd();
const verificationRoot = path.join(projectRoot, "verification");
const verifyScriptPath = path.resolve(projectRoot, verifyScriptArg);
const verifyLabel = path.basename(verifyScriptPath, path.extname(verifyScriptPath));
const requestedDebugPort = process.env.DEBUG_PORT?.trim() || "9555";
const electronCandidates = [
  path.join(projectRoot, "node_modules", ".ignored_electron", "dist", "electron.exe"),
  path.join(projectRoot, "node_modules", "electron", "dist", "electron.exe"),
  path.join(projectRoot, "release", "win-unpacked", "electron.exe")
];
const electronPath = electronCandidates.find((candidate) => existsSync(candidate));

if (!electronPath) {
  throw new Error("Unable to find an Electron runtime for UI verification.");
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "").replace("T", "-").slice(0, 15);
const userDataDir = path.join(verificationRoot, `${verifyLabel}-userdata-${timestamp}`);
const stdoutLogPath = path.join(verificationRoot, `${verifyLabel}-electron.stdout.log`);
const stderrLogPath = path.join(verificationRoot, `${verifyLabel}-electron.stderr.log`);

await mkdir(verificationRoot, { recursive: true });
await mkdir(userDataDir, { recursive: true });
await writeFile(stdoutLogPath, "", "utf8");
await writeFile(stderrLogPath, "", "utf8");

const reservePort = (port) =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to resolve an available debugger port.")));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(String(address.port));
      });
    });
  });

const debugPort = await reservePort(Number.parseInt(requestedDebugPort, 10)).catch(() => reservePort(0));

const electronChild = spawn(electronPath, ["--disable-gpu", "--use-angle=swiftshader", projectRoot], {
  cwd: projectRoot,
  env: {
    ...process.env,
    DEBUG_PORT: debugPort,
    PIXEL_FACTORY_AUTOMATION_MODE: process.env.PIXEL_FACTORY_AUTOMATION_MODE?.trim() || "ui_debug",
    PIXEL_FACTORY_AUTOMATION_USER_DATA: userDataDir
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
electronChild.stdout.on("data", (chunk) => {
  stdout += chunk.toString("utf8");
});
electronChild.stderr.on("data", (chunk) => {
  stderr += chunk.toString("utf8");
});

const persistLogs = async () => {
  await Promise.all([writeFile(stdoutLogPath, stdout, "utf8"), writeFile(stderrLogPath, stderr, "utf8")]);
};

const waitForDebugger = async (timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (electronChild.exitCode !== null) {
      throw new Error(`Electron exited early with code ${electronChild.exitCode}.`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore boot timing while Electron starts.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for Electron debugger on port ${debugPort}.`);
};

const stopElectron = async () => {
  if (electronChild.exitCode !== null) {
    await persistLogs();
    return;
  }

  electronChild.kill();
  await Promise.race([
    new Promise((resolve) => electronChild.once("close", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000))
  ]);
  await persistLogs();
};

try {
  await waitForDebugger();
  process.env.DEBUG_PORT = debugPort;
  await import(pathToFileURL(verifyScriptPath).href);
} finally {
  await stopElectron();
}
