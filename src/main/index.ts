import { app, BrowserWindow, dialog } from "electron";
import { once } from "node:events";
import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppInfo } from "../shared/types/app";
import { createMigratedDatabaseClient } from "./db/client";
import { createIpcHandlers, type IpcHandlers } from "./ipc/createIpcHandlers";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import { IPC_CHANNELS } from "../shared/ipc";
import { inspectLocalCodexAvailability } from "./runtime/codexInstallation";
import { createDefaultRuntimeRegistry } from "./runtime/RuntimeRegistry";

const isDevelopment = !app.isPackaged;
const shouldOpenDevTools = isDevelopment && process.env.ELECTRON_OPEN_DEVTOOLS === "1";
const remoteDebuggingPort = process.env.DEBUG_PORT?.trim() || null;
const automationMode = process.env.PIXEL_FACTORY_AUTOMATION_MODE?.trim() || null;
const automationOutDir = process.env.PIXEL_FACTORY_AUTOMATION_OUT_DIR?.trim() || null;
const automationUserDataDir = process.env.PIXEL_FACTORY_AUTOMATION_USER_DATA?.trim() || null;
const automationScenario = process.env.PIXEL_FACTORY_AUTOMATION_SCENARIO?.trim() || "completed";
const automationRuntimeKind = process.env.PIXEL_FACTORY_VERIFY_RUNTIME?.trim() === "codex_cli" ? "codex_cli" : "mock";
let mainWindow: BrowserWindow | null = null;

const formatErrorForTrace = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
};

if (remoteDebuggingPort) {
  app.commandLine.appendSwitch("remote-debugging-port", remoteDebuggingPort);
}

if (automationMode) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("use-angle", "swiftshader");
}

if (automationUserDataDir) {
  app.setPath("userData", automationUserDataDir);
}

const createMainWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: true,
    title: "Local Codex Office",
    backgroundColor: "#101417",
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  void appendStartupTrace(`mainWindow:browser-created:${window.id}`);

  window.on("ready-to-show", () => {
    void appendStartupTrace(`mainWindow:ready-to-show:${window.id}`);
  });

  window.on("show", () => {
    void appendStartupTrace(`mainWindow:show:${window.id}`);
  });

  window.on("focus", () => {
    void appendStartupTrace(`mainWindow:focus:${window.id}`);
  });

  window.on("unresponsive", () => {
    void appendStartupTrace(`mainWindow:unresponsive:${window.id}`);
  });

  window.on("close", () => {
    void appendStartupTrace(`mainWindow:close:${window.id}`);
  });

  window.on("closed", () => {
    void appendStartupTrace(`mainWindow:closed:${window.id}`);
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  window.webContents.on("did-start-loading", () => {
    void appendStartupTrace(`mainWindow:did-start-loading:${window.id}`);
  });

  window.webContents.on("did-finish-load", () => {
    void appendStartupTrace(`mainWindow:did-finish-load:${window.id}:${window.webContents.getURL()}`);
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    void appendStartupTrace(
      `mainWindow:did-fail-load:${window.id}:code=${errorCode}:description=${errorDescription}:url=${validatedURL}:mainFrame=${isMainFrame}`
    );
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    void appendStartupTrace(`mainWindow:render-process-gone:${window.id}:${details.reason}`);
    if (isDevelopment) {
      console.error(`[renderer:gone] ${details.reason}`);
    }
  });

  if (isDevelopment) {
    window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    });
  }

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  const loadPromise = rendererUrl
    ? window.loadURL(rendererUrl)
    : window.loadFile(join(__dirname, "../renderer/index.html"));

  void loadPromise.catch((error) => {
    void appendStartupTrace(`mainWindow:load-error:${window.id}:${formatErrorForTrace(error)}`);
  });

  if (shouldOpenDevTools) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow = window;
  window.show();
  window.focus();

  return window;
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const waitForWindowLoad = async (window: BrowserWindow): Promise<void> => {
  if (window.webContents.isLoadingMainFrame() || !window.webContents.getURL()) {
    await once(window.webContents, "did-finish-load");
  }
};

const evaluateInWindow = async <T>(window: BrowserWindow, expression: string): Promise<T> =>
  window.webContents.executeJavaScript(expression, true) as Promise<T>;

const evaluateInWindowWithTimeout = async <T>(
  window: BrowserWindow,
  expression: string,
  timeoutMs = 2_000
): Promise<T> =>
  Promise.race([
    evaluateInWindow<T>(window, expression),
    delay(timeoutMs).then(() => {
      throw new Error(`Renderer evaluation timed out: ${expression}`);
    })
  ]);

const waitForWindowValue = async <T>(
  window: BrowserWindow,
  expression: string,
  timeoutMs = 20_000
): Promise<T> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await evaluateInWindowWithTimeout<T | false>(window, expression, Math.min(2_000, timeoutMs));
      if (value) {
        return value;
      }
    } catch {
      // Ignore transient evaluation failures during renderer reloads.
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for renderer expression: ${expression}`);
};

const waitForAsyncValue = async <T>(
  producer: () => Promise<T | false> | T | false,
  timeoutMs = 20_000
): Promise<T> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await producer();
    if (value) {
      return value;
    }
    await delay(250);
  }

  throw new Error("Timed out waiting for async value.");
};

const withTimeout = async <T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> =>
  Promise.race([
    work,
    delay(timeoutMs).then(() => {
      throw new Error(`Timed out while ${label}.`);
    })
  ]);

const captureWindowPlainDomSnapshotDataUrl = async (window: BrowserWindow): Promise<string> =>
  evaluateInWindow<string>(
    window,
    `(async () => {
      const root = document.documentElement;
      const body = document.body;
      const width = Math.max(root.scrollWidth, body?.scrollWidth ?? 0, window.innerWidth, 1);
      const height = Math.max(root.scrollHeight, body?.scrollHeight ?? 0, window.innerHeight, 1);
      const markup = new XMLSerializer().serializeToString(root);
      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">',
        '<foreignObject x="0" y="0" width="100%" height="100%">',
        markup,
        '</foreignObject>',
        '</svg>'
      ].join('');

      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const image = new Image();
      const loaded = new Promise((resolve, reject) => {
        image.onload = () => resolve(true);
        image.onerror = () => reject(new Error('Plain DOM snapshot image failed to load.'));
      });

      image.src = dataUrl;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context unavailable.');
      }

      const background = getComputedStyle(body ?? root).backgroundColor;
      context.fillStyle = background && background !== 'rgba(0, 0, 0, 0)' ? background : '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    })()`
  );

const captureWindowStyledDomSnapshotDataUrl = async (window: BrowserWindow): Promise<string> =>
  evaluateInWindow<string>(
    window,
    `(async () => {
      const root = document.documentElement;
      const body = document.body;
      const width = Math.max(root.scrollWidth, body?.scrollWidth ?? 0, window.innerWidth, 1);
      const height = Math.max(root.scrollHeight, body?.scrollHeight ?? 0, window.innerHeight, 1);
      const stylesheetText = [...document.styleSheets]
        .map((sheet) => {
          try {
            return [...sheet.cssRules].map((rule) => rule.cssText).join('\\n');
          } catch {
            return '';
          }
        })
        .filter(Boolean)
        .join('\\n');
      const escapedStylesheetText = stylesheetText.replace(/]]>/g, ']]]]><![CDATA[>');
      const markup = [
        '<div xmlns="http://www.w3.org/1999/xhtml"',
        body?.className ? ' class="' + body.className.replace(/"/g, '&quot;') + '"' : '',
        ' style="margin:0; width:' + width + 'px; min-height:' + height + 'px;">',
        body?.innerHTML ?? '',
        '</div>'
      ].join('');
      const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">',
        '<foreignObject x="0" y="0" width="100%" height="100%">',
        '<style><![CDATA[' + escapedStylesheetText + ']]></style>',
        markup,
        '</foreignObject>',
        '</svg>'
      ].join('');

      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const image = new Image();
      const loaded = new Promise((resolve, reject) => {
        image.onload = () => resolve(true);
        image.onerror = () => reject(new Error('DOM snapshot image failed to load.'));
      });

      image.src = dataUrl;
      await loaded;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2D context unavailable.');
      }

      const background = getComputedStyle(body ?? root).backgroundColor;
      context.fillStyle = background && background !== 'rgba(0, 0, 0, 0)' ? background : '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/png');
    })()`
  );

const captureWindowDebuggerScreenshot = async (window: BrowserWindow, filePath: string): Promise<string> => {
  const { debugger: debuggerSession } = window.webContents;
  const attachedHere = !debuggerSession.isAttached();

  if (attachedHere) {
    debuggerSession.attach("1.3");
  }

  try {
    await debuggerSession.sendCommand("Page.bringToFront");
    await delay(150);
    const screenshot = await debuggerSession.sendCommand("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true
    });
    const png = Buffer.from(String(screenshot.data ?? ""), "base64");
    if (png.byteLength === 0) {
      throw new Error("Debugger screenshot was empty.");
    }
    await writeFile(filePath, png);
    return filePath;
  } finally {
    if (attachedHere && debuggerSession.isAttached()) {
      try {
        debuggerSession.detach();
      } catch {
        // Ignore debugger detach races during shutdown.
      }
    }
  }
};

const setAutomationCaptureMode = async (window: BrowserWindow, enabled: boolean): Promise<void> => {
  await evaluateInWindow(
    window,
    `(() => {
      const enabled = ${enabled ? "true" : "false"};
      document.body.toggleAttribute("data-automation-capture", enabled);
      if (enabled) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.querySelector(".conversation-thread-scroll")?.scrollTo?.({ top: 0, left: 0, behavior: "instant" });
      }
      return true;
    })()`
  );
};

const captureWindowToFile = async (window: BrowserWindow, filePath: string): Promise<string> => {
  try {
    return await withTimeout(captureWindowDebuggerScreenshot(window, filePath), 3_000, "capturing debugger screenshot");
  } catch {
    // Fall back to native capture and DOM snapshots below.
  }

  const image = await withTimeout(window.webContents.capturePage(), 3_000, "capturing native screenshot");
  const png = image.toPNG();
  if (png.byteLength > 0) {
    await writeFile(filePath, png);
    return filePath;
  }

  let dataUrl: string;
  try {
    dataUrl = await withTimeout(captureWindowStyledDomSnapshotDataUrl(window), 4_000, "capturing styled DOM snapshot");
  } catch {
    dataUrl = await withTimeout(captureWindowPlainDomSnapshotDataUrl(window), 4_000, "capturing plain DOM snapshot");
  }
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  await writeFile(filePath, Buffer.from(base64, "base64"));
  return filePath;
};

const captureWindowToFileIfPossible = async (
  window: BrowserWindow,
  filePath: string,
  logStep: (message: string) => Promise<void>,
  label: string
): Promise<string | null> => {
  try {
    return await captureWindowToFile(window, filePath);
  } catch (error) {
    await logStep(
      `${label} capture skipped: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
};

const readRendererSnapshot = async (window: BrowserWindow): Promise<Record<string, unknown>> =>
  evaluateInWindow<Record<string, unknown>>(
    window,
    `(() => ({
      title: document.title,
      readyState: document.readyState,
      url: window.location.href,
      hasRoot: Boolean(document.getElementById("root")),
      rootChildCount: document.getElementById("root")?.childElementCount ?? 0,
      hasOfficeStage: Boolean(document.querySelector(".office-stage-frame")),
      hasConversationWorkspace: Boolean(document.querySelector(".conversation-workspace-shell")),
      bodyText: (document.body?.innerText ?? "").slice(0, 1000),
      bodyHtml: (document.body?.innerHTML ?? "").slice(0, 4000)
    }))()`
  );

const readConversationLayoutSnapshot = async (window: BrowserWindow): Promise<Record<string, unknown>> =>
  evaluateInWindow<Record<string, unknown>>(
    window,
    `(() => {
      const measure = (selector) => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) {
          return null;
        }

        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          selector,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom),
          display: style.display,
          position: style.position,
          alignSelf: style.alignSelf,
          alignItems: style.alignItems,
          alignContent: style.alignContent,
          justifyContent: style.justifyContent,
          overflow: style.overflow,
          minHeight: style.minHeight,
          heightCss: style.height
        };
      };

      const buttonSummary = (label) => {
        const button = [...document.querySelectorAll("button")].find(
          (item) => item.textContent?.replace(/\\s+/g, " ").trim() === label
        );
        if (!(button instanceof HTMLButtonElement)) {
          return null;
        }

        const rect = button.getBoundingClientRect();
        return {
          label,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom)
        };
      };

      const buttonLabels = [...document.querySelectorAll("button")]
        .map((item) => item.textContent?.replace(/\\s+/g, " ").trim() ?? "")
        .filter((label) => label.length > 0);

      const run = document.querySelector('.conversation-run-thread[data-layout="minimal"], .conversation-run-thread[data-layout="chat-expanded"]');

      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        runLayout: run?.getAttribute("data-layout") ?? null,
        shell: measure(".conversation-workspace-shell"),
        surface: measure(".conversation-thread-surface"),
        scroll: measure(".conversation-thread-scroll"),
        run: measure('.conversation-run-thread[data-layout="minimal"], .conversation-run-thread[data-layout="chat-expanded"]'),
        flow: measure(".conversation-run-main-flow"),
        visibleStream: measure(".conversation-run-visible-stream-shell"),
        visibleList: measure(".conversation-record-group-list-flat"),
        firstVisibleEntry: measure(".conversation-run-visible-entry-flat"),
        firstVisibleMessage: measure(".conversation-run-visible-entry-flat .conversation-message-main"),
        footer: measure(".conversation-run-minimal-footer"),
        footerMeta: measure(".conversation-run-minimal-meta"),
        footerActions: measure(".conversation-run-actions-minimal"),
        headerButtonLabels: buttonLabels.filter((label) =>
          ["History", "Threads", "Runs", "New thread", "Office", "More"].includes(label)
        ),
        footerActionLabels: [...document.querySelectorAll(".conversation-run-actions-minimal button")].map(
          (item) => item.textContent?.replace(/\\s+/g, " ").trim() ?? ""
        ),
        historyButton: buttonSummary("History"),
        threadsButton: buttonSummary("Threads"),
        runsButton: buttonSummary("Runs"),
        copyButton: buttonSummary("Copy"),
        detailsButton: buttonSummary("Details"),
        hideDetailsButton: buttonSummary("Hide details")
      };
    })()`
  );

const clickButtonByExactTextExpression = (text: string): string => `(() => {
  const normalize = (value) => value.replace(/\\s+/g, " ").trim();
  const button = [...document.querySelectorAll("button")].find((item) => normalize(item.textContent ?? "") === ${JSON.stringify(text)});
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Button not found: " + ${JSON.stringify(text)});
  }
  setTimeout(() => button.click(), 0);
  return true;
})()`;

const clickButtonByAnyExactTextExpression = (texts: string[]): string => `(() => {
  const normalize = (value) => value.replace(/\\s+/g, " ").trim();
  const options = ${JSON.stringify(texts)};
  const button = [...document.querySelectorAll("button")].find((item) => options.includes(normalize(item.textContent ?? "")));
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  setTimeout(() => button.click(), 0);
  return true;
})()`;

const ensureActionMenuOpenExpression = (actionText: string): string => `(() => {
  const normalize = (value) => value.replace(/\\s+/g, " ").trim();
  const actionLabel = ${JSON.stringify(actionText)};
  const hasAction = [...document.querySelectorAll("button")].some(
    (item) => normalize(item.textContent ?? "") === actionLabel
  );
  if (hasAction) {
    return true;
  }

  const moreButton = [...document.querySelectorAll("button")].find(
    (item) => normalize(item.textContent ?? "") === "More"
  );
  if (!(moreButton instanceof HTMLButtonElement)) {
    throw new Error("More button not found.");
  }

  moreButton.click();
  return true;
})()`;

const clickSlotExpression = (slotKey: string): string => `(() => {
  const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(slotKey)}]');
  if (!(slot instanceof HTMLElement)) {
    throw new Error("Automation slot not found: " + ${JSON.stringify(slotKey)});
  }

  const snapshot = {
    slotKey: slot.getAttribute("data-slot-key"),
    seatState: slot.getAttribute("data-seat-state"),
    workstationState: slot.getAttribute("data-workstation-state"),
    agentId: slot.getAttribute("data-agent-id"),
    className: slot.className
  };
  setTimeout(() => {
    slot.focus();
    slot.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    slot.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    slot.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    slot.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    slot.click();
  }, 0);
  return snapshot;
})()`;

const setFieldByLabelExpression = (labelText: string, value: string, tagName = "input"): string => `(() => {
  const normalize = (input) => input.replace(/\\s+/g, " ").trim().toLowerCase();
  const targetLabel = normalize(${JSON.stringify(labelText)});
  const setReactValue = (element, nextValue) => {
    const prototype =
      element.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : element.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(element, nextValue);
  };
  const labelCandidates = [...document.querySelectorAll("label")];
  const label =
    labelCandidates.find((item) => normalize(item.getAttribute("data-chip-label") ?? "") === targetLabel)
    ?? labelCandidates.find((item) => {
      const chipLabel = item.querySelector(".conversation-context-chip-label");
      return chipLabel instanceof HTMLElement && normalize(chipLabel.textContent ?? "") === targetLabel;
    })
    ?? labelCandidates.find((item) => normalize(item.textContent ?? "").includes(targetLabel));
  if (!label) {
    throw new Error("Label not found: " + ${JSON.stringify(labelText)});
  }
  const field = label.querySelector(${JSON.stringify(tagName)});
  if (!field) {
    throw new Error("Field not found for label: " + ${JSON.stringify(labelText)});
  }
  field.focus();
  if (field instanceof HTMLSelectElement) {
    const nextValue = ${JSON.stringify(value)};
    const options = [...field.options];
    const matchIndex = options.findIndex((option) =>
      option.value === nextValue
      || normalize(option.label ?? "") === normalize(nextValue)
      || normalize(option.text ?? "") === normalize(nextValue)
      || normalize(option.textContent ?? "") === normalize(nextValue)
    );
    if (matchIndex === -1) {
      setReactValue(field, nextValue);
      if (field.value !== nextValue) {
        throw new Error(
          "Option not found for label: "
            + ${JSON.stringify(labelText)}
            + " -> "
            + nextValue
            + " | available="
            + options.map((option) => option.value + ":" + (option.label || option.textContent || "")).join(",")
        );
      }
    } else {
      field.selectedIndex = matchIndex;
      setReactValue(field, options[matchIndex]?.value ?? nextValue);
    }
  } else {
    setReactValue(field, ${JSON.stringify(value)});
  }
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
})()`;

const setFieldByLabelAndCommitExpression = (labelText: string, value: string, tagName = "input"): string => `(() => {
  const normalize = (input) => input.replace(/\\s+/g, " ").trim().toLowerCase();
  const targetLabel = normalize(${JSON.stringify(labelText)});
  const setReactValue = (element, nextValue) => {
    const prototype =
      element.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : element.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(element, nextValue);
  };
  const labelCandidates = [...document.querySelectorAll("label")];
  const label =
    labelCandidates.find((item) => normalize(item.getAttribute("data-chip-label") ?? "") === targetLabel)
    ?? labelCandidates.find((item) => {
      const chipLabel = item.querySelector(".conversation-context-chip-label");
      return chipLabel instanceof HTMLElement && normalize(chipLabel.textContent ?? "") === targetLabel;
    })
    ?? labelCandidates.find((item) => normalize(item.textContent ?? "").includes(targetLabel));
  if (!label) {
    throw new Error("Label not found: " + ${JSON.stringify(labelText)});
  }
  const field = label.querySelector(${JSON.stringify(tagName)});
  if (!field) {
    throw new Error("Field not found for label: " + ${JSON.stringify(labelText)});
  }
  field.focus();
  if (field instanceof HTMLSelectElement) {
    const nextValue = ${JSON.stringify(value)};
    const options = [...field.options];
    const matchIndex = options.findIndex((option) =>
      option.value === nextValue
      || normalize(option.label ?? "") === normalize(nextValue)
      || normalize(option.text ?? "") === normalize(nextValue)
      || normalize(option.textContent ?? "") === normalize(nextValue)
    );
    if (matchIndex === -1) {
      setReactValue(field, nextValue);
      if (field.value !== nextValue) {
        throw new Error(
          "Option not found for label: "
            + ${JSON.stringify(labelText)}
            + " -> "
            + nextValue
            + " | available="
            + options.map((option) => option.value + ":" + (option.label || option.textContent || "")).join(",")
        );
      }
    } else {
      field.selectedIndex = matchIndex;
      setReactValue(field, options[matchIndex]?.value ?? nextValue);
    }
  } else {
    setReactValue(field, ${JSON.stringify(value)});
  }
  field.dispatchEvent(new Event("input", { bubbles: true }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    field.blur();
  } else if (field instanceof HTMLSelectElement) {
    field.blur();
  }
  return true;
})()`;

const installUiErrorHooksExpression = (): string => `(() => {
  window.confirm = () => true;
  window.__codexUiErrors = window.__codexUiErrors ?? [];
  if (!window.__codexUiHooked) {
    window.addEventListener("error", (event) => {
      window.__codexUiErrors.push(String(event.message ?? "unknown error"));
    });
    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      window.__codexUiErrors.push(reason);
    });
    const originalConsoleError = console.error.bind(console);
    console.error = (...args) => {
      window.__codexUiErrors.push(args.map((item) => String(item)).join(" "));
      originalConsoleError(...args);
    };
    window.__codexUiHooked = true;
  }
  return true;
})()`;

const runConversationWorkspaceAutomation = async (window: BrowserWindow): Promise<void> => {
  const outDir = automationOutDir?.trim() || join(process.cwd(), "verification");
  await mkdir(outDir, { recursive: true });

  const agentId = `focus-flow-${Date.now()}`;
  const agentName = `Focus Flow ${Date.now()}`;
  const targetSlotKey = "ws-01";
  const workspacePath = process.cwd().replace(/\\/g, "/");
  const scenario =
    automationScenario === "approval"
      ? "approval"
      : automationScenario === "attachment"
        ? "attachment"
        : automationScenario === "controls"
          ? "controls"
          : "completed";
  const screenshotPrefix =
    scenario === "approval"
      ? "conversation-focus-approval"
      : scenario === "attachment"
        ? "conversation-focus-attachment"
        : scenario === "controls"
          ? "conversation-focus-controls"
          : "conversation-focus";
  const initialPrompt =
    scenario === "approval"
      ? "rm build-output"
      : scenario === "attachment"
        ? "Review the attached office screenshot and confirm it stays visible in the thread."
        : scenario === "controls"
          ? "Reply with the exact phrase: controls baseline ready."
          : "Reply with the exact phrase: focus workspace verified.";
  const controlsWorkspaceId = `workspace-controls-${Date.now()}`;
  const controlsWorkspaceName = "Controls Workspace";
  const controlsWorkspaceRoot = join(process.cwd(), "verification").replace(/\\/g, "/");
  const controlsProfileId = `profile-controls-${Date.now()}`;
  const controlsProfileName = "Controls Profile";
  const controlsBranch = "codex/ui-controls";
  const controlsRenamedTitle = "Controls thread renamed";
  const controlsFollowupPrompt = "Reply with the exact phrase: controls follow-up verified.";
  const officeScreenshot = join(outDir, "conversation-focus-office.png");
  const emptyScreenshot = join(outDir, "conversation-focus-empty-state.png");
  const threadScreenshot = join(outDir, `${screenshotPrefix}-thread.png`);
  const detailScreenshot = join(outDir, `${screenshotPrefix}-detail-run.png`);
  const expandedScreenshot = join(outDir, `${screenshotPrefix}-expanded-run.png`);
  const startupScreenshot = join(outDir, `${screenshotPrefix}-startup.png`);
  const stageTimeoutScreenshot = join(outDir, `${screenshotPrefix}-stage-timeout.png`);
  const composerScreenshot = scenario === "attachment" ? join(outDir, `${screenshotPrefix}-composer.png`) : null;
  const returnedOfficeScreenshot = scenario === "controls" ? join(outDir, `${screenshotPrefix}-returned-office.png`) : null;
  const cleanupScreenshot = scenario === "controls" ? join(outDir, `${screenshotPrefix}-cleanup.png`) : null;
  let capturedStartupScreenshot: string | null = null;
  let capturedOfficeScreenshot: string | null = null;
  let capturedEmptyScreenshot: string | null = null;
  let capturedThreadScreenshot: string | null = null;
  let capturedDetailScreenshot: string | null = null;
  let capturedExpandedScreenshot: string | null = null;
  let capturedComposerScreenshot: string | null = null;
  let capturedReturnedOfficeScreenshot: string | null = null;
  let capturedCleanupScreenshot: string | null = null;
  let approvalUiSnapshot: Record<string, unknown> | null = null;
  let threadLayoutSnapshot: Record<string, unknown> | null = null;
  const reportPath = join(outDir, `${screenshotPrefix}-report.json`);
  const automationLogPath = join(outDir, `${screenshotPrefix}-automation.log`);
  const logStep = async (message: string): Promise<void> => {
    await appendFile(automationLogPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  };

  await writeFile(automationLogPath, "", "utf8");
  window.webContents.on("render-process-gone", (_event, details) => {
    void logStep(`render-process-gone: ${details.reason}`);
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    void logStep(`console:${level}: ${message} (${sourceId}:${line})`);
  });
  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    void logStep(
      `did-fail-load: code=${errorCode} description=${errorDescription} url=${validatedURL} mainFrame=${isMainFrame}`
    );
  });
  await logStep("automation start");

  await waitForWindowLoad(window);
  await logStep("window load complete");
  const startupSnapshot = await readRendererSnapshot(window);
  await logStep(`startup snapshot: ${JSON.stringify(startupSnapshot)}`);
  capturedStartupScreenshot = await captureWindowToFileIfPossible(window, startupScreenshot, logStep, "startup");
  try {
    await waitForWindowValue(window, `Boolean(document.querySelector(".office-stage-frame"))`, 20_000);
  } catch (error) {
    const failureSnapshot = await readRendererSnapshot(window);
    await logStep(`office stage wait failed: ${JSON.stringify(failureSnapshot)}`);
    await captureWindowToFileIfPossible(window, stageTimeoutScreenshot, logStep, "stage-timeout");
    throw error;
  }
  await logStep("office stage visible");
  await evaluateInWindow(window, installUiErrorHooksExpression());
  await logStep("ui hooks installed");

  await logStep("fresh automation user data ready");
  await logStep(`available slot selected: ${targetSlotKey}`);

  const createLoad = once(window.webContents, "did-finish-load");
  await evaluateInWindow(
    window,
    `(async () => {
      const snapshot = await window.codexOffice.office.getSnapshot();
      const floorId = snapshot.floors[0]?.id;
      if (!floorId) {
        throw new Error("No floor available for automation.");
      }

      if (${JSON.stringify(scenario)} === "controls") {
        const existingWorkspaces = await window.codexOffice.workspaces.list();
        if (!existingWorkspaces.some((item) => item.id === ${JSON.stringify(controlsWorkspaceId)})) {
          await window.codexOffice.workspaces.create({
            id: ${JSON.stringify(controlsWorkspaceId)},
            name: ${JSON.stringify(controlsWorkspaceName)},
            rootPath: ${JSON.stringify(controlsWorkspaceRoot)}
          });
        }

        const existingProfiles = await window.codexOffice.profiles.list();
        if (!existingProfiles.some((item) => item.id === ${JSON.stringify(controlsProfileId)})) {
          await window.codexOffice.profiles.create({
            id: ${JSON.stringify(controlsProfileId)},
            name: ${JSON.stringify(controlsProfileName)},
            role: "Codex Agent",
            defaultModelProfile: "5.4 Low",
            defaultPermissionMode: "on_request",
            defaultAutoRunMode: "manual"
          });
        }
      }

      let workstation = snapshot.workstations.find((item) => item.slot_key === ${JSON.stringify(targetSlotKey)}) ?? null;
      if (!workstation) {
        workstation = await window.codexOffice.office.createWorkstation({
          id: ${JSON.stringify(`workstation-${Date.now()}`)},
          floorId,
          slotKey: ${JSON.stringify(targetSlotKey)}
        });
      }

      await window.codexOffice.agents.create({
        id: ${JSON.stringify(agentId)},
        name: ${JSON.stringify(agentName)},
        role: "Codex Agent",
        workingDirectory: ${JSON.stringify(workspacePath)},
        runtimeKind: ${JSON.stringify(automationRuntimeKind)},
        permissionMode: "workspace_write",
        autoRunMode: "manual",
        currentTask: "Introduce yourself in one short sentence.",
        workstationId: workstation.id,
        metadata: {
          createdFromUiVerification: true,
          createdFromUi: true
        }
      });

      window.location.reload();
      return true;
    })()`
  );
  await createLoad;
  await logStep("mock agent created and renderer reloaded");

  if (scenario === "controls") {
    const syncLoad = once(window.webContents, "did-finish-load");
    const syncResult = await evaluateInWindow<{ reloaded: boolean; workspaces: string[]; profiles: string[] }>(
      window,
      `(async () => {
        const workspaces = await window.codexOffice.workspaces.list();
        const profiles = await window.codexOffice.profiles.list();
        let reloaded = false;

        if (!workspaces.some((item) => item.id === ${JSON.stringify(controlsWorkspaceId)})) {
          await window.codexOffice.workspaces.create({
            id: ${JSON.stringify(controlsWorkspaceId)},
            name: ${JSON.stringify(controlsWorkspaceName)},
            rootPath: ${JSON.stringify(controlsWorkspaceRoot)}
          });
          reloaded = true;
        }

        if (!profiles.some((item) => item.id === ${JSON.stringify(controlsProfileId)})) {
          await window.codexOffice.profiles.create({
            id: ${JSON.stringify(controlsProfileId)},
            name: ${JSON.stringify(controlsProfileName)},
            role: "Codex Agent",
            defaultModelProfile: "5.4 Low",
            defaultPermissionMode: "on_request",
            defaultAutoRunMode: "manual"
          });
          reloaded = true;
        }

        if (reloaded) {
          window.location.reload();
        }

        return {
          reloaded,
          workspaces: workspaces.map((item) => item.id),
          profiles: profiles.map((item) => item.id)
        };
      })()`
    );
    await logStep(`post-reload controls sync: ${JSON.stringify(syncResult)}`);
    if (syncResult.reloaded) {
      await syncLoad;
      await logStep("controls assets created after reload and renderer reloaded again");
    }
  }

  await waitForWindowValue(window, `Boolean(document.querySelector(".office-stage-frame"))`, 20_000);
  await evaluateInWindow(window, installUiErrorHooksExpression());
  await waitForWindowValue(
    window,
    `(() => {
      const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]');
      return slot?.getAttribute("data-seat-state") === "occupied" ? true : false;
    })()`,
    20_000
  );
  await logStep("target slot reported as occupied");
  await waitForWindowValue(
    window,
    `(() => {
      const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]');
      return slot?.getAttribute("data-agent-id") || false;
    })()`,
    20_000
  );
  await logStep("target slot reported agent id");
  const clickSnapshot = await evaluateInWindow<Record<string, string | null>>(window, clickSlotExpression(targetSlotKey));
  await logStep(`occupied slot clicked: ${JSON.stringify(clickSnapshot)}`);
  await delay(600);
  const postClickSnapshot = await evaluateInWindowWithTimeout<Record<string, unknown>>(
    window,
    `(() => ({
      title: document.title,
      hasConversationWorkspace: Boolean(document.querySelector(".conversation-workspace-shell")),
      officeVisible: Boolean(document.querySelector(".office-stage-frame")),
      selectedSlotKey: document.querySelector(".office-slot.is-selected")?.getAttribute("data-slot-key") ?? null,
      selectedSlotAgentId: document.querySelector(".office-slot.is-selected")?.getAttribute("data-agent-id") ?? null,
      activeElement:
        document.activeElement instanceof HTMLElement
          ? {
              tag: document.activeElement.tagName,
              className: document.activeElement.className,
              text: document.activeElement.textContent?.replace(/\\s+/g, " ").trim().slice(0, 120) ?? ""
            }
          : null,
      buttonLabels: [...document.querySelectorAll("button")]
        .map((item) => item.textContent?.replace(/\\s+/g, " ").trim() ?? "")
        .filter(Boolean)
        .slice(0, 20),
      bodyPreview: document.body.innerText.replace(/\\s+/g, " ").trim().slice(0, 1200)
    }))()`,
    2500
  ).catch((error) => ({
    error: error instanceof Error ? error.message : String(error)
  }));
  await logStep(`post-click snapshot: ${JSON.stringify(postClickSnapshot)}`);
  capturedOfficeScreenshot = await captureWindowToFileIfPossible(window, officeScreenshot, logStep, "office");
  await logStep("office screenshot captured after selecting occupied slot");

  let workspaceOpened = false;
  try {
    await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-workspace-shell"))`, 20_000);
    await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-composer-card textarea"))`, 20_000);
    workspaceOpened = true;
    await logStep("thread workspace opened");
    await setAutomationCaptureMode(window, true);
    capturedEmptyScreenshot = await captureWindowToFileIfPossible(window, emptyScreenshot, logStep, "empty state");
    await setAutomationCaptureMode(window, false);
    await logStep("empty state screenshot captured");
  } catch (error) {
    const retrySnapshot = await evaluateInWindow<Record<string, string | null>>(window, clickSlotExpression(targetSlotKey)).catch(
      () => null
    );
    if (retrySnapshot) {
      await logStep(`occupied slot clicked again after workspace timeout: ${JSON.stringify(retrySnapshot)}`);
      try {
        await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-workspace-shell"))`, 8_000);
        await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-composer-card textarea"))`, 8_000);
        workspaceOpened = true;
        await logStep("thread workspace opened after retry");
        await setAutomationCaptureMode(window, true);
        capturedEmptyScreenshot = await captureWindowToFileIfPossible(window, emptyScreenshot, logStep, "empty state");
        await setAutomationCaptureMode(window, false);
        await logStep("empty state screenshot captured after retry");
      } catch {
        // Fall through to diagnostics below.
      }
    }
  }

  if (!workspaceOpened) {
    await logStep("thread workspace still did not open after retry");
  }

  if (!workspaceOpened) {
    await logStep(
      "collecting renderer diagnostics before writing failure report"
    );
    const report = await evaluateInWindow<Record<string, unknown>>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)}).catch(() => null);
        return {
          agentId: ${JSON.stringify(agentId)},
          agentName: ${JSON.stringify(agentName)},
          title: document.title,
          hasConversationWorkspace: Boolean(document.querySelector(".conversation-workspace-shell")),
          officeVisible: Boolean(document.querySelector(".office-stage-frame")),
          selectedSlotKey:
            document.querySelector(".office-slot.is-selected")?.getAttribute("data-slot-key") ?? null,
          selectedSlotAgentId:
            document.querySelector(".office-slot.is-selected")?.getAttribute("data-agent-id") ?? null,
          selectedSlotClassName:
            document.querySelector(".office-slot.is-selected")?.className ?? null,
          createAgentConfirmationVisible: Boolean(document.querySelector('[aria-label="Create agent confirmation"]')),
          createAgentDialogVisible: Boolean(document.querySelector('[aria-label="Create agent"]')),
          activeElement:
            document.activeElement instanceof HTMLElement
              ? {
                  tag: document.activeElement.tagName,
                  className: document.activeElement.className,
                  text: document.activeElement.textContent?.replace(/\\s+/g, " ").trim().slice(0, 120) ?? ""
                }
              : null,
          bodyPreview: document.body.innerText.replace(/\\s+/g, " ").trim().slice(0, 1200),
          buttonLabels: [...document.querySelectorAll("button")]
            .map((item) => item.textContent?.replace(/\\s+/g, " ").trim() ?? "")
            .filter(Boolean)
            .slice(0, 20),
          thread
        };
      })()`
    );

    await writeFile(
      reportPath,
      JSON.stringify(
        {
          ...report,
          workspaceOpened: false,
          screenshots: {
            office: capturedOfficeScreenshot,
            empty: null,
            thread: null,
            detail: null,
            expanded: null
          }
        },
        null,
        2
      )
    );
    await logStep(`report written without workspace capture: ${reportPath}`);

    console.log(
      JSON.stringify(
        {
          ...report,
          workspaceOpened: false,
          screenshots: {
            office: capturedOfficeScreenshot,
            empty: null,
            thread: null,
            detail: null,
            expanded: null
          },
          reportPath
        },
        null,
        2
      )
    );
    return;
  }

  if (scenario === "attachment") {
    const officeStats = await stat(officeScreenshot);
    await evaluateInWindow(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        await window.codexOffice.conversations.sendMessage({
          agentId: ${JSON.stringify(agentId)},
          threadId: thread.threadId,
          content: ${JSON.stringify(initialPrompt)},
          attachments: [
            {
              id: "automation-attachment-office",
              name: "office-capture.png",
              mimeType: "image/png",
              size: ${officeStats.size},
              source: "local_draft",
              filePath: ${JSON.stringify(officeScreenshot.replace(/\\/g, "/"))}
            }
          ],
          composer: thread.composer
        });
        return true;
      })()`
    );
    await logStep("attachment run dispatched through conversation API");
  } else {
    await evaluateInWindow(
      window,
      `(() => {
        const field = document.querySelector(".conversation-composer-card textarea");
        if (!(field instanceof HTMLTextAreaElement)) {
          throw new Error("Composer textarea not found.");
        }
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
        field.focus();
        descriptor?.set?.call(field, ${JSON.stringify(initialPrompt)});
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`
    );
    await logStep("composer text set");

    await evaluateInWindow(window, clickButtonByExactTextExpression("Run"));
    await logStep("run button clicked");
  }

  if (scenario === "approval") {
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        const pending = await window.codexOffice.permissions.getPendingForAgent(${JSON.stringify(agentId)});
        return thread.runs.length >= 1 && thread.runs[0]?.status === "waiting_user_input" && Boolean(pending) ? true : false;
      })()`,
      60_000
    );
  } else {
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.runs.length >= 1 && thread.totalEntries >= 2 ? true : false;
      })()`,
      60_000
    );
  }
  await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-run-thread"))`, 20_000);
  if (scenario === "approval") {
    approvalUiSnapshot = await evaluateInWindow<Record<string, unknown>>(
      window,
      `(() => ({
        inlineApprovalCards: document.querySelectorAll(".conversation-run-inline-approval-flow").length,
        approvalCards: document.querySelectorAll(".conversation-approval-card").length,
        approvalWorkflowBlocks: document.querySelectorAll('.conversation-workflow-block[data-kind="approval_summary"]').length,
        runThreads: document.querySelectorAll(".conversation-run-thread").length,
        chatExpandedRunCount: document.querySelectorAll('.conversation-run-thread[data-layout="chat-expanded"]').length,
        minimalRunCount: document.querySelectorAll('.conversation-run-thread[data-layout="minimal"]').length,
        reportRunCount: document.querySelectorAll('.conversation-run-thread[data-layout="report"]').length,
        dividerCount: document.querySelectorAll(".conversation-run-divider").length,
        minimalFooterCount: document.querySelectorAll(".conversation-run-minimal-footer").length,
        processLayerCount: document.querySelectorAll('[data-layer="process"]').length,
        runThreadHtmlPreview: document.querySelector(".conversation-run-thread")?.outerHTML.slice(0, 1200) ?? null,
        bodyPreview: document.body.innerText.replace(/\\s+/g, " ").trim().slice(0, 900)
      }))()`
    );
    await logStep("approval ui snapshot: " + JSON.stringify(approvalUiSnapshot));
  } else {
    await waitForWindowValue(
      window,
      `Boolean(document.querySelector(".conversation-run-minimal-footer, .conversation-run-headline-summary, .conversation-run-fact-strip, .conversation-run-visible-entry"))`,
      20_000
    );
    if (scenario === "attachment") {
      await waitForWindowValue(
        window,
        `Boolean(document.querySelector('.conversation-message-attachment-card[data-has-preview="true"] img'))`,
        20_000
      );
    }
  }
  await logStep("thread run visible");
  await setAutomationCaptureMode(window, true);
  capturedThreadScreenshot = await captureWindowToFileIfPossible(window, threadScreenshot, logStep, "thread");
  await setAutomationCaptureMode(window, false);
  threadLayoutSnapshot = await readConversationLayoutSnapshot(window);
  await logStep("thread layout snapshot: " + JSON.stringify(threadLayoutSnapshot));
  await logStep("thread screenshot captured");
  let composerScreenshotCaptured = false;

  let detailVisible = await evaluateInWindow<boolean>(window, `Boolean(document.querySelector('[data-layer="process"]'))`);
  if (!detailVisible) {
    const openedDetail = await evaluateInWindow<boolean>(
      window,
      clickButtonByAnyExactTextExpression(["Details", "Open layers", "Inspect layers", "Open detail", "Detail"])
    );
    if (openedDetail) {
      await waitForWindowValue(window, `Boolean(document.querySelector('[data-layer="process"]'))`, 15_000);
      detailVisible = true;
      await logStep("run detail opened");
    }
  }

  if (detailVisible) {
    await waitForWindowValue(window, `Boolean(document.querySelector('[data-layer="process"]'))`, 15_000);
    await setAutomationCaptureMode(window, true);
    capturedDetailScreenshot = await captureWindowToFileIfPossible(window, detailScreenshot, logStep, "detail");
    await setAutomationCaptureMode(window, false);
    await logStep("detail screenshot captured");
  }

  if (scenario === "attachment" && composerScreenshot) {
    const restoredComposer = await evaluateInWindow<boolean>(
      window,
      clickButtonByAnyExactTextExpression(["Reuse brief", "Restore brief"])
    );
    if (restoredComposer) {
      await waitForWindowValue(
        window,
        `Boolean(document.querySelector('.conversation-attachment-chip img'))`,
        20_000
      );
      await setAutomationCaptureMode(window, true);
      capturedComposerScreenshot = await captureWindowToFileIfPossible(window, composerScreenshot, logStep, "composer");
      await setAutomationCaptureMode(window, false);
      composerScreenshotCaptured = true;
      await logStep("attachment composer screenshot captured");
    }
  }

  const processTimelineVisibleExpression = `Boolean(document.querySelector(".conversation-process-groups, .conversation-process-stream-flat"))`;
  const processToggleVisibleExpression = `(() => {
    const button = document.querySelector('[data-layer="process"] .conversation-run-toggle');
    return button instanceof HTMLButtonElement;
  })()`;
  let processVisible = await evaluateInWindow<boolean>(window, processTimelineVisibleExpression);
  if (!processVisible) {
    try {
      await waitForWindowValue(window, processToggleVisibleExpression, 15_000);
    } catch {
      await logStep("process toggle did not appear before click attempt");
    }
    const openedProcess = await evaluateInWindow<boolean>(
      window,
      `(() => {
        const button = document.querySelector('[data-layer="process"] .conversation-run-toggle');
        if (!(button instanceof HTMLButtonElement)) {
          return false;
        }
        setTimeout(() => button.click(), 0);
        return true;
      })()`
    );
    await logStep(`process toggle click attempted: ${openedProcess ? "clicked" : "missing"}`);
    if (openedProcess) {
      await waitForWindowValue(window, processTimelineVisibleExpression, 15_000);
      processVisible = true;
    }
  }

  if (processVisible) {
    await waitForWindowValue(window, processTimelineVisibleExpression, 15_000);
    await setAutomationCaptureMode(window, true);
    capturedExpandedScreenshot = await captureWindowToFileIfPossible(window, expandedScreenshot, logStep, "expanded process");
    await setAutomationCaptureMode(window, false);
    await logStep("expanded process screenshot captured");
  }

  let controlsCheck: Record<string, unknown> | null = null;
  let controlsActionEvidence: Record<string, unknown> | null = null;
  if (scenario === "controls") {
    const readControlsState = async (label: string): Promise<void> => {
      const snapshot = await evaluateInWindow<Record<string, unknown>>(
        window,
        `(async () => {
          const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
          const controls = [...document.querySelectorAll(".conversation-context-chip")].map((item) => {
            const chipLabel = item.querySelector(".conversation-context-chip-label")?.textContent?.trim() ?? "";
            const select = item.querySelector("select");
            const input = item.querySelector("input");
            return {
              label: chipLabel,
              value: select instanceof HTMLSelectElement ? select.value : input instanceof HTMLInputElement ? input.value : null,
              options: select instanceof HTMLSelectElement ? [...select.options].map((option) => ({ value: option.value, label: option.textContent?.trim() ?? "" })) : null
            };
          });
          return {
            label: ${JSON.stringify(label)},
            threadId: thread.threadId,
            composer: thread.composer,
            controls
          };
        })()`
      );
      await logStep(`controls state ${label}: ${JSON.stringify(snapshot)}`);
    };

    await evaluateInWindow(window, ensureActionMenuOpenExpression("Rename"));
    await waitForWindowValue(
      window,
      `(() => [...document.querySelectorAll("button")].some((item) => item.textContent?.trim() === "Rename"))()`,
      10_000
    );
    await evaluateInWindow(window, clickButtonByExactTextExpression("Rename"));
    await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-thread-title-input"))`, 15_000);
    await evaluateInWindow(
      window,
      `(() => {
        const field = document.querySelector(".conversation-thread-title-input");
        if (!(field instanceof HTMLInputElement)) {
          throw new Error("Thread title input not found.");
        }
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
        field.focus();
        descriptor?.set?.call(field, ${JSON.stringify(controlsRenamedTitle)});
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`
    );
    await evaluateInWindow(window, clickButtonByExactTextExpression("Save"));
    const renamedThreadId = await waitForWindowValue<string>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.title === ${JSON.stringify(controlsRenamedTitle)} ? thread.threadId : false;
      })()`,
      20_000
    );
    await logStep(`thread renamed: ${renamedThreadId}`);

    await evaluateInWindow(window, clickButtonByExactTextExpression("New thread"));
    const controlsThreadId = await waitForWindowValue<string>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId !== ${JSON.stringify(renamedThreadId)} && thread.runs.length === 0 && thread.availableThreads.length >= 2
          ? thread.threadId
          : false;
      })()`,
      20_000
    );
    await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-composer-card textarea"))`, 15_000);
    await logStep(`new thread created: ${controlsThreadId}`);
    const controlsOptionsReady = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(() => {
        const controls = [...document.querySelectorAll(".conversation-context-chip")];
        const workspaceSelect = controls.find((item) => item.getAttribute("data-chip-label") === "Workspace")?.querySelector("select");
        const profileSelect = controls.find((item) => item.getAttribute("data-chip-label") === "Profile")?.querySelector("select");
        const workspaceOptions = workspaceSelect instanceof HTMLSelectElement ? [...workspaceSelect.options].map((option) => option.value) : [];
        const profileOptions = profileSelect instanceof HTMLSelectElement ? [...profileSelect.options].map((option) => option.value) : [];
        return workspaceOptions.includes(${JSON.stringify(controlsWorkspaceId)}) && profileOptions.includes(${JSON.stringify(controlsProfileId)})
          ? {
              workspaceOptions,
              profileOptions
            }
          : false;
      })()`,
      20_000
    );
    await logStep(`controls options ready: ${JSON.stringify(controlsOptionsReady)}`);
    await readControlsState("new-thread");

    await evaluateInWindow(window, setFieldByLabelExpression("Workspace", controlsWorkspaceId, "select"));
    await evaluateInWindow(window, setFieldByLabelExpression("Profile", controlsProfileId, "select"));
    await evaluateInWindow(window, setFieldByLabelExpression("Mode", "attached", "select"));
    await readControlsState("after-workspace-profile-mode");
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.composer.workspaceId === ${JSON.stringify(controlsWorkspaceId)}
          && thread.composer.profileId === ${JSON.stringify(controlsProfileId)}
          && thread.composer.mode === "attached"
          && thread.composer.modelProfile === "5.4 Low"
          && thread.composer.approvalMode === "on_request"
          ? true
          : false;
      })()`,
      20_000
    );
    await evaluateInWindow(window, setFieldByLabelExpression("Mode", "local", "select"));
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId === ${JSON.stringify(controlsThreadId)} && thread.composer.mode === "local" ? true : false;
      })()`,
      20_000
    );
    await evaluateInWindow(window, setFieldByLabelAndCommitExpression("Branch", controlsBranch, "input"));
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId === ${JSON.stringify(controlsThreadId)} && thread.composer.branch === ${JSON.stringify(controlsBranch)} ? true : false;
      })()`,
      20_000
    );
    await evaluateInWindow(window, setFieldByLabelExpression("Model", "codex-balanced", "select"));
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId === ${JSON.stringify(controlsThreadId)} && thread.composer.modelProfile === "codex-balanced" ? true : false;
      })()`,
      20_000
    );
    await evaluateInWindow(window, setFieldByLabelExpression("Approval", "workspace_write", "select"));
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId === ${JSON.stringify(controlsThreadId)} && thread.composer.approvalMode === "workspace_write" ? true : false;
      })()`,
      20_000
    );
    await readControlsState("after-branch-model-approval");
    const controlsComposerSnapshot = await evaluateInWindow<Record<string, unknown>>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        const controls = [...document.querySelectorAll(".conversation-context-chip")].map((item) => {
          const label = item.querySelector(".conversation-context-chip-label")?.textContent?.trim() ?? "";
          const select = item.querySelector("select");
          const input = item.querySelector("input");
          return {
            label,
            value: select instanceof HTMLSelectElement ? select.value : input instanceof HTMLInputElement ? input.value : null
          };
        });
        return {
          threadId: thread.threadId,
          composer: thread.composer,
          controls
        };
      })()`
    );
    await logStep(`composer controls snapshot before wait: ${JSON.stringify(controlsComposerSnapshot)}`);
    const persistedComposer = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId === ${JSON.stringify(controlsThreadId)}
          && thread.composer.workspaceId === ${JSON.stringify(controlsWorkspaceId)}
          && thread.composer.workspaceRoot === ${JSON.stringify(controlsWorkspaceRoot)}
          && thread.composer.profileId === ${JSON.stringify(controlsProfileId)}
          && thread.composer.mode === "local"
          && thread.composer.branch === ${JSON.stringify(controlsBranch)}
          && thread.composer.modelProfile === "codex-balanced"
          && thread.composer.approvalMode === "workspace_write"
          ? thread.composer
          : false;
      })()`,
      20_000
    );
    await logStep(`composer controls persisted: ${JSON.stringify(persistedComposer)}`);

    await evaluateInWindow(
      window,
      `(() => {
        const field = document.querySelector(".conversation-composer-card textarea");
        if (!(field instanceof HTMLTextAreaElement)) {
          throw new Error("Composer textarea not found.");
        }
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
        field.focus();
        descriptor?.set?.call(field, ${JSON.stringify(controlsFollowupPrompt)});
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`
    );
    await evaluateInWindow(window, clickButtonByExactTextExpression("Run"));
    const controlsRunSnapshot = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        const latestRun = thread.runs.at(-1);
        return thread.threadId === ${JSON.stringify(controlsThreadId)}
          && thread.totalEntries >= 2
          && latestRun
          && latestRun.status === "completed"
          && latestRun.context.workspaceId === ${JSON.stringify(controlsWorkspaceId)}
          && latestRun.context.profileId === ${JSON.stringify(controlsProfileId)}
          && latestRun.context.branch === ${JSON.stringify(controlsBranch)}
          && latestRun.context.modelProfile === "codex-balanced"
          && latestRun.context.approvalMode === "workspace_write"
          ? {
              threadId: thread.threadId,
              runCount: thread.runs.length,
              totalEntries: thread.totalEntries,
              latestRunId: latestRun.id,
              latestRunContext: latestRun.context
            }
          : false;
      })()`,
      60_000
    );
    await logStep(`controls follow-up run captured: ${JSON.stringify(controlsRunSnapshot)}`);
    await evaluateInWindow(window, ensureActionMenuOpenExpression("Archive"));
    const archiveReady = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Archive");
        return button instanceof HTMLButtonElement && !button.disabled
          ? {
              label: button.textContent?.trim() ?? "",
              disabled: button.disabled
            }
          : false;
      })()`,
      20_000
    );
    await logStep(`archive button ready: ${JSON.stringify(archiveReady)}`);

    await evaluateInWindow(window, clickButtonByExactTextExpression("Archive"));
    const archivedState = await waitForWindowValue<{
      currentThreadId: string;
      archivedThreadTitle: string;
      archivedCount: number;
    }>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        const archivedThread = thread.availableThreads.find((item) => item.id === ${JSON.stringify(controlsThreadId)}) ?? null;
        const archivedCount = thread.availableThreads.filter((item) => item.archived).length;
        return thread.threadId !== ${JSON.stringify(controlsThreadId)}
          && archivedThread
          && archivedThread.archived
          ? {
              currentThreadId: thread.threadId,
              archivedThreadTitle: archivedThread.title,
              archivedCount
            }
          : false;
      })()`,
      20_000
    );
    await logStep(`thread archived: ${JSON.stringify(archivedState)}`);
    await evaluateInWindow(
      window,
      `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => {
          const label = item.textContent?.trim() ?? "";
          return label === "History" || label === "Threads" || label.startsWith("Threads ");
        });
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error("History button not found.");
        }
        button.click();
        return true;
      })()`
    );
    await waitForWindowValue(
      window,
      `(() => document.querySelector('[aria-label="Thread history"]')?.getAttribute("data-open") === "true")()`,
      10_000
    );
    await evaluateInWindow(
      window,
      `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => {
          const label = item.textContent?.trim() ?? "";
          return label === "Archived" || label.startsWith("Archived ");
        });
        if (!(button instanceof HTMLButtonElement)) {
          throw new Error("Archived button not found.");
        }
        button.click();
        return true;
      })()`
    );
    await evaluateInWindow(
      window,
      `(() => {
        const cards = [...document.querySelectorAll(".conversation-thread-list-card")];
        const card = cards.find((item) => {
          const title = item.querySelector("strong")?.textContent?.trim() ?? "";
          return title === ${JSON.stringify(archivedState.archivedThreadTitle)} && item.getAttribute("data-active") !== "true";
        });
        if (!(card instanceof HTMLElement)) {
          throw new Error("Archived thread card not found.");
        }
        card.click();
        return true;
      })()`
    );
    await waitForWindowValue(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        const current = thread.availableThreads.find((item) => item.id === thread.threadId) ?? null;
        return thread.threadId === ${JSON.stringify(controlsThreadId)} && current?.archived ? true : false;
      })()`,
      20_000
    );
    const restoreLabelSnapshotBeforeMenu = await evaluateInWindow<Record<string, unknown>>(
      window,
      `(() => {
        const normalize = (value) => value.replace(/\\s+/g, " ").trim();
        return {
          buttons: [...document.querySelectorAll("button")].map((item) => normalize(item.textContent ?? "")).filter((label) => label.length > 0)
        };
      })()`
    );
    await logStep(`restore labels before menu: ${JSON.stringify(restoreLabelSnapshotBeforeMenu)}`);
    await evaluateInWindow(window, ensureActionMenuOpenExpression("Restore"));
    const restoreLabelSnapshotAfterMenu = await evaluateInWindow<Record<string, unknown>>(
      window,
      `(() => {
        const normalize = (value) => value.replace(/\\s+/g, " ").trim();
        return {
          buttons: [...document.querySelectorAll("button")].map((item) => normalize(item.textContent ?? "")).filter((label) => label.length > 0)
        };
      })()`
    );
    await logStep(`restore labels after menu: ${JSON.stringify(restoreLabelSnapshotAfterMenu)}`);
    await waitForWindowValue(
      window,
      `(() => [...document.querySelectorAll("button")].some((item) => item.textContent?.trim() === "Restore"))()`,
      10_000
    );
    const restoreReady = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Restore");
        return button instanceof HTMLButtonElement && !button.disabled
          ? {
              label: button.textContent?.trim() ?? "",
              disabled: button.disabled
            }
          : false;
      })()`,
      10_000
    );
    await evaluateInWindow(window, clickButtonByExactTextExpression("Restore"));
    const restoredState = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        const current = thread.availableThreads.find((item) => item.id === thread.threadId) ?? null;
        return current && !current.archived
          ? {
              threadId: thread.threadId,
              archived: current.archived,
              archiveButtonVisible: [...document.querySelectorAll("button")].some((item) => item.textContent?.trim() === "Archive")
            }
          : false;
      })()`,
      20_000
    );
    await logStep("thread restored");

    const backToOfficeReady = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => {
          const label = item.textContent?.trim() ?? "";
          return label === "Office" || label === "Back to office";
        });
        return button instanceof HTMLButtonElement && !button.disabled
          ? {
              label: button.textContent?.trim() ?? "",
              disabled: button.disabled
            }
          : false;
      })()`,
      10_000
    );
    await evaluateInWindow(window, clickButtonByAnyExactTextExpression(["Office", "Back to office"]));
    await waitForWindowValue(window, `Boolean(document.querySelector(".office-stage-frame"))`, 20_000);
    const returnedToOfficeState = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(() => {
        const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]');
        return slot?.getAttribute("data-seat-state") === "occupied"
          ? {
              officeVisible: Boolean(document.querySelector(".office-stage-frame")),
              workspaceVisible: Boolean(document.querySelector(".conversation-workspace-shell")),
              selectedSlotKey: document.querySelector(".office-slot.is-selected")?.getAttribute("data-slot-key") ?? null,
              targetSeatState: slot?.getAttribute("data-seat-state") ?? null
            }
          : false;
      })()`,
      20_000
    );
    if (returnedOfficeScreenshot) {
      await setAutomationCaptureMode(window, true);
      capturedReturnedOfficeScreenshot = await captureWindowToFileIfPossible(window, returnedOfficeScreenshot, logStep, "returned office");
      await setAutomationCaptureMode(window, false);
      await logStep("returned office screenshot captured");
    }
    await logStep("returned to office");

    await evaluateInWindow(window, clickSlotExpression(targetSlotKey));
    await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-workspace-shell"))`, 20_000);
    const reopenedThreadId = await waitForWindowValue<string>(
      window,
      `(async () => {
        const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
        return thread.threadId === ${JSON.stringify(controlsThreadId)} ? thread.threadId : false;
      })()`,
      20_000
    );
    await logStep(`workspace reopened on thread: ${reopenedThreadId}`);

    await evaluateInWindow(window, ensureActionMenuOpenExpression("Remove"));
    const removeReady = await waitForWindowValue<Record<string, unknown>>(
      window,
      `(() => {
        const button = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Remove");
        return button instanceof HTMLButtonElement && !button.disabled
          ? {
              label: button.textContent?.trim() ?? "",
              disabled: button.disabled
            }
          : false;
      })()`,
      10_000
    );

    controlsActionEvidence = {
      archiveReady,
      archivedState,
      restoreReady,
      restoredState,
      backToOfficeReady,
      returnedToOfficeState,
      removeReady
    };

    controlsCheck = {
      renamedThreadId,
      controlsThreadId,
      reopenedThreadId,
      persistedComposer,
      controlsRunSnapshot,
      actionEvidence: controlsActionEvidence
    };
  }

  const report = await evaluateInWindow<Record<string, unknown>>(
    window,
    `(async () => {
      const thread = await window.codexOffice.conversations.getThread(${JSON.stringify(agentId)});
      return {
        agentId: ${JSON.stringify(agentId)},
        agentName: ${JSON.stringify(agentName)},
        title: document.title,
        hasConversationWorkspace: Boolean(document.querySelector(".conversation-workspace-shell")),
        officeHiddenInFocus: !document.querySelector(".office-stage-frame"),
        threadMapCards: document.querySelectorAll(".conversation-thread-map-card").length,
        runThreads: document.querySelectorAll(".conversation-run-thread").length,
        scenario: ${JSON.stringify(scenario)},
        inlineApprovalCards: document.querySelectorAll(".conversation-run-inline-approval-flow").length,
        processGroups: document.querySelectorAll(".conversation-process-outline-item, .conversation-process-stage-stream").length,
        workflowBlocks: document.querySelectorAll(".conversation-workflow-block").length,
        summaryFacts: document.querySelectorAll('[data-layer="summary-preview"] .conversation-run-summary-fact, [data-layer="summary"] .conversation-run-summary-fact, .conversation-run-fact-strip .conversation-run-summary-fact, .conversation-run-minimal-facts span').length,
        uiErrors: window.__codexUiErrors ?? [],
        approvalUiSnapshot: ${JSON.stringify(null)},
        threadLayoutSnapshot: ${JSON.stringify(null)},
        thread
      };
    })()`
  );

  let cleanupState: Record<string, unknown> | null = null;
  if (scenario === "controls") {
    await evaluateInWindow(window, ensureActionMenuOpenExpression("Remove"));
    await evaluateInWindow(window, clickButtonByExactTextExpression("Remove"));
    await waitForWindowValue(window, `Boolean(document.querySelector(".office-stage-frame"))`, 20_000);
    await waitForWindowValue(
      window,
      `(() => {
        const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]');
        return slot?.getAttribute("data-seat-state") === "available" ? true : false;
      })()`,
      20_000
    );
    if (cleanupScreenshot) {
      await setAutomationCaptureMode(window, true);
      capturedCleanupScreenshot = await captureWindowToFileIfPossible(window, cleanupScreenshot, logStep, "cleanup");
      await setAutomationCaptureMode(window, false);
      await logStep("cleanup screenshot captured");
    }
    await logStep("controls scenario agent removed");
    cleanupState = await evaluateInWindow<Record<string, unknown>>(
      window,
      `(() => ({
        title: document.title,
        officeVisible: Boolean(document.querySelector(".office-stage-frame")),
        hasConversationWorkspace: Boolean(document.querySelector(".conversation-workspace-shell")),
        selectedSlotKey: document.querySelector(".office-slot.is-selected")?.getAttribute("data-slot-key") ?? null,
        targetSeatState: document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]')?.getAttribute("data-seat-state") ?? null
      }))()`
    );
    if (controlsActionEvidence) {
      controlsActionEvidence = {
        ...controlsActionEvidence,
        cleanupScreenshotCaptured: Boolean(capturedCleanupScreenshot),
        cleanupState
      };
    }
    if (controlsCheck && controlsActionEvidence) {
      controlsCheck = {
        ...controlsCheck,
        actionEvidence: controlsActionEvidence
      };
    }
  }

  const uiErrors = await evaluateInWindow<string[]>(window, `window.__codexUiErrors ?? []`);

  await writeFile(
    reportPath,
    JSON.stringify(
      {
        ...report,
        runtimeKind: automationRuntimeKind,
        approvalUiSnapshot,
        threadLayoutSnapshot,
        controlsCheck,
        cleanupState,
        workspaceOpened: true,
          screenshots: {
            office: capturedOfficeScreenshot,
            empty: capturedEmptyScreenshot,
            thread: capturedThreadScreenshot,
            detail: capturedDetailScreenshot,
            expanded: processVisible ? capturedExpandedScreenshot : null,
            composer: composerScreenshotCaptured ? capturedComposerScreenshot : null,
            returnedOffice: capturedReturnedOfficeScreenshot,
            cleanup: capturedCleanupScreenshot
          },
          uiErrors
        },
        null,
      2
    )
  );
  await logStep(`report written: ${reportPath}`);

  console.log(
    JSON.stringify(
      {
        ...report,
        runtimeKind: automationRuntimeKind,
        approvalUiSnapshot,
        threadLayoutSnapshot,
        controlsCheck,
        cleanupState,
        workspaceOpened: true,
          screenshots: {
            office: capturedOfficeScreenshot,
            empty: capturedEmptyScreenshot,
            thread: capturedThreadScreenshot,
            detail: capturedDetailScreenshot,
            expanded: processVisible ? capturedExpandedScreenshot : null,
            composer: composerScreenshotCaptured ? capturedComposerScreenshot : null,
            returnedOffice: capturedReturnedOfficeScreenshot,
            cleanup: capturedCleanupScreenshot
          },
          uiErrors,
          reportPath
        },
      null,
      2
    )
  );
};

const runOfficeWorkstationAutomation = async (window: BrowserWindow, handlers: IpcHandlers): Promise<void> => {
  const outDir = automationOutDir?.trim() || join(process.cwd(), "verification");
  await mkdir(outDir, { recursive: true });

  const timestamp = Date.now();
  const agentName = `Office QA ${timestamp}`;
  const targetSlotKey = "ws-01";
  const workspacePath = process.cwd().replace(/\\/g, "/");
  const officeScreenshot = join(outDir, "office-workstation-office.png");
  const startupScreenshot = join(outDir, "office-workstation-startup.png");
  const confirmScreenshot = join(outDir, "office-workstation-confirm.png");
  const createDialogScreenshot = join(outDir, "office-workstation-create-dialog.png");
  const workspaceScreenshot = join(outDir, "office-workstation-workspace.png");
  const workspaceControlsScreenshot = join(outDir, "office-workstation-controls.png");
  const deletedScreenshot = join(outDir, "office-workstation-deleted.png");
  let capturedOfficeScreenshot: string | null = null;
  let capturedStartupScreenshot: string | null = null;
  let capturedConfirmScreenshot: string | null = null;
  let capturedCreateDialogScreenshot: string | null = null;
  let capturedWorkspaceScreenshot: string | null = null;
  let capturedWorkspaceControlsScreenshot: string | null = null;
  let capturedDeletedScreenshot: string | null = null;
  const reportPath = join(outDir, "office-workstation-report.json");
  const automationLogPath = join(outDir, "office-workstation-automation.log");
  const logStep = async (message: string): Promise<void> => {
    await appendFile(automationLogPath, `[${new Date().toISOString()}] ${message}\n`, "utf8");
  };

  await writeFile(automationLogPath, "", "utf8");
  window.webContents.on("render-process-gone", (_event, details) => {
    void logStep(`render-process-gone: ${details.reason}`);
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    void logStep(`console:${level}: ${message} (${sourceId}:${line})`);
  });
  await logStep("office automation start");

  await waitForWindowLoad(window);
  const startupSnapshot = await readRendererSnapshot(window);
  await logStep(`startup snapshot: ${JSON.stringify(startupSnapshot)}`);
  capturedStartupScreenshot = await captureWindowToFileIfPossible(window, startupScreenshot, logStep, "startup");
  try {
    await waitForWindowValue(window, `Boolean(document.querySelector(".office-stage-frame"))`, 20_000);
  } catch (error) {
    const failureSnapshot = await readRendererSnapshot(window);
    await logStep(`office stage wait failed: ${JSON.stringify(failureSnapshot)}`);
    await captureWindowToFileIfPossible(window, join(outDir, "office-workstation-stage-timeout.png"), logStep, "office-stage-timeout");
    throw error;
  }
  await evaluateInWindow(window, installUiErrorHooksExpression());
  await logStep("office stage visible and hooks installed");

  await logStep("fresh automation user data ready");

  await logStep("collecting office shell check");
  const shellCheck = await evaluateInWindow<Record<string, unknown>>(
    window,
    `(() => ({
      officeMenu: Boolean(document.querySelector(".office-menu-button")),
      officeVisible: Boolean(document.querySelector(".office-stage-frame")),
      conversationHidden: !document.querySelector(".conversation-workspace-shell"),
      sidebarRemoved: !document.querySelector(".sidebar"),
      rosterRemoved: !document.querySelector(".office-roster")
    }))()`
  );
  await logStep(`office shell check collected: ${JSON.stringify(shellCheck)}`);

  await logStep("collecting initial office snapshot");
  const initialSnapshot = await handlers.officeGetSnapshot();
  await logStep("initial office snapshot collected");
  capturedOfficeScreenshot = await captureWindowToFileIfPossible(window, officeScreenshot, logStep, "office");
  await logStep("initial office screenshot captured");

  await logStep(`target slot selected: ${targetSlotKey}`);

  await evaluateInWindow(window, clickSlotExpression(targetSlotKey));
  await waitForWindowValue(window, `Boolean(document.querySelector('[aria-label="Create agent confirmation"]'))`, 15_000);
  capturedConfirmScreenshot = await captureWindowToFileIfPossible(window, confirmScreenshot, logStep, "confirm");
  await logStep("create confirmation opened");

  await evaluateInWindow(window, clickButtonByExactTextExpression("Set Up Workspace"));
  await waitForWindowValue(window, `Boolean(document.querySelector('[aria-label="Create agent"]'))`, 20_000);
  await logStep("create dialog opened");

  await evaluateInWindow(window, setFieldByLabelExpression("Agent name", agentName));
  await evaluateInWindow(window, setFieldByLabelExpression("Role", "Codex Agent"));
  await evaluateInWindow(window, setFieldByLabelExpression("Working directory", workspacePath));
  await evaluateInWindow(window, setFieldByLabelExpression("Permission mode", "readonly", "select"));
  await evaluateInWindow(
    window,
    setFieldByLabelExpression("Initial brief", "Reply with the exact phrase: office qa run complete.", "textarea")
  );
  capturedCreateDialogScreenshot = await captureWindowToFileIfPossible(
    window,
    createDialogScreenshot,
    logStep,
    "create dialog"
  );
  await logStep("create dialog filled");

  await evaluateInWindow(window, clickButtonByExactTextExpression("Create Agent"));
  await waitForWindowValue(window, `!document.querySelector('[aria-label="Create agent"]')`, 20_000);
  await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-workspace-shell"))`, 20_000);
  await waitForWindowValue(window, `Boolean(document.querySelector(".conversation-composer-card textarea"))`, 20_000);
  capturedWorkspaceScreenshot = await captureWindowToFileIfPossible(window, workspaceScreenshot, logStep, "workspace");
  await logStep("conversation workspace opened after create");

  const workspaceCheck = await evaluateInWindow<Record<string, unknown>>(
    window,
    `(() => ({
      officeHiddenInFocus: !document.querySelector(".office-stage-frame"),
      composerPresent: Boolean(document.querySelector(".conversation-composer-card textarea")),
      contextBarPresent: Boolean(document.querySelector(".conversation-context-bar")),
      removeButtonPresent: [...document.querySelectorAll("button")].some((item) => {
        const label = item.textContent?.trim() ?? "";
        return label === "Remove" || label === "More";
      }),
      runButtonPresent: [...document.querySelectorAll("button")].some((item) => item.textContent?.trim() === "Run"),
      backButtonPresent: [...document.querySelectorAll("button")].some((item) => {
        const label = item.textContent?.trim() ?? "";
        return label === "Office" || label === "Back to office";
      })
    }))()`
  );

  await evaluateInWindow(
    window,
    `(() => {
      const field = document.querySelector(".conversation-composer-card textarea");
      if (!(field instanceof HTMLTextAreaElement)) {
        throw new Error("Composer textarea not found.");
      }
      const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      field.focus();
      descriptor?.set?.call(field, ${JSON.stringify("Reply with the exact phrase: office qa run complete.")});
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    })()`
  );
  await waitForWindowValue(
    window,
    `(() => {
      const runButton = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Run");
      return runButton instanceof HTMLButtonElement && !runButton.disabled;
    })()`,
    20_000
  );
  await evaluateInWindow(window, clickButtonByExactTextExpression("Goal"));
  await waitForWindowValue(window, `document.body.innerText.includes("Goal entry slot reserved")`, 20_000);
  await evaluateInWindow(window, clickButtonByExactTextExpression("Dismiss"));
  await waitForWindowValue(window, `!document.body.innerText.includes("Goal entry slot reserved")`, 20_000);
  await evaluateInWindow(window, clickButtonByExactTextExpression("Voice"));
  await waitForWindowValue(window, `document.body.innerText.includes("Voice entry slot reserved")`, 20_000);
  await evaluateInWindow(window, clickButtonByExactTextExpression("Dismiss"));
  await waitForWindowValue(window, `!document.body.innerText.includes("Voice entry slot reserved")`, 20_000);
  await evaluateInWindow(
    window,
    `(() => {
      const button = [...document.querySelectorAll("button")].find((item) => {
        const label = item.textContent?.replace(/\\s+/g, " ").trim() ?? "";
        return label === "History" || label === "Show";
      });
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error("History button not found.");
      }
      button.click();
      return true;
    })()`
  );
  await waitForWindowValue(window, `document.querySelectorAll(".conversation-thread-list-card").length > 0`, 20_000);
  capturedWorkspaceControlsScreenshot = await captureWindowToFileIfPossible(
    window,
    workspaceControlsScreenshot,
    logStep,
    "workspace controls"
  );
  await logStep("workspace controls verified");

  const interactionCheck = await evaluateInWindow<Record<string, unknown>>(
    window,
    `(() => {
      const normalize = (value) => value.replace(/\\s+/g, " ").trim();
      const buttonState = (label) => {
        const button = [...document.querySelectorAll("button")].find((item) => normalize(item.textContent ?? "") === label);
        return button instanceof HTMLButtonElement ? { present: true, disabled: button.disabled } : { present: false, disabled: null };
      };
      const textarea = document.querySelector(".conversation-composer-card textarea");
      return {
        draftAccepted: textarea instanceof HTMLTextAreaElement ? textarea.value.includes("office qa run complete") : false,
        runButton: buttonState("Run"),
        goalButton: buttonState("Goal"),
        voiceButton: buttonState("Voice"),
        historyButton: buttonState("History"),
        showButton: buttonState("Show"),
        threadHistoryCards: document.querySelectorAll(".conversation-thread-list-card").length,
        threadHistoryOpen: document.querySelector('[aria-label="Thread history"]')?.getAttribute("data-open") === "true",
        threadHistoryCopyVisible: Boolean(document.querySelector('[aria-label="Thread history"] .conversation-thread-utility-copy span'))
      };
    })()`
  );

  await waitForWindowValue(
    window,
    `(() => {
      const normalize = (value) => value.replace(/\\s+/g, " ").trim();
      const buttons = [...document.querySelectorAll("button")];
      const removeButton = buttons.find((item) => normalize(item.textContent ?? "") === "Remove");
      if (removeButton instanceof HTMLButtonElement) {
        removeButton.click();
        return true;
      }
      const moreButton = buttons.find((item) => normalize(item.textContent ?? "") === "More");
      if (moreButton instanceof HTMLButtonElement && moreButton.getAttribute("aria-expanded") !== "true") {
        moreButton.click();
      }
      return false;
    })()`,
    20_000
  );
  await waitForWindowValue(window, `Boolean(document.querySelector(".office-stage-frame"))`, 20_000);
  await waitForWindowValue(
    window,
    `(() => {
      const slot = document.querySelector('.office-slot[data-slot-key=${JSON.stringify(targetSlotKey)}]');
      return slot?.getAttribute("data-seat-state") === "available" ? true : false;
    })()`,
    20_000
  );
  capturedDeletedScreenshot = await captureWindowToFileIfPossible(window, deletedScreenshot, logStep, "deleted");
  await logStep("agent deleted and office restored");

  const finalSnapshot = await handlers.officeGetSnapshot();
  const uiErrors = await evaluateInWindow<string[]>(window, `window.__codexUiErrors ?? []`);

  const report = {
    agentName,
    targetSlotKey,
    shellCheck,
    initialSnapshot,
    workspaceCheck,
    interactionCheck,
    finalSnapshot,
    uiErrors,
    screenshots: {
      startup: capturedStartupScreenshot,
      office: capturedOfficeScreenshot,
      confirm: capturedConfirmScreenshot,
      createDialog: capturedCreateDialogScreenshot,
      workspace: capturedWorkspaceScreenshot,
      workspaceControls: capturedWorkspaceControlsScreenshot,
      deleted: capturedDeletedScreenshot
    }
  };

  await writeFile(reportPath, JSON.stringify(report, null, 2));
  await logStep(`report written: ${reportPath}`);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
};

const runAutomationIfRequested = (window: BrowserWindow, handlers: IpcHandlers): void => {
  if (automationMode !== "capture_conversation_workspace" && automationMode !== "verify_office_workstation_flow") {
    return;
  }

  void (async () => {
    try {
      if (automationMode === "verify_office_workstation_flow") {
        await runOfficeWorkstationAutomation(window, handlers);
      } else {
        await runConversationWorkspaceAutomation(window);
      }
      app.exit(0);
    } catch (error) {
      const outDir = automationOutDir?.trim() || join(process.cwd(), "verification");
      const errorFileName =
        automationMode === "verify_office_workstation_flow" ? "office-workstation-error.json" : "conversation-focus-error.json";
      await mkdir(outDir, { recursive: true });
      await writeFile(
        join(outDir, errorFileName),
        JSON.stringify(
          {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack ?? null : null
          },
          null,
          2
        )
      );
      console.error(error);
      app.exit(1);
    }
  })();
};

const appendStartupTrace = async (message: string): Promise<void> => {
  try {
    const logDir = join(app.getPath("userData"), "logs");
    await mkdir(logDir, { recursive: true });
    await appendFile(join(logDir, "startup-trace.log"), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // Best-effort logging only.
  }
};

process.on("uncaughtException", (error) => {
  void appendStartupTrace(`process:uncaughtException:${formatErrorForTrace(error)}`);
});

process.on("unhandledRejection", (reason) => {
  void appendStartupTrace(`process:unhandledRejection:${formatErrorForTrace(reason)}`);
});

const reportStartupFailure = async (error: unknown): Promise<void> => {
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);

  try {
    const logDir = join(app.getPath("userData"), "logs");
    await mkdir(logDir, { recursive: true });
    await appendFile(join(logDir, "startup-error.log"), `[${new Date().toISOString()}]\n${message}\n\n`);
  } catch {
    // Best-effort logging only.
  }

  dialog.showErrorBox("Local Codex Office failed to start", message);
};

void app.whenReady().then(async () => {
  try {
    await appendStartupTrace("whenReady");
    const localCodex = inspectLocalCodexAvailability();
    await appendStartupTrace(`localCodex:${localCodex.status}`);
    const runtimeRegistry = createDefaultRuntimeRegistry({
      codexExecutablePath: localCodex.launchPath ?? localCodex.sourcePath ?? undefined,
      includeCodexCli: automationMode ? false : undefined
    });
    await appendStartupTrace("runtimeRegistry:ready");

    const client = await createMigratedDatabaseClient({
      filePath: join(app.getPath("userData"), "local-codex-office.sqlite")
    });
    await appendStartupTrace("database:ready");

    const handlers = createIpcHandlers({
      client,
      runtimeRegistry,
      getAppInfo: (): AppInfo => ({
        name: "Local Codex Office",
        version: app.getVersion(),
        mode: isDevelopment ? "development" : "production",
        localCodex
      }),
      publishRuntimeEvent: (event) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.webContents.send(IPC_CHANNELS.runtimeEvent, event);
        }
      }
    });
    await appendStartupTrace("ipcHandlers:ready");
    registerIpcHandlers(handlers);
    await appendStartupTrace("ipcHandlers:registered");

    const createdWindow = createMainWindow();
    await appendStartupTrace("mainWindow:created");
    runAutomationIfRequested(createdWindow, handlers);
    await appendStartupTrace("automation:checked");

    app.on("activate", () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.show();
        mainWindow.focus();
        return;
      }

      createMainWindow();
    });
  } catch (error) {
    await reportStartupFailure(error);
    app.exit(1);
  }
});

app.on("window-all-closed", () => {
  void appendStartupTrace("app:window-all-closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void appendStartupTrace("app:before-quit");
});

app.on("will-quit", () => {
  void appendStartupTrace("app:will-quit");
});

app.on("quit", (_event, exitCode) => {
  void appendStartupTrace(`app:quit:${exitCode}`);
});
