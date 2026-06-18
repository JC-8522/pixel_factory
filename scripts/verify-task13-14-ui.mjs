import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/out";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const targets = await (await fetch("http://127.0.0.1:9222/json/list")).json();
const target = targets.find((item) => item.url?.includes("localhost:5173")) ?? targets[0];

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

const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });
  const filePath = path.join(outDir, name);
  await writeFile(filePath, Buffer.from(result.data, "base64"));
  return filePath;
};

const setReactFieldScript = `
  const setReactField = (element, value) => {
    const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
`;

await send("Page.enable");
await send("Runtime.enable");
await delay(1000);

await evalExpr(`(async () => {
  const cwd = 'C:/Users/Administrator/Desktop/repo/pixel_factory';
  const agents = await window.codexOffice.agents.list();
  if (agents.length < 2) {
    const stamp = Date.now();
    await window.codexOffice.runtime.spawnAgent({
      id: 'accept-dev-' + stamp,
      name: 'Acceptance Dev',
      role: 'Developer Agent',
      workingDirectory: cwd,
      runtimeKind: 'mock',
      permissionMode: 'ask',
      autoRunMode: 'manual',
      currentTask: 'Seed run history and token usage for task board acceptance.',
      modelProfile: 'mock-default'
    });
    await window.codexOffice.runtime.spawnAgent({
      id: 'accept-review-' + stamp,
      name: 'Acceptance Reviewer',
      role: 'Reviewer Agent',
      workingDirectory: cwd,
      runtimeKind: 'mock',
      permissionMode: 'ask',
      autoRunMode: 'manual',
      currentTask: 'Seed reviewer run for meeting acceptance.',
      modelProfile: 'mock-default'
    });
  }
  return true;
})()`);

await delay(1500);

await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Tasks')?.click();
  return true;
})()`);
await delay(700);

const task13 = await evalExpr(`(async () => {
  ${setReactFieldScript}
  const agents = await window.codexOffice.agents.list();
  const firstAgent = agents[0];
  const title = 'Acceptance Task 13 ' + Date.now();
  const titleInput = document.querySelector('[aria-label="Task title"]');
  const descInput = document.querySelector('[aria-label="Task description"]');
  const assignSelect = document.querySelector('[aria-label="Assign new task"]');
  setReactField(titleInput, title);
  setReactField(descInput, 'Create, assign, move, inspect timeline, and confirm cost visibility.');
  setReactField(assignSelect, firstAgent.id);
  await new Promise((resolve) => setTimeout(resolve, 100));
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Create Task').click();
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const card = [...document.querySelectorAll('.task-card')].find((item) => item.innerText.includes(title));
  if (!card) {
    throw new Error('Created task card not found: ' + document.body.innerText.slice(0, 1200));
  }
  const statusSelect = card.querySelector('[aria-label^="Move"]');
  for (const status of ['in_progress', 'waiting_review', 'done']) {
    statusSelect.value = status;
    statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const filters = document.querySelectorAll('.timeline-filters select');
  filters[0].value = firstAgent.id;
  filters[0].dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    title,
    columns: [...document.querySelectorAll('.column-heading h3')].map((item) => item.textContent),
    hasHealth: document.body.innerText.includes('Agent Health'),
    hasRunHistory: document.body.innerText.includes('Run History'),
    hasCost: document.body.innerText.includes('Manager Cost'),
    hasTimeline: document.body.innerText.includes('Activity Timeline'),
    taskVisible: document.body.innerText.includes(title),
    eventCount: document.querySelectorAll('.timeline-event').length
  };
})()`);

const taskShot = await screenshot("task13-accept-task-board.png");

await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Meeting Room')?.click();
  return true;
})()`);
await delay(700);

const task14 = await evalExpr(`(async () => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Create Meeting')?.click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const checked = document.querySelectorAll('.meeting-dialog input[type="checkbox"]:checked').length;
  if (checked < 2) {
    [...document.querySelectorAll('.meeting-dialog input[type="checkbox"]')].slice(0, 2).forEach((input) => {
      input.click();
    });
  }
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Start Meeting')?.click();
  await new Promise((resolve) => setTimeout(resolve, 1200));
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Send')?.click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Run Review Loop')?.click();
  await new Promise((resolve) => setTimeout(resolve, 900));
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Save Summary')?.click();
  await new Promise((resolve) => setTimeout(resolve, 400));
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Convert To Task')?.click();
  await new Promise((resolve) => setTimeout(resolve, 500));
  const text = document.body.innerText;
  return {
    hasMeetingRoom: text.includes('Meeting Room'),
    hasParticipants: document.querySelectorAll('.participant-strip span').length,
    hasFlowEditor: text.includes('Flow Rules'),
    hasRoutedMetadata: text.includes('rule=developer-to-reviewer') || text.includes('rule=reviewer-to-developer'),
    hasSummaryButton: text.includes('Save Summary'),
    messageCount: document.querySelectorAll('.meeting-message').length,
    hasAccepted: text.includes('Accepted')
  };
})()`);

const meetingShot = await screenshot("task14-accept-meeting-room.png");
const postState = await evalExpr(`(async () => ({
  agents: (await window.codexOffice.agents.list()).length,
  tasks: (await window.codexOffice.tasks.list()).length,
  meetings: (await window.codexOffice.meetings.list()).length,
  latestEvents: (await window.codexOffice.events.list()).slice(-8).map((event) => event.type)
}))()`);

console.log(
  JSON.stringify(
    {
      task13,
      task14,
      screenshots: { taskShot, meetingShot },
      postState
    },
    null,
    2
  )
);

ws.close();
