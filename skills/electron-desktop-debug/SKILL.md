---
name: electron-desktop-debug
description: Debug and fully verify Electron desktop applications, especially Electron Vite, React, PixiJS, or preload/IPC apps. Use when an Electron app shows a black screen, fails to display a visible window, has renderer crashes, preload path issues, IPC errors, hidden/stale Electron processes, local dev server problems, or when Codex must prove the desktop app actually runs with tests, build logs, runtime logs, and UI screenshots.
---

# Electron Desktop Debug

## Overview

Use this skill to move from "the app built" to "the desktop product is actually usable." Treat visual verification as required when the user asks whether the UI meets expectations or when changes affect Electron main, preload, renderer, IPC, canvas rendering, or app startup.

## Workflow

1. Inspect the project shape first.
   - Read `package.json`, Electron config, main process entry, preload entry, and renderer root.
   - Identify the real scripts for `dev`, `build`, `test`, `lint`, and `typecheck`.
   - Check whether the app is Electron Vite, plain Electron, Electron Forge, or another setup.

2. Clean stale runtime state before a fresh run.
   - Check existing `electron` and `node` processes.
   - Stop only stale verification/dev processes that belong to the current project.
   - Do not kill unrelated user processes unless the user explicitly approves it.

3. Run static and unit verification.
   - Run typecheck, lint, tests, and production build using the project's own scripts or direct local binaries.
   - If a command fails because of sandbox filesystem or network restrictions, rerun it with escalation rather than treating it as a product failure.
   - Record exact pass/fail outcomes and distinguish code failures from environment restrictions.

4. Start the app from a clean dev run.
   - Prefer the project's normal dev command.
   - Capture stdout/stderr to project-local ignored files such as `out/*.log` when possible.
   - Confirm main/preload/renderer build logs and renderer connection messages.
   - Search logs for `Uncaught`, `Error invoking`, `renderer:gone`, `crash`, failed preload loads, and IPC errors.

5. Verify a visible UI, not only a running process.
   - Capture or inspect a real app window screenshot when the environment allows it.
   - Confirm the first screen has meaningful UI: navigation, primary workspace, expected panels, and no black/blank renderer.
   - If a screenshot cannot be captured because of desktop/session restrictions, say so clearly and fall back to logs plus any prior captured window evidence. Do not claim full visual verification without a visual signal.

## Electron Black Screen Checks

Check these common causes early:

- Preload output mismatch: Electron Vite often outputs `out/preload/index.mjs`, while older code may point to `../preload/index.js`.
- Hidden window flow: `show: false` plus `ready-to-show` can leave users with an invisible window during failures. For MVP debugging, prefer `show: true`, call `focus()`, and add renderer crash logging.
- Renderer crash: add development listeners for `webContents` console messages and `render-process-gone`.
- React StrictMode lifecycle: canvas libraries such as PixiJS can destroy an app before async initialization completes. Guard cleanup with an initialized flag.
- External or detected local processes: if the app discovers existing processes that are not persisted or writable, make their UI read-only and prevent drag/chat actions that assume a writable agent record.

## Runtime Log Pattern

When debugging Electron startup, add temporary or permanent development-only logging in the main process:

```ts
if (isDevelopment) {
  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer:gone] ${details.reason}`);
  });
}
```

Use this to connect renderer UI failures back to terminal logs.

## Windows Verification Notes

- PowerShell `MainWindowHandle` can be `0` for Electron even when windows exist; use Win32 window enumeration when needed.
- Elevated processes may run in a session where tools cannot see the visible desktop window. Treat this as an environment limitation, not proof of UI failure.
- `Start-Process` can fail in some managed Windows environments with duplicate `Path`/`PATH` environment keys. Use an alternate launch path or escalation if needed.
- DevTools `Autofill.enable` / `Autofill.setAddresses` errors and Electron development CSP warnings are usually non-blocking; do not confuse them with app failures.

## Reporting Standard

Final reports must include:

- What was fixed or verified.
- Exact verification commands and outcomes.
- Whether the app was visually inspected with a screenshot.
- Any limits of the automation environment.
- Whether the app is still running or was cleaned up.
- Current git status if the user asked for commit, PR, or merge readiness.

If full visual control was blocked, phrase it plainly: "I verified build/tests/runtime logs and inspected an available screenshot, but the current automation environment could not control the live desktop window."
