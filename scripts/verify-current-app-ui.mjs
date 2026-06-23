import { appendFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const automationLogPath = path.join(outDir, "current-app-verification.log");
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const agentName = `Office UI ${Date.now()}`;
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const prompts = [
  "Reply with the exact phrase: office loop one complete.",
  "Reply with the exact phrase: office loop two complete."
];
const confirmationButtonLabels = ["Set Up Workspace", "Create Agent"];
const submitButtonLabels = ["Create Agent", "Create agent"];
const deleteButtonLabels = ["Remove AI Employee", "Remove agent", "Delete Agent"];
const agentNameLabels = ["Agent name", "AI employee name"];
const initialBriefLabels = ["Initial brief", "Initial task"];

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
await writeFile(automationLogPath, "", "utf8");
const logStep = async (message) => {
  await appendFile(automationLogPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
};
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

  const { resolve, reject, timeoutId } = pending.get(key);
  clearTimeout(timeoutId);
  pending.delete(key);
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
    pending.set(`${callId}`, { resolve, reject, timeoutId });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });

const evalExpr = async (expression) => {
  const result = await send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise: true,
      returnByValue: true
    },
    15000
  );
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
      // Renderer reloads briefly invalidate the execution context.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for predicate: ${predicateExpression}`);
};

const screenshot = async (name) => {
  await send("Page.bringToFront", {}, 10000);
  await delay(200);
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, 15000);
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
      const originalConsoleError = console.error.bind(console);
      console.error = (...args) => {
        window.__codexUiErrors.push(args.map((item) => String(item)).join(' '));
        originalConsoleError(...args);
      };
      window.__codexUiHooked = true;
    }
    return true;
  })()`);
};

const clickButtonByText = async (text) => {
  await evalExpr(`(() => {
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim();
    const target = [...document.querySelectorAll('button')].find((item) => normalize(item.textContent ?? '') === ${JSON.stringify(text)});
    if (!target) {
      throw new Error('Button not found: ' + ${JSON.stringify(text)});
    }
    target.focus();
    setTimeout(() => target.click(), 0);
    return true;
  })()`);
};

const clickButtonByAnyText = async (texts) => {
  const attempts = [];
  for (const text of texts) {
    try {
      await clickButtonByText(text);
      return text;
    } catch (error) {
      attempts.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Buttons not found: ${texts.join(", ")} :: ${attempts.join(" | ")}`);
};

const setFieldByLabel = async (labelText, value, tagName = "input") => {
  await evalExpr(`(() => {
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim().toLowerCase();
    const setReactValue = (element, nextValue) => {
      const prototype =
        element.tagName === 'TEXTAREA'
          ? HTMLTextAreaElement.prototype
          : element.tagName === 'SELECT'
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      descriptor?.set?.call(element, nextValue);
    };
    const label = [...document.querySelectorAll('label')].find((item) => normalize(item.textContent ?? '').includes(normalize(${JSON.stringify(labelText)})));
    if (!label) {
      throw new Error('Label not found: ' + ${JSON.stringify(labelText)});
    }
    const field = label.querySelector(${JSON.stringify(tagName)});
    if (!field) {
      throw new Error('Field not found for label: ' + ${JSON.stringify(labelText)});
    }
    field.focus();
    setReactValue(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
};

const setFieldByAnyLabel = async (labels, value, tagName = "input") => {
  const attempts = [];
  for (const label of labels) {
    try {
      await setFieldByLabel(label, value, tagName);
      return label;
    } catch (error) {
      attempts.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Labels not found: ${labels.join(", ")} :: ${attempts.join(" | ")}`);
};

const clickSlot = async (slotKey) => {
  await evalExpr(`(() => {
    const target = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]');
    if (!target) {
      throw new Error('Slot not found: ' + ${JSON.stringify(slotKey)});
    }
    target.click();
    return true;
  })()`);
};

const hoverSlot = async (slotKey) => {
  await evalExpr(`(() => {
    const target = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]');
    if (!target) {
      throw new Error('Slot not found: ' + ${JSON.stringify(slotKey)});
    }
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    target.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
    return true;
  })()`);
};

const getOfficeSnapshot = () => evalExpr(`window.codexOffice.office.getSnapshot()`);
const getBoundingBox = (selector) =>
  evalExpr(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) {
      throw new Error('Element not found for selector: ' + ${JSON.stringify(selector)});
    }
    const rect = target.getBoundingClientRect();
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      top: Math.round(rect.top)
    };
  })()`);

const clearAgents = async () => {
  await evalExpr(`(async () => {
    const agents = await window.codexOffice.agents.list();
    await Promise.all(agents.map((agent) => window.codexOffice.agents.delete(agent.id)));
    window.location.reload();
    return true;
  })()`);
};

const sendMessage = async (message) => {
  await evalExpr(`(() => {
    const field = document.querySelector('.conversation-composer-card textarea');
    if (!field) {
      throw new Error('Conversation workspace textarea not found.');
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(message)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await evalExpr(`(() => {
    const button = document.querySelector('.conversation-send-button');
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Run button not found.');
    }
    button.click();
    return true;
  })()`);
};

const waitForThreadProjection = async (agentId, rounds) =>
  waitFor(`(async () => {
    const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
    const completedRuns = thread.runs.filter((run) => run.status === 'completed').length;
    return thread.runs.length >= ${JSON.stringify(rounds)} &&
      thread.totalEntries >= ${JSON.stringify(rounds * 2)} &&
      completedRuns >= ${JSON.stringify(rounds)}
      ? {
          threadId: thread.threadId,
          totalEntries: thread.totalEntries,
          runCount: thread.runs.length,
          completedRuns,
          runs: thread.runs.map((run) => ({
            id: run.id,
            status: run.status,
            commandCount: run.summary.commandCount,
            changedFiles: run.summary.changedFiles,
            approvalRequestCount: run.summary.approvalRequestCount,
            totalTokens: run.summary.totalTokens,
            processEvents: run.process.map((item) => item.eventType),
            entryKinds: run.entries.map((entry) => entry.kind)
          }))
        }
      : false;
  })()`, 120000);

const waitForCompletedRounds = async (agentId, rounds) =>
  waitFor(`(async () => {
    const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
    const completedRuns = thread.runs.filter((run) => run.status === 'completed').length;
    return thread.runs.length >= ${JSON.stringify(rounds)} &&
      thread.totalEntries >= ${JSON.stringify(rounds * 2)} &&
      completedRuns >= ${JSON.stringify(rounds)};
  })()`, 120000);

await logStep("script start");
await delay(1200);
await logStep("cdp socket settled");

await installPageHooks();
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
await logStep("office stage visible");

const appInfo = await evalExpr(`window.codexOffice.app.getInfo()`);
if (appInfo.localCodex.status !== "ready") {
  throw new Error(`Local Codex is not ready: ${appInfo.localCodex.status}`);
}
await logStep("local codex ready");

await clearAgents();
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
await waitFor(`(async () => typeof window.codexOffice !== "undefined" && (await window.codexOffice.agents.list()).length === 0)()`, 20000);
await installPageHooks();
await logStep("agents cleared");

const shellCheck = await evalExpr(`(() => ({
  officeMenu: Boolean(document.querySelector('.office-menu-button')),
  sidebarRemoved: !document.querySelector('.sidebar'),
  rosterRemoved: !document.querySelector('.office-roster'),
  workspaceHiddenUntilSelect: !document.querySelector('.conversation-workspace-shell'),
  oldWorkspaceTitleMissing: !document.body.innerText.includes('Human manager workspace'),
  oldOfficeTitleMissing: !document.body.innerText.includes('Pixel Office')
}))()`);

const initialSnapshot = await getOfficeSnapshot();
const screenshots = {
  officeView: await screenshot("current-app-single-office-view.png")
};

const targetSlotKey = await waitFor(`(() => document.querySelector('.office-slot[data-seat-state="available"]')?.getAttribute('data-slot-key') || false)()`, 15000);
await logStep(`target slot selected: ${targetSlotKey}`);

await hoverSlot(targetSlotKey);
await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}] .office-slot-helper')?.textContent?.includes('Click to create')`, 15000);
screenshots.hover = await screenshot("current-app-empty-workstation-hover.png");
await logStep("empty slot hover screenshot captured");

await clickSlot(targetSlotKey);
await waitFor(`Boolean(document.querySelector('[aria-label="Create agent confirmation"]'))`, 15000);
screenshots.confirm = await screenshot("current-app-create-agent-confirm.png");
await logStep("create confirmation opened");

await clickButtonByAnyText(confirmationButtonLabels);
await waitFor(`Boolean(document.querySelector('[aria-label="Create agent"]'))`, 20000);
const createDialogMetrics = await getBoundingBox('[aria-label="Create agent"]');
await setFieldByAnyLabel(agentNameLabels, agentName);
await setFieldByLabel("Role", "Codex Agent");
await setFieldByLabel("Working directory", workspacePath);
await setFieldByLabel("Permission mode", "readonly", "select");
await setFieldByAnyLabel(initialBriefLabels, "Introduce yourself in one short sentence.", "textarea");
screenshots.form = await screenshot("current-app-create-agent-form.png");
await clickButtonByAnyText(submitButtonLabels);
await logStep("create agent form submitted");

await waitFor(`!document.querySelector('[aria-label="Create agent"]')`, 20000);
const createdAgent = await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return agents.find((agent) => agent.name === ${JSON.stringify(agentName)}) ?? false;
})()`, 20000);
await logStep(`agent created: ${createdAgent.id}`);

await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]')?.getAttribute('data-seat-state') === 'occupied'`, 20000);
const workstationLabel = await waitFor(
  `(() => {
    const label = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}] .office-slot-label');
    return label?.textContent?.trim() || false;
  })()`,
  15000
);
await waitFor(`Boolean(document.querySelector('.conversation-workspace-shell'))`, 20000);
await waitFor(`Boolean(document.querySelector('.conversation-composer-card textarea'))`, 20000);
await waitFor(`Boolean(document.querySelector('.conversation-context-bar'))`, 20000);
await logStep("conversation workspace opened");
const workspaceMetrics = await getBoundingBox('.conversation-workspace-shell');
const workspaceChromeCheck = await evalExpr(`(() => {
  const shell = document.querySelector('.conversation-workspace-shell');
  const text = (shell?.innerText ?? '').toUpperCase();
  return {
    oldHeroRemoved: !text.includes('AI EMPLOYEE CONVERSATION'),
    composerPresent: Boolean(document.querySelector('.conversation-composer-card textarea')),
    contextBarPresent: Boolean(document.querySelector('.conversation-context-bar')),
    threadWorkspaceVisible: Boolean(document.querySelector('.conversation-workspace-shell')),
    officeHiddenInFocus: !document.querySelector('.office-stage-frame'),
    runStripPresent: Boolean(document.querySelector('.conversation-workspace-strip'))
  };
})()`);
screenshots.workspace = await screenshot("current-app-workspace-open.png");
await logStep("workspace screenshot captured");

for (const [index, prompt] of prompts.entries()) {
  await logStep(`starting run ${index + 1}`);
  await sendMessage(prompt);
  await waitForCompletedRounds(createdAgent.id, index + 1);
  await logStep(`completed run ${index + 1}`);
}

const threadProjection = await waitForThreadProjection(createdAgent.id, prompts.length);
await logStep("thread projection captured");
const workspaceRunCheck = await evalExpr(`(() => ({
  runCards: document.querySelectorAll('.conversation-run-thread').length,
  processPanels: document.querySelectorAll('.conversation-process-groups').length,
  visibleEntryCards: document.querySelectorAll('.conversation-message-card-linear').length,
  summaryFacts: document.querySelectorAll('.conversation-run-summary-fact').length,
  approvalCards: document.querySelectorAll('.conversation-approval-card').length
}))()`);
screenshots.threadHistory = await screenshot("current-app-thread-history.png");
await logStep("thread history screenshot captured");

await clickButtonByAnyText(deleteButtonLabels);
await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return !agents.some((agent) => agent.id === ${JSON.stringify(createdAgent.id)});
})()`, 15000);
await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]')?.getAttribute('data-seat-state') === 'available'`, 15000);
screenshots.deleted = await screenshot("current-app-agent-deleted.png");
await logStep("agent deleted and office restored");

const finalSnapshot = await getOfficeSnapshot();
const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);
const reportPath = path.join(outDir, "current-app-verification.json");
const report = {
  appInfo,
  shellCheck,
  initialSnapshot,
  targetSlotKey,
  agentName,
  createdAgentId: createdAgent.id,
  createDialogMetrics,
  workspaceMetrics,
  workspaceChromeCheck,
  workstationLabel,
  threadProjection,
  workspaceRunCheck,
  finalSnapshot,
  uiErrors,
  screenshots
};

await writeFile(reportPath, JSON.stringify(report, null, 2));
await logStep(`report written: ${reportPath}`);

console.log(JSON.stringify({ ...report, reportPath }, null, 2));

ws.close();
