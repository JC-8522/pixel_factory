import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import type { AppInfo } from "../shared/types/app";
import { createMigratedDatabaseClient } from "./db/client";
import { createIpcHandlers } from "./ipc/createIpcHandlers";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";
import { IPC_CHANNELS } from "../shared/ipc";

const isDevelopment = !app.isPackaged;

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
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

  mainWindow.focus();

  if (isDevelopment) {
    mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      console.error(`[renderer:gone] ${details.reason}`);
    });
  }

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  if (isDevelopment) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  return mainWindow;
};

void app.whenReady().then(async () => {
  const client = await createMigratedDatabaseClient({
    filePath: join(app.getPath("userData"), "local-codex-office.sqlite")
  });

  registerIpcHandlers(
    createIpcHandlers({
      client,
      getAppInfo: (): AppInfo => ({
        name: "Local Codex Office",
        version: app.getVersion(),
        mode: isDevelopment ? "development" : "production"
      }),
      publishRuntimeEvent: (event) => {
        for (const window of BrowserWindow.getAllWindows()) {
          window.webContents.send(IPC_CHANNELS.runtimeEvent, event);
        }
      }
    })
  );

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
