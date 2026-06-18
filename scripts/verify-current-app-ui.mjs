import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/out";
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const agentName = `UI Pixel ${Date.now()}`;
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const prompts = [
  "Reply with the exact phrase: UI handshake complete.",
  "Reply with the exact phrase: UI followup complete."
];

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
    const ready = await evalExpr(predicateExpression);
    if (ready) {
      return ready;
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

const setFieldByLabel = async (labelText, value, tagName = "input") => {
  await evalExpr(`(() => {
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim().toLowerCase();
    const setReactValue = (element, nextValue) => {
      const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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

const setSelectByLabel = async (labelText, value) => {
  await evalExpr(`(() => {
    const normalize = (value) => value.replace(/\\s+/g, ' ').trim().toLowerCase();
    const label = [...document.querySelectorAll('label')].find((item) => normalize(item.textContent ?? '').includes(normalize(${JSON.stringify(labelText)})));
    if (!label) {
      throw new Error('Label not found: ' + ${JSON.stringify(labelText)});
    }
    const field = label.querySelector('select');
    if (!field) {
      throw new Error('Select not found for label: ' + ${JSON.stringify(labelText)});
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    descriptor?.set?.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
};

await send("Page.enable");
await send("Runtime.enable");
await delay(1200);

await evalExpr(`(() => {
  window.confirm = () => true;
  window.__codexUiErrors = [];
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
  return true;
})()`);

await waitFor(`document.body.innerText.includes("Pixel Office")`);

const appInfo = await evalExpr(`window.codexOffice.app.getInfo()`);
if (appInfo.localCodex.status !== "ready") {
  throw new Error(`Local Codex is not ready: ${appInfo.localCodex.status}`);
}

await clickButtonByText("Office").catch(() => true);
await delay(400);
const screenshots = {};
screenshots.initial = await screenshot("current-app-initial.png");

const createDialogOpen = await evalExpr(`Boolean(document.querySelector('[aria-label="Create agent"]'))`);
if (!createDialogOpen) {
  await clickButtonByText("Create Agent");
}
await waitFor(`Boolean(document.querySelector('[aria-label="Create agent"]'))`);
await setFieldByLabel("Agent name", agentName);
await setFieldByLabel("Role", "Codex Agent");
await setFieldByLabel("Working directory", workspacePath);
await setSelectByLabel("Permission mode", "readonly");
await setFieldByLabel("Initial task", "Introduce yourself in one short sentence.", "textarea");
await screenshot("current-app-create-dialog.png");
await clickButtonByText("Create agent");

await waitFor(`!document.querySelector('[aria-label="Create agent"]')`);
await waitFor(`document.querySelector('.detail-panel h3')?.textContent === ${JSON.stringify(agentName)}`, 15000);
screenshots.created = await screenshot("current-app-agent-created.png");

const createdAgent = await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return agents.find((agent) => agent.name === ${JSON.stringify(agentName)}) ?? false;
})()`);

for (const prompt of prompts) {
  await evalExpr(`(() => {
    const field = document.querySelector('.chat-form input');
    if (!field) {
      throw new Error('Chat input not found.');
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(prompt)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await clickButtonByText("Send");
  await waitFor(`(async () => {
    const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(createdAgent.id)});
    const latest = sessions.at(-1);
    if (!latest || latest.status !== 'completed') {
      return false;
    }
    const messages = await window.codexOffice.messages.listBySession(latest.id);
    return messages.some((message) => message.role === 'agent' && message.content.trim().length > 0) ? true : false;
  })()`, 120000);
}

const conversation = await waitFor(`(async () => {
  const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(createdAgent.id)});
  const messagesBySession = await Promise.all(sessions.map((session) => window.codexOffice.messages.listBySession(session.id)));
  const allMessages = messagesBySession.flat();
  if (sessions.length < 2 || allMessages.length < 4) {
    return false;
  }
  return {
    sessionCount: sessions.length,
    totalMessages: allMessages.length,
    messages: allMessages.map((message) => ({ role: message.role, content: message.content }))
  };
})()`, 120000);

await waitFor(`document.querySelectorAll('.chat-message[data-role="agent"]').length > 0`, 15000);
screenshots.chat = await screenshot("current-app-chat-complete.png");

await clickButtonByText("Delete Agent");
await waitFor(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return !agents.some((agent) => agent.id === ${JSON.stringify(createdAgent.id)});
})()`, 15000);
screenshots.deleted = await screenshot("current-app-agent-deleted.png");

const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);

console.log(
  JSON.stringify(
    {
      appInfo,
      agentName,
      createdAgentId: createdAgent.id,
      conversation,
      uiErrors,
      screenshots
    },
    null,
    2
  )
);

ws.close();
