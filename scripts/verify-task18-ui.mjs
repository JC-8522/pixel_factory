import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/out";
const debugPort = process.env.DEBUG_PORT ?? "9222";
const targetUrlFragment = process.env.TARGET_URL_FRAGMENT ?? "localhost";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const target = targets.find((item) => item.url?.includes(targetUrlFragment)) ?? targets[0];
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
  if (message.error) reject(new Error(JSON.stringify(message.error)));
  else resolve(message.result);
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await send("Page.bringToFront");
      await delay(150);
      const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      const filePath = path.join(outDir, name);
      await writeFile(filePath, Buffer.from(result.data, "base64"));
      return filePath;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await delay(400);
    }
  }

  throw new Error(`Unable to capture screenshot: ${name}`);
};

const clickButtonByText = async (text) => {
  await evalExpr(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === ${JSON.stringify(text)});
    if (!button) throw new Error('Button not found: ' + ${JSON.stringify(text)});
    button.click();
    return true;
  })()`);
};

const waitForSelector = async (selector, timeoutMs = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const visible = await evalExpr(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (visible) return true;
    await delay(200);
  }
  throw new Error(`Timed out waiting for selector: ${selector}`);
};

const openCreateDialog = async () => {
  const started = Date.now();
  while (Date.now() - started < 8000) {
    const alreadyOpen = await evalExpr(`Boolean(document.querySelector('[aria-label="Create agent"]'))`);
    if (alreadyOpen) return true;
    await clickButtonByText("Create Agent");
    await delay(250);
  }
  throw new Error("Timed out opening the Create Agent dialog.");
};

const waitForText = async (text, timeoutMs = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const visible = await evalExpr(`document.body.innerText.includes(${JSON.stringify(text)})`);
    if (visible) return true;
    await delay(200);
  }
  throw new Error(`Timed out waiting for text: ${text}`);
};

await send("Page.enable");
await send("Runtime.enable");
await delay(1200);

const screenshots = {};

await clickButtonByText("Office");
await delay(700);
screenshots.office = await screenshot("task18-office-surface.png");

await openCreateDialog();
await waitForSelector('[aria-label="Search skills"]');
await waitForSelector('[aria-label="Filter skill category"]');
await waitForSelector('.skill-group-toggle');
const createAgentDialog = await evalExpr(`(() => ({
  hasSearch: Boolean(document.querySelector('[aria-label="Search skills"]')),
  hasCategoryFilter: Boolean(document.querySelector('[aria-label="Filter skill category"]')),
  hasSelectedOnly: document.body.innerText.includes('Selected only'),
  hasCollapsibleGroups: Boolean(document.querySelector('.skill-group-toggle'))
}))()`);
screenshots.createAgent = await screenshot("task18-create-agent-dialog.png");
await evalExpr(`document.querySelector('[aria-label="Close create agent dialog"]')?.click(); true`);
await delay(500);

await clickButtonByText("Profiles");
await waitForText("Agent Profiles");
screenshots.profiles = await screenshot("task18-profiles.png");

await clickButtonByText("Agent Packs");
await waitForText("Agent Pack Review");
screenshots.packs = await screenshot("task18-agent-packs.png");

await clickButtonByText("Tasks");
await waitForText("Task Board");
screenshots.tasks = await screenshot("task18-task-board.png");

await clickButtonByText("Meeting Room");
await waitForText("Meeting Room");
screenshots.meeting = await screenshot("task18-meeting-room.png");

await clickButtonByText("Integrations");
await waitForText("Integrations");
screenshots.integrations = await screenshot("task18-integrations.png");

await clickButtonByText("Permissions");
await waitForText("Permissions");
screenshots.permissions = await screenshot("task18-permissions.png");

await send("Emulation.setDeviceMetricsOverride", {
  width: 900,
  height: 640,
  deviceScaleFactor: 1,
  mobile: false
});
await delay(400);
screenshots.smallWindow = await screenshot("task18-small-window-layout.png");
await send("Emulation.clearDeviceMetricsOverride");

const state = await evalExpr(`(async () => ({
  appTitle: document.querySelector('.brand-block h1')?.textContent ?? null,
  navCount: document.querySelectorAll('.nav-item').length,
  permissionsVisible: document.body.innerText.includes('Scoped Allow Rules'),
  profileCount: (await window.codexOffice.profiles.list()).length,
  taskCount: (await window.codexOffice.tasks.list()).length,
  meetingCount: (await window.codexOffice.meetings.list()).length,
  packCount: (await window.codexOffice.agentPacks.listInstalled()).length,
  workspaceCount: (await window.codexOffice.workspaces.list()).length
}))()`);

console.log(JSON.stringify({ createAgentDialog, state, screenshots }, null, 2));
ws.close();
