# Windows Setup

This document explains how to make Local Codex Office usable on a fresh Windows machine.

## Required Software

1. Install the Codex desktop app
2. Launch Codex once
3. Clone this repository
4. Install project dependencies

## Why Codex Must Be Installed

The current MVP does not bundle its own agent runtime. It launches the machine's local Codex executable and tracks the resulting session inside the desktop office UI.

## Startup Readiness States

The app reports one of three states in the sidebar:

- `Local Codex ready`
  - The app found a local Codex executable and prepared a runnable launch path
- `Local Codex setup required`
  - Codex is missing or not yet discoverable
- `Blocked`
  - Codex was detected, but the app could not prepare a runnable local executable

## If The App Says Codex Is Missing

1. Install the Codex desktop app
2. Open Codex once
3. Close and reopen Local Codex Office

## If The App Says Codex Is Blocked

1. Reopen Codex
2. Restart Local Codex Office
3. Confirm Windows allows local process execution from app data
4. Reinstall Codex if the problem persists

## Development Run Command

```powershell
cd C:\Users\Administrator\Desktop\repo\pixel_factory
C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\electron-vite\bin\electron-vite.js dev
```

## Human Validation Flow

Use this flow when validating a machine:

1. Open the app
2. Confirm `Local Codex ready`
3. Create one agent with a valid working directory
4. Confirm the agent appears in the office
5. Confirm the selected agent enters a running state instead of failing on creation
