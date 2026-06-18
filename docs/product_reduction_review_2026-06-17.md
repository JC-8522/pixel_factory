# Product Reduction Review - 2026-06-17

## Context

This note records product and UI issues found during manual review. The goal is not to patch them immediately. The goal is to align the product back to a smaller, clearer shape: a local Agent Operating System for a one-person company, not a broad demo surface.

## Answered Questions

### Create Agent / Skill List

- Issue: the skill list is too large to scan.
- Answer: agreed. For this product shape, the default should bias toward `search only` with a lightweight selected-skill list, not category browsing of a huge global skill library.
- Recommendation: remove category groups and selected-only toggle from the main create flow. Keep one search box and compact selected results.

### Runtime = Mock runtime

- Issue: why is `Mock runtime` present if the product should be local Codex?
- Answer: `Mock runtime` was useful during build-out and UI testing, but it is not correct for the product's real default experience.
- Recommendation: remove `Mock runtime` from the user-facing create flow. Keep it only as an internal test/runtime fixture if still needed in code.

### Role as Fixed Options

- Issue: why is `Role` a fixed select?
- Answer: agreed. Product-wise the role should be freeform because users will define their own team structure and titles.
- Recommendation: replace role select with a text input.

### Auto-Run Mode

- Issue: what is `Auto-run mode` and should it exist?
- Answer: in the current implementation it is an engineering control flag, not a good user-facing product concept. Your framing is stronger: behavior should come from orchestration and workflow rules, not a simple mode dropdown.
- Recommendation: remove `Auto-run mode` from the create UI. If needed later, move execution behavior into workflow/orchestration configuration.

### Font Readability

- Issue: are the fonts actually readable?
- Answer: not consistently. Some headers are readable, but body text, dense panels, and pixel-office labels are too small or too low-contrast. Several screenshots show crowding and clipping.
- Recommendation: raise base body size, improve contrast, simplify dense panels, and stop rendering long labels directly on the office canvas.

### Create Without Delete

- Issue: why can users create but not delete?
- Answer: this is a real product gap. CRUD is incomplete.
- Recommendation: every create surface must have matching delete support before it is treated as complete.

### Whiteboard / Skill Shelf

- Issue: what are `Whiteboard` and `Skill shelf`, and were they requested?
- Answer: they were invented as visual filler in the office scene, not validated product requirements.
- Recommendation: remove them for now. Keep only visual zones that support real workflows.

### Meeting Destroy / Delete

- Issue: meetings cannot be destroyed or deleted.
- Answer: correct. Current meeting support is create-heavy and lifecycle-light.
- Recommendation: add delete/archive later if meetings remain in scope. For the reduction pass, consider removing meetings entirely until the core single-manager flow is solid.

### Selected Agent Cannot Be Closed

- Issue: selected agent cannot really be closed.
- Answer: agreed. The drawer has a close button, but state handling is not behaving reliably enough in practice.
- Recommendation: fix state handling if the drawer remains. In a reduction pass, simplify the office interaction and use a more explicit detail panel pattern.

### Meeting Room Items Cannot Be Deleted

- Issue: meeting room content cannot be deleted.
- Answer: correct. This is another incomplete lifecycle path.
- Recommendation: if meetings stay, message/thread cleanup rules are needed. Otherwise remove meeting room in the reduction pass.

### Permission Page Typography / Alignment

- Issue: permission page text is not aligned.
- Answer: agreed. The page is visually rough and over-dense.
- Recommendation: reduce data density, tighten spacing, and move verbose activity rows behind expandable details.

### Permission Activity Too Large

- Issue: there is too much permission activity.
- Answer: agreed. The current page over-exposes implementation logs.
- Recommendation: show concise summaries by default, with detail drill-down only when needed.

### Agent Packs

- Issue: what is `Agent Packs`, and is it necessary?
- Answer: it is aligned to the long-term open-source sharing vision, but it is not necessary for the immediate core product.
- Recommendation: remove from the active MVP UI for now. Keep the concept in docs only, or behind a future flag.

### Task Board Layout / Font Overlap

- Issue: task board text is clipped and misaligned.
- Answer: correct. The current density and column sizing are not production ready.
- Recommendation: either simplify task cards heavily or temporarily remove this surface from the primary MVP until the layout is redesigned.

### Missing Delete on Tasks

- Issue: tasks can be created but not deleted.
- Answer: correct.
- Recommendation: required for any kept task feature.

### Integrations

- Issue: what is `Integrations`, and is it necessary?
- Answer: not necessary for the trimmed product right now. It reflects future architecture direction more than immediate product value.
- Recommendation: remove from the main UI for now.

## Confirmed Product Misalignment

The current build drifted in three ways:

1. Too many future-facing surfaces were exposed before the core manager workflow was stable.
2. Engineering control concepts leaked into product UI.
3. Lifecycle completeness is missing: create exists in many places, delete/archive does not.

## Recommended Reduction Direction

Keep:

- Office
- Create Agent
- Agent detail
- Local Codex runtime only
- Basic permissions

Remove from current MVP UI:

- Mock runtime selector
- Auto-run mode selector
- Whiteboard visual zone
- Skill shelf visual zone
- Agent Packs
- Integrations
- Meeting Room, until it is re-scoped
- Dense Task Board, unless rebuilt around a smaller workflow

Simplify:

- Role becomes freeform text
- Skill assignment becomes search-first only
- Permission page becomes summary-first

## CRUD Completeness Rule

Any retained surface that allows create must also support the matching cleanup path:

- create agent -> delete agent
- create task -> delete task
- create meeting -> delete meeting
- create profile -> delete profile

## Immediate Cleanup Request

The current app data should be cleared so the next product pass starts from an empty state.
