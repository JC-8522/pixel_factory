import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9666";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const agentNames = [`Dual Pixel A ${Date.now()}`, `Dual Pixel B ${Date.now() + 1}`];
const prompts = [
  "Say: round one complete.",
  "Say: round two complete."
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
    const prototype =
      field.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : field.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    field.focus();
    descriptor?.set?.call(field, ${JSON.stringify(value)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
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

const getOfficeSnapshot = () => evalExpr(`window.codexOffice.office.getSnapshot()`);

const buildWorkstationOnSlot = async (slotKey) => {
  await clickSlot(slotKey);
  await clickButtonByText("Create Workstation").catch(() => clickButtonByText("Add Workstation"));
  await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]')?.getAttribute('data-workstation-state') === 'empty'`, 20000);
};

const ensureEmptyWorkstations = async (count) => {
  let snapshot = await getOfficeSnapshot();
  const empty = () => snapshot.workstations.filter((workstation) => !workstation.assigned_agent_id);

  while (empty().length < count) {
    const unbuiltSlotKey = await waitFor(`(() => document.querySelector('.office-slot[data-workstation-state="unbuilt"]')?.getAttribute('data-slot-key') || false)()`, 15000);
    await buildWorkstationOnSlot(unbuiltSlotKey);
    snapshot = await getOfficeSnapshot();
  }

  return empty().slice(0, count);
};

const createAgentOnWorkstation = async (workstation, agentName) => {
  await clickSlot(workstation.slot_key);
  await clickButtonByText("Create Agent").catch(() => clickButtonByText("Create Agent On Workstation"));
  await waitFor(`Boolean(document.querySelector('[aria-label="Create agent"]'))`);
  await setFieldByLabel("Agent name", agentName);
  await setFieldByLabel("Role", "Codex Agent");
  await setFieldByLabel("Working directory", workspacePath);
  await setFieldByLabel("Permission mode", "readonly", "select");
  await setFieldByLabel("Initial task", "Introduce yourself in one short sentence.", "textarea");
  await clickButtonByText("Create agent");
  await waitFor(`!document.querySelector('[aria-label="Create agent"]')`);
  await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(workstation.slot_key)}]')?.getAttribute('data-workstation-state') === 'occupied'`, 20000);
  return waitFor(`(async () => {
    const agents = await window.codexOffice.agents.list();
    return agents.find((agent) => agent.name === ${JSON.stringify(agentName)}) ?? false;
  })()`);
};

const selectAgent = async (agent) => {
  await evalExpr(`(() => {
    const target = document.querySelector('.office-roster [data-agent-id=${JSON.stringify(agent.id)}]');
    if (!target) {
      throw new Error('Roster button not found for agent: ' + ${JSON.stringify(agent.id)});
    }
    target.click();
    return true;
  })()`);
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

await installPageHooks();

await waitFor(`document.body.innerText.includes("Pixel Office")`);
await evalExpr(`(async () => {
  const agents = await window.codexOffice.agents.list();
  await Promise.all(agents.map((agent) => window.codexOffice.agents.delete(agent.id)));
  window.location.reload();
  return true;
})()`);
await waitFor(`document.body.innerText.includes("Pixel Office")`, 20000);
await waitFor(`(async () => typeof window.codexOffice !== "undefined" && (await window.codexOffice.agents.list()).length === 0)()`, 20000);
await installPageHooks();

const beforeSnapshot = await getOfficeSnapshot();
const readyWorkstations = await ensureEmptyWorkstations(2);
const created = [];
for (const [index, workstation] of readyWorkstations.entries()) {
  created.push(await createAgentOnWorkstation(workstation, agentNames[index]));
}

const afterCreateSnapshot = await getOfficeSnapshot();
const screenshots = {
  afterCreate: await screenshot("dual-agents-created.png")
};

const conversationResults = [];
for (const agent of [...created].reverse()) {
  await selectAgent(agent);
  await waitFor(`document.querySelector('.detail-panel')?.getAttribute('data-agent-id') === ${JSON.stringify(agent.id)}`);

  for (const prompt of prompts) {
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
  await waitFor(`document.querySelector('.detail-panel')?.getAttribute('data-agent-id') === ${JSON.stringify(agent.id)}`);
  const workstationBeforeDelete = await waitFor(`(async () => {
    const snapshot = await window.codexOffice.office.getSnapshot();
    return snapshot.workstations.find((item) => item.assigned_agent_id === ${JSON.stringify(agent.id)}) ?? false;
  })()`, 15000);
  await clickButtonByText("Delete Agent");
  await waitFor(`(async () => {
    const agents = await window.codexOffice.agents.list();
    return !agents.some((item) => item.id === ${JSON.stringify(agent.id)});
  })()`, 15000);
  await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(workstationBeforeDelete.slot_key)}]')?.getAttribute('data-workstation-state') === 'empty'`, 15000);
}

const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);
const remainingAgentCount = await evalExpr(`window.codexOffice.agents.list().then((agents) => agents.length)`);
const finalSnapshot = await getOfficeSnapshot();
const reportPath = path.join(outDir, "dual-agents-verification.json");
const report = {
  beforeWorkstationCount: beforeSnapshot.workstations.length,
  afterWorkstationCount: afterCreateSnapshot.workstations.length,
  created,
  conversationResults,
  perAgentTranscriptCount,
  remainingAgentCount,
  finalSnapshot,
  uiErrors,
  screenshots
};

await writeFile(reportPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({ ...report, reportPath }, null, 2));

ws.close();
