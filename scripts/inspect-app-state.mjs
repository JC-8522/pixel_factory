const debugPort = process.env.DEBUG_PORT ?? "9333";

const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const target =
  targets.find((item) => item.type === "page" && !String(item.url ?? "").startsWith("devtools://")) ?? null;

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

await send("Runtime.enable");

const report = {
  bodyText: await evalExpr("document.body.innerText.slice(0, 1600)"),
  buttons: await evalExpr(`(() => [...document.querySelectorAll("button")].map((button) => ({
    text: (button.textContent ?? "").replace(/\\s+/g, " ").trim(),
    agentId: button.getAttribute("data-agent-id"),
    slotKey: button.getAttribute("data-slot-key"),
    state: button.getAttribute("data-workstation-state")
  })))()`),
  agents: await evalExpr("window.codexOffice.agents.list()"),
  snapshot: await evalExpr("window.codexOffice.office.getSnapshot()"),
  selectedAgentId: await evalExpr(`document.querySelector(".detail-panel")?.getAttribute("data-agent-id") ?? null`),
  slotStates: await evalExpr(`(() => [...document.querySelectorAll(".office-slot")].map((item) => ({
    slotKey: item.getAttribute("data-slot-key"),
    state: item.getAttribute("data-workstation-state"),
    workstationId: item.getAttribute("data-workstation-id"),
    agentId: item.getAttribute("data-agent-id")
  })))()`),
  uiErrors: await evalExpr("window.__codexUiErrors ?? []")
};

console.log(JSON.stringify(report, null, 2));
ws.close();
