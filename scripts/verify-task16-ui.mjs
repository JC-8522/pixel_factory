import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/out";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const target = targets.find((item) => item.url?.includes("localhost:5173")) ?? targets[0];

if (!target) throw new Error("No Electron renderer target found.");

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) {
    reject(new Error(JSON.stringify(message.error)));
  } else {
    resolve(message.result);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });

const evalExpr = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? JSON.stringify(result.exceptionDetails));
  return result.result.value;
};

const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const filePath = path.join(outDir, name);
  await writeFile(filePath, Buffer.from(result.data, "base64"));
  return filePath;
};

await send("Page.enable");
await send("Runtime.enable");
await delay(1200);

const spawned = await evalExpr(`(async () => {
  const cwd = 'C:/Users/Administrator/Desktop/repo/pixel_factory';
  const stamp = Date.now();
  const session = await window.codexOffice.runtime.spawnAgent({
    id: 'task16-spawn-' + stamp,
    name: 'Task16 Spawn Check',
    role: 'Developer Agent',
    workingDirectory: cwd,
    runtimeKind: 'mock',
    permissionMode: 'ask',
    autoRunMode: 'manual',
    currentTask: 'Verify spawned mode still works during Task 16.',
    modelProfile: 'mock-default'
  });
  const agents = await window.codexOffice.agents.list();
  return {
    sessionStatus: session.status,
    agentVisible: agents.some((agent) => agent.id === 'task16-spawn-' + stamp)
  };
})()`);

await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Integrations')?.click();
  return true;
})()`);
await delay(800);

const createdWorkspace = await evalExpr(`(async () => {
  const id = 'task16-workspace-' + Date.now();
  await window.codexOffice.workspaces.create({
    id,
    name: 'Task 16 Workspace',
    rootPath: 'C:\\\\Users\\\\Administrator\\\\Desktop\\\\repo\\\\pixel_factory'
  });
  await window.codexOffice.workspaces.select(id);
  return id;
})()`);
await send("Page.reload");
await delay(1600);
await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Integrations')?.click();
  return true;
})()`);
await delay(700);
const workspace = await evalExpr(`(async () => {
  const active = await window.codexOffice.workspaces.getActive();
  const workspaces = await window.codexOffice.workspaces.list();
  return {
    expected: ${JSON.stringify(createdWorkspace)},
    active,
    createdVisible: document.body.innerText.includes('Task 16 Workspace'),
    workspaceCount: workspaces.length
  };
})()`);
const workspaceShot = await screenshot("task16-workspace-selector.png");

const integrationStatus = await evalExpr(`(async () => {
  const status = await window.codexOffice.integrations.status();
  const text = document.body.innerText;
  return {
    attachStatus: status.attach.status,
    attachExplained: text.includes('Attach Mode') && text.includes('reliable'),
    mcpStatus: status.mcp.status,
    mcpExplained: text.includes('MCP Runtime Bridge') && text.includes('no MCP provider'),
    githubVisible: text.includes('GitHub PR Boundary'),
    pluginsVisible: text.includes('Plugin Registry')
  };
})()`);
const statusShot = await screenshot("task16-attach-mcp-status.png");

const theme = await evalExpr(`(async () => {
  [...document.querySelectorAll('.theme-swatch')].find((button) => button.textContent.includes('forest'))?.click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const selected = await window.codexOffice.officeTheme.get();
  return {
    selected,
    appTheme: document.querySelector('.app-shell')?.getAttribute('data-theme'),
    swatchActive: [...document.querySelectorAll('.theme-swatch.active')].some((button) => button.textContent.includes('forest'))
  };
})()`);
const themeShot = await screenshot("task16-theme-forest.png");

const replay = await evalExpr(`(async () => {
  const events = await window.codexOffice.timeline.replay({ limit: 20 });
  return {
    count: events.length,
    hasWorkspaceEvent: events.some((event) => event.type === 'project_workspace_selected' || event.type === 'project_workspace_created'),
    hasThemeEvent: events.some((event) => event.type === 'office_theme_selected')
  };
})()`);

console.log(JSON.stringify({ spawned, workspace, integrationStatus, theme, replay, screenshots: { workspaceShot, statusShot, themeShot } }, null, 2));
ws.close();
