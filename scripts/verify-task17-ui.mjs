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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? JSON.stringify(result.exceptionDetails));
  }
  return result.result.value;
};

const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  const filePath = path.join(outDir, name);
  await writeFile(filePath, Buffer.from(result.data, "base64"));
  return filePath;
};

const waitForExpr = async (expression, timeoutMs = 8000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const passed = await evalExpr(expression);
    if (passed) return true;
    await delay(200);
  }
  throw new Error(`Timed out waiting for condition: ${expression}`);
};

const waitForAgentMessage = async (agentId, snippet, timeoutMs = 10000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const matched = await evalExpr(`(async () => {
      const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(agentId)});
      const latest = sessions.at(-1);
      if (!latest) return false;
      const messages = await window.codexOffice.messages.listBySession(latest.id);
      return messages.some((message) => message.content.includes(${JSON.stringify(snippet)}));
    })()`);
    if (matched) return true;
    await delay(250);
  }
  throw new Error(`Timed out waiting for agent message: ${snippet}`);
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

const clickButtonByText = async (text) => {
  await evalExpr(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => item.textContent.trim() === ${JSON.stringify(text)});
    if (!button) throw new Error('Button not found: ' + ${JSON.stringify(text)});
    button.click();
    return true;
  })()`);
};

const setInputValue = async (selector, value) => {
  await evalExpr(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    if (!input) throw new Error('Input not found: ' + ${JSON.stringify(selector)});
    const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value')?.set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
};

const setLabeledFieldValue = async (labelText, value, tagName = "input") => {
  await evalExpr(`(() => {
    const label = [...document.querySelectorAll('label')].find((item) =>
      item.textContent?.toLowerCase().includes(${JSON.stringify(labelText.toLowerCase())})
    );
    if (!label) throw new Error('Label not found: ' + ${JSON.stringify(labelText)});
    const field = label.querySelector(${JSON.stringify(tagName)});
    if (!field) throw new Error('Field not found for label: ' + ${JSON.stringify(labelText)});
    const setter = Object.getOwnPropertyDescriptor(field.constructor.prototype, 'value')?.set;
    setter.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
};

await send("Page.enable");
await send("Runtime.enable");
await delay(1200);

await evalExpr(`(async () => {
  const rules = await window.codexOffice.permissions.listRules();
  for (const rule of rules) {
    await window.codexOffice.permissions.revokeRule(rule.id);
  }
  return true;
})()`);

const agentName = `Task 17 Safety Agent ${Date.now()}`;

await clickButtonByText("Office");
await delay(500);
await openCreateDialog();
await setLabeledFieldValue("Agent name", agentName);
await setLabeledFieldValue("Initial task", "Ready to verify command safety flows.", "textarea");
await clickButtonByText("Create agent");
await waitForExpr(`document.body.innerText.includes(${JSON.stringify(agentName)})`, 20000);
const agentSeed = await evalExpr(`(async () => {
  const agents = await window.codexOffice.agents.list();
  return agents.at(-1) ? { created: true, agentId: agents.at(-1).id, agentName: agents.at(-1).name } : null;
})()`);

await setInputValue(".chat-form input", "cmd: pwd");
await clickButtonByText("Send");
await waitForAgentMessage(agentSeed.agentId, "Mock agent received: cmd: pwd");
const safePassed = await evalExpr(`!document.body.innerText.includes('Review Risky Command')`);

await setInputValue(".chat-form input", "cmd: npm install sample-package");
await clickButtonByText("Send");
await waitForExpr(`document.body.innerText.includes('Review Risky Command')`);
const dialogShot = await screenshot("task17-permission-dialog.png");
await clickButtonByText("Allow Once");
await waitForAgentMessage(agentSeed.agentId, "Mock agent received: cmd: npm install sample-package");

await setInputValue(".chat-form input", "cmd: curl https://example.com --token secret123");
await clickButtonByText("Send");
await waitForExpr(`document.body.innerText.includes('Review Risky Command')`);
await clickButtonByText("Always Allow In Project");
await waitForAgentMessage(agentSeed.agentId, "Mock agent received: cmd: curl https://example.com --token secret123");

await setInputValue(".chat-form input", "cmd: rm -rf tmp");
await clickButtonByText("Send");
await waitForExpr(`document.body.innerText.includes('Review Risky Command')`);
await clickButtonByText("Deny");
await waitForExpr(`document.body.innerText.includes('Command was denied before execution.')`, 10000);

await clickButtonByText("Permissions");
await delay(900);
const permissionsState = await evalExpr(`(() => {
  const text = document.body.innerText;
  return {
    hasRules: text.includes('Scoped Allow Rules'),
    hasDeniedEvent: text.includes('permission_denied'),
    hasProjectRule: text.includes('allow_project') || text.includes('network,credential'),
    hasRedaction: text.includes('[REDACTED]')
  };
})()`);
const deniedShot = await screenshot("task17-permission-denied-event.png");
const settingsShot = await screenshot("task17-permission-rules.png");

const eventSummary = await evalExpr(`(async () => {
  const events = await window.codexOffice.events.list();
  return events
    .filter((event) => event.type.startsWith('permission_'))
    .slice(-8)
    .map((event) => ({ type: event.type, severity: event.severity, payload: event.payload_json }));
})()`);
const rules = await evalExpr(`window.codexOffice.permissions.listRules()`);

console.log(
  JSON.stringify(
    {
      agentSeed,
      safePassed,
      permissionsState,
      eventSummary,
      rules,
      screenshots: { dialogShot, deniedShot, settingsShot },
      agentSeed
    },
    null,
    2
  )
);

ws.close();
