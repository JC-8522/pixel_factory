import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/verification";
const debugPort = process.env.DEBUG_PORT ?? "9333";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const workspacePath = "C:/Users/Administrator/Desktop/repo/pixel_factory";
const agentNames = [`Dual Office A ${Date.now()}`, `Dual Office B ${Date.now() + 1}`];
const prompts = [
  "Say exactly: dual loop one complete.",
  "Say exactly: dual loop two complete."
];
const confirmationButtonLabels = ["Set Up Workspace", "Create Agent"];
const submitButtonLabels = ["Create Agent", "Create agent"];
const deleteButtonLabels = ["Remove agent", "Delete Agent"];
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

const clearAgents = async () => {
  await evalExpr(`(async () => {
    const agents = await window.codexOffice.agents.list();
    await Promise.all(agents.map((agent) => window.codexOffice.agents.delete(agent.id)));
    window.location.reload();
    return true;
  })()`);
};

const getOfficeSnapshot = () => evalExpr(`window.codexOffice.office.getSnapshot()`);

const createAgentOnSlot = async (slotKey, agentName) => {
  await clickSlot(slotKey);
  await waitFor(`Boolean(document.querySelector('[aria-label="Create agent confirmation"]'))`, 15000);
  await clickButtonByAnyText(confirmationButtonLabels);
  await waitFor(`Boolean(document.querySelector('[aria-label="Create agent"]'))`, 20000);
  await setFieldByAnyLabel(agentNameLabels, agentName);
  await setFieldByLabel("Role", "Codex Agent");
  await setFieldByLabel("Working directory", workspacePath);
  await setFieldByLabel("Permission mode", "readonly", "select");
  await setFieldByAnyLabel(initialBriefLabels, "Introduce yourself in one short sentence.", "textarea");
  await clickButtonByAnyText(submitButtonLabels);
  await waitFor(`!document.querySelector('[aria-label="Create agent"]')`, 20000);
  const agent = await waitFor(`(async () => {
    const agents = await window.codexOffice.agents.list();
    return agents.find((item) => item.name === ${JSON.stringify(agentName)}) ?? false;
  })()`, 20000);
  await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]')?.getAttribute('data-seat-state') === 'occupied'`, 20000);
  const seatLabel = await waitFor(
    `(() => {
      const label = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}] .office-slot-label');
      return label?.textContent?.trim() || false;
    })()`,
    15000
  );
  return { agent, seatLabel };
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

const waitForTranscript = async (agentId) =>
  waitFor(`(async () => {
    const sessions = await window.codexOffice.sessions.listByAgent(${JSON.stringify(agentId)});
    const messagesBySession = await Promise.all(sessions.map((session) => window.codexOffice.messages.listBySession(session.id)));
    const allMessages = messagesBySession.flat();
    const userMessages = allMessages.filter((message) => message.role === 'user');
    const agentMessages = allMessages.filter((message) => message.role === 'agent' && String(message.content ?? '').trim().length > 0);
    return userMessages.length >= 2 && agentMessages.length >= 2
      ? {
          agentId: ${JSON.stringify(agentId)},
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
await delay(1000);

await installPageHooks();
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
await clearAgents();
await waitFor(`Boolean(document.querySelector('.office-stage-frame'))`, 20000);
await waitFor(`(async () => typeof window.codexOffice !== "undefined" && (await window.codexOffice.agents.list()).length === 0)()`, 20000);
await installPageHooks();

const initialSnapshot = await getOfficeSnapshot();
const availableSlotKeys = await waitFor(`(() => {
  const slots = [...document.querySelectorAll('.office-slot[data-seat-state="available"]')];
  return slots.length >= 2 ? slots.slice(0, 2).map((slot) => slot.getAttribute('data-slot-key')) : false;
})()`, 15000);

const screenshots = {
  officeView: await screenshot("dual-agents-single-office-view.png")
};

const createdAgents = [];
for (const [index, slotKey] of availableSlotKeys.entries()) {
  createdAgents.push({
    slotKey,
    ...(await createAgentOnSlot(slotKey, agentNames[index]))
  });
}

screenshots.created = await screenshot("dual-agents-created.png");

const conversationResults = [];
for (const [index, created] of createdAgents.entries()) {
  await clickButtonByText("x").catch(() => Promise.resolve());
  await clickSlot(created.slotKey);
  await waitFor(`document.querySelector('.office-agent-panel')?.getAttribute('data-agent-id') === ${JSON.stringify(created.agent.id)}`, 15000);
  screenshots[index === 0 ? "chatA" : "chatB"] = await screenshot(
    index === 0 ? "dual-agents-chat-a.png" : "dual-agents-chat-b.png"
  );

  for (const [promptIndex, prompt] of prompts.entries()) {
    await sendMessage(prompt);
    await waitForCompletedRounds(created.agent.id, promptIndex + 1);
  }

  conversationResults.push(await waitForTranscript(created.agent.id));
}

const perAgentTranscriptCount = await evalExpr(`(async () => {
  const targetIds = ${JSON.stringify(createdAgents.map((created) => created.agent.id))};
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

for (const created of [...createdAgents].reverse()) {
  await clickSlot(created.slotKey);
  await waitFor(`document.querySelector('.office-agent-panel')?.getAttribute('data-agent-id') === ${JSON.stringify(created.agent.id)}`, 15000);
  await clickButtonByAnyText(deleteButtonLabels);
  await waitFor(`(async () => {
    const agents = await window.codexOffice.agents.list();
    return !agents.some((item) => item.id === ${JSON.stringify(created.agent.id)});
  })()`, 15000);
  await waitFor(`document.querySelector('.office-slot[data-slot-key=${JSON.stringify(created.slotKey)}]')?.getAttribute('data-seat-state') === 'available'`, 15000);
}

screenshots.deleted = await screenshot("dual-agents-deleted.png");

const uiErrors = await evalExpr(`window.__codexUiErrors ?? []`);
const remainingAgentCount = await evalExpr(`window.codexOffice.agents.list().then((agents) => agents.length)`);
const finalSnapshot = await getOfficeSnapshot();
const reportPath = path.join(outDir, "dual-agents-verification.json");
const report = {
  initialSnapshot,
  createdAgents,
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
