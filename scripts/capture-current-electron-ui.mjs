import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9333";

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const target =
  targets.find((item) => item.type === "page" && !String(item.url ?? "").startsWith("devtools://")) ?? targets[0];

if (!target) {
  throw new Error("No Electron renderer target found.");
}

const ws = new WebSocket(target.webSocketDebuggerUrl ?? version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
  const pendingKey = `${message.id ?? ""}`;
  if (!message.id || !pending.has(pendingKey)) {
    return;
  }

  const { resolve, reject } = pending.get(pendingKey);
  pending.delete(pendingKey);
  if (message.error) {
    reject(new Error(JSON.stringify(message.error)));
  } else {
    resolve(message.result);
  }
});

const send = (method, params = {}, timeoutMs = 10000) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    const timeoutId = setTimeout(() => {
      pending.delete(`${callId}`);
      reject(new Error(`${method} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(`${callId}`, {
      resolve: (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });

const evaluate = async (expression, timeoutMs = 10000) => {
  const result = await send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true
    },
    timeoutMs
  );

  return result.result.value;
};

const inspectUi = () =>
  evaluate(`(() => ({
    title: document.title,
    bodyPreview: document.body.innerText.slice(0, 1200),
    buttonTexts: [...document.querySelectorAll('button')].map((button) => (button.textContent ?? '').replace(/\\s+/g, ' ').trim()).filter(Boolean),
    hasConversationWorkspace: Boolean(document.querySelector('.conversation-workspace-shell')),
    hasOfficeStage: Boolean(document.querySelector('.office-stage-frame')),
    slotAttrs: [...document.querySelectorAll('.office-slot')].map((item) => ({
      slotKey: item.getAttribute('data-slot-key'),
      seatState: item.getAttribute('data-seat-state'),
      workstationState: item.getAttribute('data-workstation-state'),
      agentId: item.getAttribute('data-agent-id'),
      className: item.className
    }))
  }))()`);

const initialState = await inspectUi();
const openWorkspaceResult = await evaluate(`(() => {
  if (document.querySelector('.conversation-workspace-shell')) {
    return { status: 'already-open' };
  }

  const occupiedSlot = document.querySelector('.office-slot[data-workstation-state="occupied"]');
  if (!(occupiedSlot instanceof HTMLElement)) {
    return { status: 'no-occupied-slot' };
  }

  occupiedSlot.click();
  return {
    status: 'clicked-occupied-slot',
    slotKey: occupiedSlot.getAttribute('data-slot-key'),
    agentId: occupiedSlot.getAttribute('data-agent-id')
  };
})()`);

let settledState = initialState;
for (let attempt = 0; attempt < 24; attempt += 1) {
  settledState = await inspectUi();
  if (settledState.hasConversationWorkspace || openWorkspaceResult.status !== "clicked-occupied-slot") {
    break;
  }

  await sleep(250);
}

const screenshotResult = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, 15000);
const screenshotPath = path.join(outDir, "conversation-focus-current-ui.png");
await writeFile(screenshotPath, Buffer.from(screenshotResult.data, "base64"));

console.log(
  JSON.stringify(
    {
      initialState,
      openWorkspaceResult,
      settledState,
      screenshotPath
    },
    null,
    2
  )
);

ws.close();
setTimeout(() => process.exit(0), 50);
