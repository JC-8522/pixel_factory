const debugPort = process.env.DEBUG_PORT ?? "9333";

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
const target =
  targets.find((item) => item.type === "page" && !String(item.url ?? "").startsWith("devtools://")) ?? targets[0];

if (!target) {
  throw new Error("No Electron renderer target found.");
}

const ws = new WebSocket(version.webSocketDebuggerUrl);
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
  const pendingKey = `${message.sessionId ?? "root"}:${message.id ?? ""}`;
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

const send = (method, params = {}, sessionId = null) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(`${sessionId ?? "root"}:${callId}`, { resolve, reject });
    ws.send(JSON.stringify(sessionId ? { id: callId, method, params, sessionId } : { id: callId, method, params }));
  });

const attachResult = await send("Target.attachToTarget", { targetId: target.id ?? target.targetId, flatten: true });
const sessionId = attachResult.sessionId;

const result = await send(
  "Runtime.evaluate",
  {
    expression: `(() => ({
      title: document.title,
      hasConversationWorkspace: Boolean(document.querySelector('.conversation-workspace-shell')),
      selectedConversationTitle: document.querySelector('.conversation-workspace-shell h2')?.textContent?.trim() ?? null,
      slotAttrs: [...document.querySelectorAll('.office-slot')].map((item) => ({
        slotKey: item.getAttribute('data-slot-key'),
        seatState: item.getAttribute('data-seat-state'),
        workstationState: item.getAttribute('data-workstation-state'),
        agentId: item.getAttribute('data-agent-id'),
        className: item.className
      })),
      bodyPreview: document.body.innerText.slice(0, 1400)
    }))()`,
    returnByValue: true
  },
  sessionId
);

console.log(JSON.stringify(result.result.value, null, 2));

ws.close();
setTimeout(() => process.exit(0), 50);
