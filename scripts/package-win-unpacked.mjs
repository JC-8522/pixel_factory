import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const nodeExecutable = process.execPath;

const run = (scriptPath, args = []) =>
  new Promise((resolve, reject) => {
    const child = spawn(nodeExecutable, [scriptPath, ...args], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${path.basename(scriptPath)} exited with code ${code ?? "unknown"}`));
    });
  });

await run(path.join(projectRoot, "scripts", "prepare-builder-app.mjs"));
await run(path.join(projectRoot, "node_modules", "electron-builder", "cli.js"), [
  "--dir",
  "--config",
  path.join(projectRoot, "scripts", "electron-builder.staging.json")
]);
