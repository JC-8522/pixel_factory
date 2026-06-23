import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const agentId = `conversation-workspace-${Date.now()}`;
const agentName = `Conversation Workspace ${Date.now()}`;
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const runtimeKind = process.env.PIXEL_FACTORY_VERIFY_RUNTIME?.trim() || "mock";
const prompts = [
  "Reply with the exact phrase: workspace run one complete.",
  "Reply with the exact phrase: workspace run two complete."
];

const confirmationButtonLabels = ["Set Up Workspace", "Create Agent"];
const agentNameLabels = ["Agent name", "AI employee name"];
const initialBriefLabels = ["Initial brief", "Initial task"];

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

const clickControlByText = async (text, selector = "button") => {
  await evalExpr(`(() => {
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim();
    const target = [...document.querySelectorAll(${JSON.stringify(selector)})].find((item) => normalize(item.textContent ?? '') === ${JSON.stringify(text)});
    if (!target) {
      throw new Error('Control not found: ' + ${JSON.stringify(text)});
    }
    setTimeout(() => target.click(), 0);
    return true;
  })()`);
};

const clickButtonByText = async (text) => clickControlByText(text, "button");
const clickSummaryByText = async (text) => clickControlByText(text, "summary");

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
    const normalize = (input) => input.replace(/\\s+/g, ' ').trim().toLowerCase();
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
    const label = [...document.querySelectorAll('label')].find((item) =>
      normalize(item.textContent ?? '').includes(normalize(${JSON.stringify(labelText)}))
    );
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
    setTimeout(() => target.click(), 0);
    return true;
  })()`);
};

const createAgentForSlot = async (slotKey) => {
  await evalExpr(`(async () => {
    const snapshot = await window.codexOffice.office.getSnapshot();
    const workstation = snapshot.workstations.find((item) => item.slot_key === ${JSON.stringify(slotKey)});
    if (!workstation) {
      throw new Error('Workstation not found for slot: ' + ${JSON.stringify(slotKey)});
    }
    await window.codexOffice.agents.create({
      id: ${JSON.stringify(agentId)},
      name: ${JSON.stringify(agentName)},
      role: 'Codex Agent',
      workingDirectory: ${JSON.stringify(workspacePath)},
      runtimeKind: ${JSON.stringify(runtimeKind)},
      permissionMode: 'workspace_write',
      autoRunMode: 'manual',
      currentTask: 'Introduce yourself in one short sentence.',
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

const getThread = (agentId) => evalExpr(`window.codexOffice.conversations.getThread(${JSON.stringify(agentId)})`);

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

const shellCheck = await evalExpr(`(() => ({
  singleOfficeLayout: Boolean(document.querySelector('.single-office-shell')),
  officeVisible: Boolean(document.querySelector('.office-stage-frame')),
  workspacePanelHiddenUntilSelect: !document.querySelector('.conversation-workspace-shell')
}))()`);

const targetSlotKey = await waitFor(
  `(() => document.querySelector('.office-slot[data-seat-state="available"]')?.getAttribute('data-slot-key') || false)()`,
  15000
);

await clickSlot(targetSlotKey);
await waitFor(`Boolean(document.querySelector('[aria-label="Create agent confirmation"]'))`, 15000);
await clickButtonByAnyText(confirmationButtonLabels);
await waitFor(`Boolean(document.querySelector('[aria-label="Create agent"]'))`, 20000);
const createDialogScreenshot = await screenshot("conversation-workspace-create-dialog.png");
await createAgentForSlot(targetSlotKey);
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
const createdAgent = await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return agents.find((agent) => agent.name === ${JSON.stringify(agentName)}) ?? false;
})()`, 20000);

await clickSlot(targetSlotKey);

await waitFor(`Boolean(document.querySelector('.conversation-workspace-shell'))`, 20000);
await waitFor(`Boolean(document.querySelector('.conversation-composer-card textarea'))`, 20000);
await waitFor(`Boolean(document.querySelector('.conversation-context-bar'))`, 15000);

const initialWorkspaceCheck = await evalExpr(`(() => ({
  oldTitleMissing: !document.body.innerText.includes('AI EMPLOYEE CONVERSATION'),
  composerPresent: Boolean(document.querySelector('.conversation-composer-card textarea')),
  contextPills: document.querySelectorAll('.conversation-context-bar-signals span, .conversation-context-bar-facts span').length,
  emptyStateVisible: Boolean(document.querySelector('.conversation-empty-stage')),
  emptyHeaderQuestion: document.querySelector('.conversation-empty-stage h3')?.textContent?.trim() ?? '',
  officeHiddenInFocus: !document.querySelector('.office-stage-frame')
}))()`);
const emptyWorkspaceScreenshot = await screenshot("conversation-workspace-empty-state.png");

const draftValue = "Draft persistence works across reopen.";
await setComposerText(draftValue);
await delay(700);
const backToOfficeAvailable = await evalExpr(`(() => {
  const normalize = (value) => value.replace(/\\s+/g, ' ').trim().toLowerCase();
  return [...document.querySelectorAll('button')].some((item) => normalize(item.textContent ?? '') === 'back to office');
})()`);
let restoredDraft = null;
if (backToOfficeAvailable) {
  await clickButtonByText("Back to office");
  await waitFor(`!document.querySelector('.conversation-workspace-shell')`, 15000);
  await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 15000);
  await clickSlot(targetSlotKey);
  await waitFor(`Boolean(document.querySelector('.conversation-workspace-shell'))`, 15000);
  restoredDraft = await waitFor(
    `(() => document.querySelector('.conversation-composer-card textarea')?.value === ${JSON.stringify(draftValue)} ? document.querySelector('.conversation-composer-card textarea')?.value : false)()`,
    10000
  );
}

for (const prompt of prompts) {
  await setComposerText(prompt);
  await clickButtonByText("Run");
  await waitFor(`(async () => {
    const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(createdAgent.id)});
    return thread.runs.length >= ${JSON.stringify(prompts.indexOf(prompt) + 1)} && thread.totalEntries >= ${JSON.stringify((prompts.indexOf(prompt) + 1) * 2)}
      ? thread
      : false;
  })()`, 120000);
}

const thread = await getThread(createdAgent.id);
const workspaceCheck = await evalExpr(`(() => ({
  threadMapCards: document.querySelectorAll('.conversation-thread-map-card').length,
  runThreads: document.querySelectorAll('.conversation-run-thread').length,
  runActionButtons: [...document.querySelectorAll('.conversation-run-actions button')].map((item) => item.textContent?.trim()),
  composerHint: document.querySelector('.conversation-composer-hint')?.innerText ?? '',
  contextLabels: [...document.querySelectorAll('.conversation-context-chip-label')].map((item) => item.textContent?.trim()),
  officeHiddenInFocus: !document.querySelector('.office-stage-frame'),
  detailButtons: [...document.querySelectorAll('button')].map((item) => item.textContent?.trim()).filter((text) => text === 'Details' || text === 'Hide details'),
  processButtons: [...document.querySelectorAll('button')].map((item) => item.textContent?.trim()).filter((text) => text === 'Process' || text === 'Hide process'),
  tokenLines: [...document.querySelectorAll('.conversation-run-minimal-facts span')].map((item) => item.textContent?.trim()).filter(Boolean),
  thinkingLines: [...document.querySelectorAll('.conversation-run-minimal-copy p')].map((item) => item.textContent?.trim()).filter(Boolean),
  bodyPreview: document.body.innerText.slice(0, 1800),
  hasSummaryHeading: document.body.innerText.includes('Summary'),
  hasActivityHeading: document.body.innerText.includes('Activity'),
  hasWorkspaceActionsLabel: document.body.innerText.includes('Workspace actions'),
  hasReviewedLabel: document.body.innerText.includes('Reviewed'),
  hasChangedLabel: document.body.innerText.includes('Changed')
}))()`);
const conversationWorkspaceScreenshot = await screenshot("conversation-workspace-thread.png");

const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);
const report = {
  appInfo,
  shellCheck,
  targetSlotKey,
  agentName,
  runtimeKind,
  createdAgentId: createdAgent.id,
  initialWorkspaceCheck,
  restoredDraft,
  thread,
  workspaceCheck,
  uiErrors,
  screenshots: {
    createDialog: createDialogScreenshot,
    emptyWorkspace: emptyWorkspaceScreenshot,
    thread: conversationWorkspaceScreenshot
  }
};

const reportPath = path.join(outDir, "conversation-workspace-verification.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({ ...report, reportPath }, null, 2));

ws.close();
setTimeout(() => process.exit(0), 50);
