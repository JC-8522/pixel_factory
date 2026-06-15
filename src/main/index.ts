import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import type { AppInfo } from "../shared/types/app";
import { createMigratedDatabaseClient } from "./db/client";
import { createIpcHandlers } from "./ipc/createIpcHandlers";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";

const isDevelopment = !app.isPackaged;

const createMainWindow = (): BrowserWindow => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: "Local Codex Office",
    backgroundColor: "#101417",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

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
      })
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
