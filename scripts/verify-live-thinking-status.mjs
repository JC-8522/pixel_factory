import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const agentId = `live-thinking-${Date.now()}`;
const agentName = `Live Thinking ${Date.now()}`;
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const prompt = `Reply with the exact phrase: live thinking verification ${Date.now()}.`;

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const findRendererTarget = async (timeoutMs = 20000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    const target =
      targets.find((item) => item.type === "page" && !String(item.url ?? "").startsWith("devtools://")) ?? null;
    if (target) {
      return target;
    }
    await delay(250);
  }

  throw new Error("No Electron renderer target found.");
};

const target = await findRendererTarget();

const ws = new WebSocket(target.webSocketDebuggerUrl ?? version.webSocketDebuggerUrl);
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
      // Renderer reloads briefly invalidate execution context.
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

const installPageHooks = async () => {
  await evalExpr(`(() => {
    window.confirm = () => true;
    window.__codexUiErrors = window.__codexUiErrors ?? [];
    if (!window.__codexUiHooked) {
      window.addEventListener('error', (event) => {
        window.__codexUiErrors.push(String(event.message ?? 'unknown error'));
      });
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
        window.__codexUiErrors.push(reason);
      });
      window.__codexUiHooked = true;
    }
    return true;
  })()`);
};

const clickSlot = async (slotKey) => {
  await evalExpr(`(() => {
    const target = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]');
    if (!target) {
      throw new Error('Slot not found: ' + ${JSON.stringify(slotKey)});
    }
    setTimeout(() => target.click(), 0);
    return true;
  })()`);
};

const createAgentForSlot = async (slotKey) => {
  await evalExpr(`(async () => {
    const snapshot = await window.codexOffice.office.getSnapshot();
    const floor = snapshot.floors[0] ?? null;
    if (!floor) {
      throw new Error('Office floor not found.');
    }
    let workstation = snapshot.workstations.find((item) => item.slot_key === ${JSON.stringify(slotKey)}) ?? null;
    if (!workstation) {
      workstation = await window.codexOffice.office.createWorkstation({
        id: ${JSON.stringify(`workstation-${Date.now()}`)},
        floorId: floor.id,
        slotKey: ${JSON.stringify(slotKey)}
      });
    }
    await window.codexOffice.agents.create({
      id: ${JSON.stringify(agentId)},
      name: ${JSON.stringify(agentName)},
      role: 'Codex Agent',
      workingDirectory: ${JSON.stringify(workspacePath)},
      runtimeKind: 'codex_cli',
      permissionMode: 'workspace_write',
      autoRunMode: 'manual',
      currentTask: 'Reply with one short sentence.',
      workstationId: workstation.id,
      metadata: {
        createdFromUiVerification: true,
        createdFromUi: true
      }
    });
    window.location.reload();
    return true;
  })()`);
};

const clearAgents = async () => {
  await evalExpr(`(async () => {
    const agents = await window.codexOffice.agents.list();
    await Promise.all(agents.map((agent) => window.codexOffice.agents.delete(agent.id)));
    window.location.reload();
    return true;
  })()`);
};

const setComposerText = async (value) => {
  await evalExpr(`(() => {
    const field = document.querySelector('.conversation-composer-card textarea');
    if (!field) {
      throw new Error('Conversation composer textarea not found.');
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
};

const clickRun = async () => {
  await evalExpr(`(() => {
    const button = document.querySelector('.conversation-send-button');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Run button not found.');
    }
    if (button.disabled) {
      throw new Error('Run button is disabled.');
    }
    button.click();
    return true;
  })()`);
};

await delay(1200);
await installPageHooks();
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);

const appInfo = await evalExpr(`window.codexOffice.app.getInfo()`);
if (appInfo.localCodex.status !== "ready") {
  throw new Error(`Local Codex is not ready: ${appInfo.localCodex.status}`);
}

await clearAgents();
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
await waitFor(`(async () => typeof window.codexOffice !== "undefined" && (await window.codexOffice.agents.list()).length === 0)()`, 20000);
await installPageHooks();

const targetSlotKey = await waitFor(
  `(() => document.querySelector('.office-slot[data-seat-state="available"]')?.getAttribute('data-slot-key') || false)()`,
  15000
);

await createAgentForSlot(targetSlotKey);
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return agents.find((agent) => agent.id === ${JSON.stringify(agentId)}) ?? false;
})()`, 20000);

await clickSlot(targetSlotKey);
await waitFor(`Boolean(document.querySelector('.conversation-workspace-shell'))`, 20000);
await waitFor(`Boolean(document.querySelector('.conversation-composer-card textarea'))`, 20000);

await setComposerText(prompt);
await delay(500);
await clickRun();

const immediate = await waitFor(`(async () => {
  const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
  const latestRun = thread.runs.at(-1) ?? null;
  return latestRun
    ? {
        latestRunId: latestRun.id,
        latestRunStatus: latestRun.status,
        runCount: thread.runs.length
      }
    : false;
})()`, 30000);

await delay(1000);

const afterOneSecond = await evalExpr(`(async () => {
  const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
  const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(agentId)});
  const latestRun = thread.runs.at(-1) ?? null;
  const latestSession = sessions.at(-1) ?? null;
  return {
    latestRunStatus: latestRun?.status ?? null,
    latestRunSummary: latestRun?.summary?.totalTokens ?? null,
    latestSessionStatus: latestSession?.status ?? null,
    latestSessionEndedAt: latestSession?.ended_at ?? null,
    latestSessionError: latestSession?.error_message ?? null,
    hasThinkingText: document.body.innerText.includes('Thinking'),
    hasRunEndedEarlyText: document.body.innerText.includes('Run ended early.'),
    visibleText: document.querySelector('.conversation-thread-surface')?.innerText ?? document.body.innerText
  };
})()`);

const afterOneSecondScreenshot = await screenshot("live-thinking-after-1s.png");

const completed = await waitFor(`(async () => {
  const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
  const latestRun = thread.runs.at(-1) ?? null;
  return latestRun?.status === 'completed'
    ? {
        latestRunStatus: latestRun.status,
        totalTokens: latestRun.summary.totalTokens,
        reasoningTokens: latestRun.summary.reasoningTokens
      }
    : false;
})()`, 120000);

const completedScreenshot = await screenshot("conversation-focus-current-ui.png");
const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);

const report = {
  appInfo,
  targetSlotKey,
  prompt,
  immediate,
  afterOneSecond,
  completed,
  uiErrors,
  screenshots: {
    afterOneSecond: afterOneSecondScreenshot,
    completed: completedScreenshot
  }
};

await writeFile(
  path.join(outDir, "live-thinking-status-report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);

console.log(JSON.stringify(report, null, 2));
