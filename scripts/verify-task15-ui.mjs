import { writeFile } from "node:fs/promises";
import path from "node:path";

const outDir = "C:/Users/Administrator/Desktop/repo/pixel_factory/out";
const validPack = "C:\\Users\\Administrator\\Desktop\\repo\\pixel_factory\\fixtures\\agent-packs\\founder-engineering-pack";
const malformedPack = "C:\\Users\\Administrator\\Desktop\\repo\\pixel_factory\\fixtures\\agent-packs\\malformed-pack";
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
await delay(1200);

await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Agent Packs')?.click();
  return document.body.innerText;
})()`);
await delay(700);

const inspection = await evalExpr(`(async () => {
  ${setReactFieldScript}
  const input = document.querySelector('[aria-label="Local Agent Pack folder"]');
  setReactField(input, ${JSON.stringify(validPack)});
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Inspect Pack')?.click();
  await new Promise((resolve) => setTimeout(resolve, 900));
  const text = document.body.innerText;
  return {
    hasReview: text.includes('Agent Pack Review'),
    hasPackName: text.includes('Founder Engineering Pack'),
    hasNotExecuted: text.includes('not executed'),
    hasPermissionManifest: [...document.querySelectorAll('h4')].some((item) => item.textContent.trim() === 'Permission Manifest'),
    hasWorkflow: text.includes('Developer Reviewer Loop'),
    hasChecksum: [...document.querySelectorAll('dt')].some((item) => item.textContent.trim() === 'Checksum')
  };
})()`);
const inspectionShot = await screenshot("task15-agent-pack-inspection.png");

const installation = await evalExpr(`(async () => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Install Reviewed Pack')?.click();
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const text = document.body.innerText;
  const profiles = await window.codexOffice.profiles.list();
  const packs = await window.codexOffice.agentPacks.listInstalled();
  return {
    hasInstalledBox: text.includes('Installed profiles visible in Profile Library'),
    profileInstalled: profiles.some((profile) => profile.id === 'pack-founder-engineer' && profile.source_pack_id === 'founder-engineering-pack'),
    packInstalled: packs.some((pack) => pack.id === 'founder-engineering-pack'),
    installedPacksVisible: text.includes('Installed Packs')
  };
})()`);
const installShot = await screenshot("task15-agent-pack-installed.png");

await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Profiles')?.click();
  return true;
})()`);
await delay(700);

const profileVisibility = await evalExpr(`(() => {
  const text = document.body.innerText;
  return {
    hasProfileLibrary: text.includes('Agent Profiles'),
    hasFounderEngineer: text.includes('Founder Engineer')
  };
})()`);
const profileShot = await screenshot("task15-installed-profile-library.png");

await evalExpr(`(() => {
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Agent Packs')?.click();
  return true;
})()`);
await delay(500);

const malformed = await evalExpr(`(async () => {
  ${setReactFieldScript}
  const input = document.querySelector('[aria-label="Local Agent Pack folder"]');
  setReactField(input, ${JSON.stringify(malformedPack)});
  [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Inspect Pack')?.click();
  await new Promise((resolve) => setTimeout(resolve, 900));
  const text = document.body.innerText;
  return {
    hasInvalid: text.includes('invalid'),
    hasErrors: text.includes('Validation errors'),
    missingId: text.includes('id is required'),
    missingRole: text.includes('profiles[0].role is required')
  };
})()`);
const malformedShot = await screenshot("task15-agent-pack-malformed.png");

const postState = await evalExpr(`(async () => ({
  packs: (await window.codexOffice.agentPacks.listInstalled()).map((pack) => ({ id: pack.id, validation_status: pack.validation_status })),
  profiles: (await window.codexOffice.profiles.list()).filter((profile) => profile.source_pack_id === 'founder-engineering-pack').map((profile) => profile.id),
  latestEvents: (await window.codexOffice.events.list()).slice(-10).map((event) => event.type)
}))()`);

console.log(
  JSON.stringify(
    {
      inspection,
      installation,
      profileVisibility,
      malformed,
      screenshots: { inspectionShot, installShot, profileShot, malformedShot },
      postState
    },
    null,
    2
  )
);

ws.close();
