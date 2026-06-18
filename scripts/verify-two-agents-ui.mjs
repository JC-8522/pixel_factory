import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/out";
const debugPort = process.env.DEBUG_PORT ?? "9666";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const agentNames = [`Dual Pixel A ${Date.now()}`, `Dual Pixel B ${Date.now() + 1}`];

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
  await delay(150);
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
    const label = [...document.querySelectorAll('label')].find((item) => normalize(item.textContent ?? '').includes(normalize(${JSON.stringify(labelText)})));
    if (!label) {
      throw new Error('Label not found: ' + ${JSON.stringify(labelText)});
    }
    const field = label.querySelector(${JSON.stringify(tagName)});
    if (!field) {
      throw new Error('Field not found for label: ' + ${JSON.stringify(labelText)});
    }
    const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : field.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
};

const createAgentThroughUi = async (agentName) => {
  await clickButtonByText("Create Agent");
  await waitFor(`Boolean(document.querySelector('[aria-label="Create agent"]'))`);
  await setFieldByLabel("Agent name", agentName);
  await setFieldByLabel("Role", "Codex Agent");
  await setFieldByLabel("Working directory", workspacePath);
  await setFieldByLabel("Permission mode", "readonly", "select");
  await setFieldByLabel("Initial task", "Introduce yourself in one short sentence.", "textarea");
  await clickButtonByText("Create agent");
  await waitFor(`!document.querySelector('[aria-label="Create agent"]')`);
  return waitFor(`(async () => {
    const agents = await window.codexOffice.agents.list();
    return agents.find((agent) => agent.name === ${JSON.stringify(agentName)}) ?? false;
  })()`);
};

const selectAgent = async (agent) => {
  const point = await evalExpr(`(() => {
    const canvas = document.querySelector('.office-canvas-element');
    if (!canvas) {
      throw new Error('Office canvas not found.');
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / 780;
    const scaleY = rect.height / 500;
    return {
      x: rect.left + window.scrollX + (${agent.position_x} * scaleX),
      y: rect.top + window.scrollY + (${agent.position_y} * scaleY)
    };
  })()`);

  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1
  });
};

const sendMessage = async (message) => {
  await evalExpr(`(() => {
    const field = document.querySelector('.chat-form input');
    if (!field) {
      throw new Error('Chat input not found.');
    }
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(message)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await clickButtonByText("Send");
};

const waitForCompletedSession = async (agentId) =>
  waitFor(`(async () => {
    const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(agentId)});
    const latest = sessions.at(-1);
    if (!latest || latest.status !== 'completed') {
      return false;
    }
    const messages = await window.codexOffice.messages.listBySession(latest.id);
    return {
      sessionId: latest.id,
      status: latest.status,
      messages: messages.map((message) => ({ role: message.role, content: message.content }))
    };
  })()`, 120000);

await send("Page.enable");
await send("Runtime.enable");
await delay(1000);

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
  return true;
})()`);

await waitFor(`document.body.innerText.includes("Pixel Office")`);
const beforeAgents = await evalExpr(`window.codexOffice.agents.list()`);

const created = [];
for (const name of agentNames) {
  created.push(await createAgentThroughUi(name));
}

const afterCreate = await evalExpr(`window.codexOffice.agents.list()`);
const screenshots = {
  afterCreate: await screenshot("dual-agents-created.png")
};

const conversationResults = [];
for (const agent of created) {
  await selectAgent(agent);
  await waitFor(`document.querySelector('.detail-panel h3')?.textContent === ${JSON.stringify(agent.name)}`);

  for (const prompt of [
    "Say: round one complete.",
    "Say: round two complete."
  ]) {
    await sendMessage(prompt);
    conversationResults.push(await waitForCompletedSession(agent.id));
  }
}

const perAgentTranscriptCount = await evalExpr(`(async () => {
  const targetIds = ${JSON.stringify(created.map((agent) => agent.id))};
  return Promise.all(targetIds.map(async (agentId) => {
    const sessions = await window.codexOffice.sessions.listByAgent(agentId);
    const messagesBySession = await Promise.all(sessions.map((session) => window.codexOffice.messages.listBySession(session.id)));
    return {
      agentId,
      sessionCount: sessions.length,
      totalMessages: messagesBySession.flat().length
    };
  }));
})()`);

for (const agent of [...created].reverse()) {
  await selectAgent(agent);
  await waitFor(`document.querySelector('.detail-panel h3')?.textContent === ${JSON.stringify(agent.name)}`);
  await clickButtonByText("Delete Agent");
  await waitFor(`(async () => {
    const agents = await window.codexOffice.agents.list();
    return !agents.some((item) => item.id === ${JSON.stringify(agent.id)});
  })()`, 15000);
}

const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);

console.log(JSON.stringify({
  beforeAgentCount: beforeAgents.length,
  afterAgentCount: afterCreate.length,
  created,
  conversationResults,
  perAgentTranscriptCount,
  remainingAgentCount: (await evalExpr(`window.codexOffice.agents.list()`)).length,
  uiErrors,
  screenshots
}, null, 2));

ws.close();
