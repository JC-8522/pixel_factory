# Release Checklist

## Preflight

- Confirm `task/00_task_index.md` marks Tasks 01-18 correctly.
- Confirm `product_design.md`, `docs/architecture.md`, and `docs/product_view.md` reflect the current shipped behavior.
- Confirm `docs/known_limitations.md` is current.

## Required Verification

- Run `npm run typecheck`
- Run `npm run lint`
- Run `npm run test`
- Run `npm run build`
- Run packaged build flow

## Human Workflow Checks

- Launch the app from a clean dev run.
- Verify first-run office screen renders.
- Create at least one mock agent.
- Create at least one Codex CLI agent where local environment supports it.
- Open the agent drawer and send a normal chat message.
- Use `cmd: pwd` and confirm safe command preview proceeds without a permission dialog.
- Use a risky command preview such as `cmd: npm install sample-package` and confirm the permission dialog appears.
- Approve once, approve for project, and deny at least one permission request.
- Confirm denied permission events appear in the Permissions surface.
- Confirm at least one scoped allow rule appears and can be revoked.
- Assign at least one skill to an agent.
- Create and move a task through the Task Board.
- Verify Manager Cost and Run History render.
- Start a Meeting Room flow and save a summary.
- Inspect Agent Pack review and install surface.
- Inspect Integrations workspace/theme surface.
- Restart the app and confirm persisted data renders again.

## Packaging Checks

- Build the packaged app output.
- Launch the packaged app.
- Confirm the packaged window opens to a usable UI.
- Confirm no startup crash, preload failure, or blank screen occurs.

## Release Notes Inputs

- New features in this release:
  - Agent Profiles
  - Task Board and Meeting Room
  - Agent Packs
  - Integrations workspace/theme foundation
  - Permission review layer
  - skill search/filter/collapse in Create Agent

- Deferred platform work:
  - durable Business Memory Assets
  - full attach-mode control
  - real MCP provider bridge
  - hardened execution sandbox beyond current command review layer
