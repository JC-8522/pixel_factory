# Local Codex Office

Local Codex Office is a Windows-first desktop workspace for a solo manager to create and supervise local Codex agents.

## Current MVP

- Human manager workspace
- Create local agents
- Assign role, working directory, skills, and initial task
- View agent detail and token usage records
- Machine readiness check for local Codex availability

## Machine Requirements

- Windows 11
- Codex desktop app installed on the machine
- Codex opened at least once so the local executable can be discovered
- Node dependencies already installed in this repo

## Run In Development

Open PowerShell and start the app from the repo root:

```powershell
cd C:\Users\Administrator\Desktop\repo\pixel_factory
C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\electron-vite\bin\electron-vite.js dev
```

Optional validation commands:

```powershell
C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\typescript\bin\tsc --noEmit
C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\eslint\bin\eslint.js .
C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe .\node_modules\vitest\vitest.mjs run --config .\vitest.config.mjs
```

## First-Run Checklist

When the app opens:

1. Confirm the sidebar shows `Local Codex ready`
2. Open `Office`
3. Click `Create Agent`
4. Fill in agent name, role, working directory, and initial task
5. Confirm the agent appears in the office and enters a running state

If the app shows `Local Codex setup required`, follow the setup steps in [docs/setup_windows.md](C:/Users/Administrator/Desktop/repo/pixel_factory/docs/setup_windows.md).

## Packaging Status

This repo can be used locally today, but packaged distribution is still not fully hardened for new machines. The main dependency is a working local Codex installation on the target machine.

## Known Constraints

- Windows is the only validated target right now
- Local Codex must exist on the machine
- Some UI polish remains, especially for long paths and dense detail panels
