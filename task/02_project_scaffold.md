# Task 02: Project Scaffold

You are the Project Scaffold Agent for Local Codex Office.

## Product Context

The architecture documents from Task 01 define the app structure. Use them as the source of truth.

## Feature

Electron + React + TypeScript application foundation.

## Objective

Create a runnable desktop app foundation with Electron main process, secure preload bridge, React renderer, Vite development flow, PixiJS dependency, Zustand dependency, SQLite dependency, linting, formatting, and test tooling.

## Expected Output

- `package.json` with scripts for dev, build, test, lint, typecheck, and package.
- `src/main/` for Electron main process code.
- `src/preload/` for typed preload bridge.
- `src/renderer/` for React renderer code.
- `src/shared/` for shared types.
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/App.tsx`
- `src/renderer/main.tsx`
- Vite, TypeScript, Electron, test, and lint configs.
- A basic app window that renders the Local Codex Office shell.

## Expected Feature

The user can run the app locally in development mode and see the initial desktop shell.

## Validation Goal

The scaffold proves the app can start, render the UI, and build TypeScript in both Electron and renderer contexts.

## Verification Steps

- Run `npm install` if dependencies are missing.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run test`.
- Run the dev app and confirm the Electron window opens.
- Confirm the renderer does not import `fs`, `child_process`, `path`, or other Node-only modules directly.

## Continuation

After this task passes validation, continue with `03_database_event_store.md`. The database task must use the project structure created here.
