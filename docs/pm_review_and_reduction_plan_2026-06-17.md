# PM Review And Reduction Plan - 2026-06-17

## Review Method

This review was done against the running packaged desktop app, page by page, from a cleared local database. The review goal was product judgment, not implementation validation.

Reviewed surfaces:

- Office
- Create Agent
- Profiles
- Tasks
- Meeting Room
- Permissions
- Agent Packs
- Integrations

## Core Conclusion

The current product exposes too many future-facing surfaces before the core manager workflow is stable. It reads more like a broad internal demo than a focused product for a one-person company.

The strongest product shape is:

- create and manage local Codex agents,
- give them roles, instructions, and skills,
- watch them in a simple office surface,
- inspect one selected agent,
- review permissions when risky actions happen.

Everything else should be considered optional until that core loop is clean.

## Page-By-Page Review

### 1. Office

What works:

- The page has a clear primary CTA.
- The office metaphor is immediately visible.

What is off:

- The empty office still feels busy because it shows invented zones instead of meaningful work areas.
- `Meeting room`, `Whiteboard`, and `Skill shelf` are not clearly tied to real user actions.
- The right panel can show detected process noise, which makes the product feel unstable.
- Text on the pixel surface is too small and too easy to overlap.

Decision:

- Keep Office.
- Remove invented zones that do not support current workflows.
- Show only app-managed agents by default.

### 2. Create Agent

What works:

- The dialog is a strong core workflow.
- Working directory and initial task are useful.

What is off:

- `Role` is constrained to preset values but should be user-defined.
- `Runtime` exposes `Mock runtime`, which is not the real product.
- `Auto-run mode` leaks an engineering control concept into UI.
- `Skills` is too heavy for the create flow.
- The form is visually dense for a first-run action.

Decision:

- Keep Create Agent.
- Change `Role` to freeform text.
- Remove user-visible runtime choice and default to local Codex.
- Remove `Auto-run mode`.
- Reduce skills to search-first only.

### 3. Profiles

What works:

- Profiles align with the longer-term idea of reusable agent configuration.

What is off:

- The page currently mixes library, editing, and capability-matrix concerns in one large surface.
- Capability matrix is useful later, but not critical to the core loop.

Decision:

- Keep Profiles in reduced scope, but treat this as secondary to Office/Create Agent.
- Do not expand Profile complexity until core agent creation and management are clean.

### 4. Tasks

What works:

- The conceptual link to work tracking makes sense.

What is off:

- The page is too dense.
- It exposes health, history, cost, and timeline all at once.
- It lacks lifecycle completeness such as delete.
- It tries to act like an operations console before the core product is stable.

Decision:

- Remove Tasks from the active MVP UI for now.

### 5. Meeting Room

What works:

- The idea fits a later multi-agent workflow product.

What is off:

- It is too advanced for the current product stage.
- The flow rules panel is heavy, technical, and premature.
- It lacks cleanup and deletion paths.

Decision:

- Remove Meeting Room from the active MVP UI for now.

### 6. Permissions

What works:

- The surface maps to a real product need.
- The two-column layout is conceptually understandable.

What is off:

- The page still reads more like audit internals than a manager-facing decision surface.
- Activity verbosity should stay low by default.

Decision:

- Keep Permissions.
- Keep it summary-first.

### 7. Agent Packs

What works:

- It connects to the open ecosystem vision.

What is off:

- It is not needed in the current core product.
- It adds conceptual weight without helping the first-run manager workflow.

Decision:

- Remove Agent Packs from the active MVP UI for now.

### 8. Integrations

What works:

- Workspace and attach concepts are reasonable platform ideas.

What is off:

- The page is architecture-forward, not user-value-forward.
- MCP, plugin registry, and GitHub boundary language do not belong in the current primary product experience.

Decision:

- Remove Integrations from the active MVP UI for now.

## Reduction Decisions

### Keep in active UI

- Office
- Create Agent
- Agent detail drawer
- Profiles
- Permissions

### Remove from active UI

- Agent Packs
- Tasks
- Meeting Room
- Integrations
- Discover
- Scan Skills

### Simplify immediately

- Office zones
- Create Agent runtime controls
- Create Agent role field
- Create Agent skills flow

## First Reduction Pass

The first reduction pass should do only the obvious product cuts:

1. Remove non-core navigation and views.
2. Show only app-managed agents by default.
3. Simplify Office visual zones.
4. Simplify Create Agent to local Codex only, freeform role, and no auto-run mode.
5. Reduce skill selection to a search-first flow.

## Notes

- Full CRUD completion is still required later for every kept create flow.
- This review intentionally prefers a smaller but sharper product over a broad platform shell.
