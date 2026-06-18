const debugPort = process.env.DEBUG_PORT ?? "9555";

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

const result = await send("Runtime.evaluate", {
  expression: `(async () => {
    const agents = await window.codexOffice.agents.list();
    const sessions = await Promise.all(
      agents.map(async (agent) => ({
        agentId: agent.id,
        agentName: agent.name,
        sessions: await window.codexOffice.sessions.listByAgent(agent.id)
      }))
    );
    const sessionMessages = [];
    for (const entry of sessions) {
      for (const session of entry.sessions) {
        sessionMessages.push({
          agentId: entry.agentId,
          agentName: entry.agentName,
          session,
          messages: await window.codexOffice.messages.listBySession(session.id)
        });
      }
    }
    return {
      bodyText: document.body.innerText,
      agents,
      sessions,
      sessionMessages
    };
  })()`,
  awaitPromise: true,
  returnByValue: true
});

console.log(JSON.stringify(result.result.value, null, 2));
ws.close();
