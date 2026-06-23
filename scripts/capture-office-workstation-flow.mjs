import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugLogPath = path.join(outDir, "office-workstation-flow.debug.log");
const electronCandidates = [
  path.join(process.cwd(), "node_modules", ".ignored_electron", "dist", "electron.exe"),
  path.join(process.cwd(), "node_modules", "electron", "dist", "electron.exe"),
  path.join(process.cwd(), "release", "win-unpacked", "electron.exe")
];
const electronPath = electronCandidates.find((candidate) => existsSync(candidate)) ?? electronCandidates[0];
const userDataDir = path.join(outDir, "tmp-runtime", `office-workstation-${Date.now()}`);
const reportPath = path.join(outDir, "office-workstation-report.json");
const stdoutLogPath = path.join(outDir, "office-workstation-electron.stdout.log");
const stderrLogPath = path.join(outDir, "office-workstation-electron.stderr.log");
const MAX_LOG_CHARS = 200_000;

await mkdir(path.dirname(stdoutLogPath), { recursive: true });
await writeFile(debugLogPath, "", "utf8");
await writeFile(stdoutLogPath, "", "utf8");
await writeFile(stderrLogPath, "", "utf8");
await appendFile(
  debugLogPath,
  `[${new Date().toISOString()}] electronPath=${electronPath} reportPath=${reportPath}\n`,
  "utf8"
);

const child = spawn(electronPath, ["--disable-gpu", "--use-angle=swiftshader", process.cwd()], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PIXEL_FACTORY_AUTOMATION_MODE: "verify_office_workstation_flow",
    PIXEL_FACTORY_AUTOMATION_OUT_DIR: outDir,
    PIXEL_FACTORY_AUTOMATION_USER_DATA: userDataDir
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
  if (stdout.length >= MAX_LOG_CHARS) {
    return;
  }
  stdout += chunk.toString("utf8").slice(0, MAX_LOG_CHARS - stdout.length);
});

child.stderr.on("data", (chunk) => {
  if (stderr.length >= MAX_LOG_CHARS) {
    return;
  }
  stderr += chunk.toString("utf8").slice(0, MAX_LOG_CHARS - stderr.length);
});

const exitCode = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", resolve);
});

await appendFile(debugLogPath, `[${new Date().toISOString()}] electron exit code: ${exitCode}\n`, "utf8");

await writeFile(stdoutLogPath, stdout, "utf8");
await writeFile(stderrLogPath, stderr, "utf8");

if (exitCode !== 0) {
  throw new Error(`Electron automation exited with code ${exitCode}.\n${stderr || stdout}`);
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
console.log(JSON.stringify(report, null, 2));
