import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const target =
  targets.find((item) => item.type === "page" && !String(item.url ?? "").startsWith("devtools://")) ?? targets[0];

if (!target) {
  throw new Error("No Electron renderer target found.");
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
const decodeMessagePayload = async (value) => {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Blob) {
    return value.text();
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value).toString("utf8");
  }
  return Buffer.from(value).toString("utf8");
};

ws.addEventListener("message", async (event) => {
  const message = JSON.parse(await decodeMessagePayload(event.data));
  const key = `${message.id ?? ""}`;
  if (!message.id || !pending.has(key)) {
    return;
  }

  const { resolve, reject } = pending.get(key);
  pending.delete(key);
  if (message.error) {
    reject(new Error(JSON.stringify(message.error)));
  } else {
    resolve(message.result);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(`${callId}`, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });

const evalExpr = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
};

const waitFor = async (predicateExpression, timeoutMs = 20000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const ready = await evalExpr(predicateExpression);
      if (ready) {
        return ready;
      }
    } catch {
      // Ignore transient renderer timing during reload.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for predicate: ${predicateExpression}`);
};

const screenshot = async (name) => {
  await send("Page.bringToFront", {});
  await delay(150);
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const filePath = path.join(outDir, name);
  await writeFile(filePath, Buffer.from(result.data, "base64"));
  return filePath;
};

await evalExpr(`(() => {
  window.__codexUiErrors = [];
  window.addEventListener('error', (event) => {
    window.__codexUiErrors.push(String(event.message ?? 'unknown error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    window.__codexUiErrors.push(reason);
  });
  window.confirm = () => true;
  return true;
})()`);

await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);

await evalExpr(`(async () => {
  const agents = await window.codexOffice.agents.list();
  await Promise.all(agents.map((agent) => window.codexOffice.agents.delete(agent.id)));
  window.location.reload();
  return true;
})()`);

await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
const slotKey = await waitFor(
  `(() => document.querySelector('.office-slot[data-seat-state="available"]')?.getAttribute('data-slot-key') || false)()`,
  15000
);

await evalExpr(`(() => {
  const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]');
  if (!(slot instanceof HTMLElement)) {
    throw new Error('Slot not found');
  }
  slot.click();
  return true;
})()`);

await waitFor(`Boolean(document.querySelector('[aria-label="Create agent confirmation"]'))`, 15000);
const confirmScreenshot = await screenshot("diagnose-create-agent-confirm.png");

const beforeClick = await evalExpr(`(async () => ({
  selectedSlotKey: document.querySelector('.office-slot.is-selected')?.getAttribute('data-slot-key') ?? null,
  createConfirmOpen: Boolean(document.querySelector('[aria-label="Create agent confirmation"]')),
  createDialogOpen: Boolean(document.querySelector('[aria-label="Create agent"]')),
  bodyPreview: document.body.innerText.replace(/\\s+/g, ' ').trim().slice(0, 800)
}))()`);

await evalExpr(`(() => {
  const normalize = (value) => value.replace(/\\s+/g, ' ').trim();
  const button = [...document.querySelectorAll('button')].find((item) => normalize(item.textContent ?? '') === 'Set Up Workspace');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('Set Up Workspace button not found.');
  }
  button.focus();
  setTimeout(() => button.click(), 0);
  return true;
})()`);

await delay(1500);
const dialogScreenshot = await screenshot("diagnose-create-agent-after-click.png");

const report = {
  slotKey,
  beforeClick,
  screenshots: {
    confirm: confirmScreenshot,
    afterClick: dialogScreenshot
  }
};

const reportPath = path.join(outDir, "diagnose-create-agent-flow.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, reportPath }, null, 2));

ws.close();
