import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const agentName = `Office UI ${Date.now()}`;
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const prompts = [
  "Reply with the exact phrase: office loop one complete.",
  "Reply with the exact phrase: office loop two complete."
];
const confirmationButtonLabels = ["Open AI Employee", "Create Agent"];
const submitButtonLabels = ["Create AI Employee", "Create agent"];
const deleteButtonLabels = ["Remove AI Employee", "Delete Agent"];
const agentNameLabels = ["AI employee name", "Agent name"];
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
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) {
    return;
  }

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
      // Renderer reloads briefly invalidate the execution context.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for predicate: ${predicateExpression}`);
};

const screenshot = async (name) => {
  await send("Page.bringToFront");
  await delay(200);
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
    target.click();
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
    const field = document.querySelector('.chat-form textarea, .chat-form input');
    if (!field) {
      throw new Error('Chat input not found.');
    }
    const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(message)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await clickButtonByText("Send");
};

const waitForAgentTranscript = async (agentId) =>
  waitFor(`(async () => {
    const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(agentId)});
    const messagesBySession = await Promise.all(sessions.map((session) => window.codexOffice.messages.listBySession(session.id)));
    const allMessages = messagesBySession.flat();
    const userMessages = allMessages.filter((message) => message.role === 'user');
    const agentMessages = allMessages.filter((message) => message.role === 'agent' && String(message.content ?? '').trim().length > 0);
    return userMessages.length >= 2 && agentMessages.length >= 2
      ? {
          sessionCount: sessions.length,
          totalMessages: allMessages.length,
          messages: allMessages.map((message) => ({ role: message.role, content: message.content }))
        }
      : false;
  })()`, 120000);

const waitForCompletedRounds = async (agentId, rounds) =>
  waitFor(`(async () => {
    const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(agentId)});
    const messagesBySession = await Promise.all(sessions.map((session) => window.codexOffice.messages.listBySession(session.id)));
    const allMessages = messagesBySession.flat();
    const userMessages = allMessages.filter((message) => message.role === 'user').length;
    const agentMessages = allMessages.filter((message) => message.role === 'agent' && String(message.content ?? '').trim().length > 0).length;
    return sessions.length >= ${JSON.stringify(rounds)} &&
      userMessages >= ${JSON.stringify(rounds)} &&
      agentMessages >= ${JSON.stringify(rounds)};
  })()`, 120000);

await send("Page.enable");
await send("Runtime.enable");
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
  officeMenu: Boolean(document.querySelector('.office-menu-button')),
  sidebarRemoved: !document.querySelector('.sidebar'),
  rosterRemoved: !document.querySelector('.office-roster'),
  defaultAgentPanelHidden: !document.querySelector('.office-agent-panel'),
  oldWorkspaceTitleMissing: !document.body.innerText.includes('Human manager workspace'),
  oldOfficeTitleMissing: !document.body.innerText.includes('Pixel Office')
}))()`);

const initialSnapshot = await getOfficeSnapshot();
const screenshots = {
  officeView: await screenshot("current-app-single-office-view.png")
};

const targetSlotKey = await waitFor(`(() => document.querySelector('.office-slot[data-seat-state="available"]')?.getAttribute('data-slot-key') || false)()`, 15000);

await hoverSlot(targetSlotKey);
await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}] .office-slot-helper')?.textContent?.includes('Click to create')`, 15000);
screenshots.hover = await screenshot("current-app-empty-workstation-hover.png");

await clickSlot(targetSlotKey);
await waitFor(`Boolean(document.querySelector('[aria-label="Create agent confirmation"]'))`, 15000);
screenshots.confirm = await screenshot("current-app-create-agent-confirm.png");

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

await waitFor(`!document.querySelector('[aria-label="Create agent"]')`, 20000);
const createdAgent = await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return agents.find((agent) => agent.name === ${JSON.stringify(agentName)}) ?? false;
})()`, 20000);

await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]')?.getAttribute('data-seat-state') === 'occupied'`, 20000);
await waitFor(`document.querySelector('.office-agent-panel')?.getAttribute('data-agent-id') === ${JSON.stringify(createdAgent.id)}`, 15000);
const workstationLabel = await waitFor(
  `(() => {
    const label = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}] .office-slot-label');
    return label?.textContent?.trim() || false;
  })()`,
  15000
);
screenshots.seated = await screenshot("current-app-agent-seated.png");

await clickButtonByText("x");
await waitFor(`!document.querySelector('.office-agent-panel')`, 15000);
await clickSlot(targetSlotKey);
await waitFor(`document.querySelector('.office-agent-panel')?.getAttribute('data-agent-id') === ${JSON.stringify(createdAgent.id)}`, 15000);
const conversationPanelMetrics = await getBoundingBox('.office-agent-panel');
const conversationChromeCheck = await evalExpr(`(() => {
  const panel = document.querySelector('.office-agent-panel');
  const text = (panel?.innerText ?? '').toUpperCase();
  return {
    roleRemoved: !text.includes('ROLE'),
    seatRemoved: !text.includes('SEAT'),
    runtimeRemoved: !text.includes('RUNTIME'),
    latestConversationRemoved: !text.includes('LATEST CONVERSATION CONTEXT'),
    recentActivityRemoved: !text.includes('RECENT ACTIVITY')
  };
})()`);
screenshots.chat = await screenshot("current-app-chat-open.png");

for (const [index, prompt] of prompts.entries()) {
  await sendMessage(prompt);
  await waitForCompletedRounds(createdAgent.id, index + 1);
}

const conversation = await waitForAgentTranscript(createdAgent.id);
const latestSeatPreview = await waitFor(
  `(() => {
    const preview = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}] .office-slot-preview');
    return preview?.textContent?.trim() || false;
  })()`,
  15000
);
screenshots.chatHistory = await screenshot("current-app-chat-history.png");

await clickButtonByAnyText(deleteButtonLabels);
await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return !agents.some((agent) => agent.id === ${JSON.stringify(createdAgent.id)});
})()`, 15000);
await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]')?.getAttribute('data-seat-state') === 'available'`, 15000);
screenshots.deleted = await screenshot("current-app-agent-deleted.png");

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
  conversationPanelMetrics,
  conversationChromeCheck,
  workstationLabel,
  latestSeatPreview,
  conversation,
  finalSnapshot,
  uiErrors,
  screenshots
};

await writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({ ...report, reportPath }, null, 2));

ws.close();
