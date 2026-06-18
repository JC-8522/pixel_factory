# Stardew Pixel Office UI Design

## Why This Document

This document defines the target UI and frontend structure for evolving `pixel_factory` from the current generic office canvas into a Stardew Valley-inspired pixel office.

The goal is not only to make the app prettier. The office must become the primary management surface where:

- a pixel worker is visible as an agent,
- each agent belongs to a specific workstation,
- workstations belong to a floor,
- the manager can create and organize the office incrementally through MVP milestones.

## Current Gap

The current implementation already has:

- a PixiJS office canvas,
- draggable agent sprites,
- persisted `position_x` and `position_y`,
- agent selection and detail drawer.

The current implementation does not yet have:

- explicit workstation entities,
- a floor model,
- a real seat-to-agent relationship,
- a Stardew-like scene composition,
- clear office-building interactions,
- a scalable UI model for multi-floor management.

## Target Product Statement

The product should feel like a pixel management game UI, not an admin dashboard.

The manager opens the app and sees a handcrafted office floor. Empty workstations are visible and actionable. Creating an agent means placing a pixel worker into a real seat. Floors feel like places, not filters.

## Visual Direction

Reference style: Stardew Valley-inspired cozy pixel office.

### Visual Principles

- Warm, handcrafted, playful, readable.
- Every important business object should look like part of the room.
- The office should feel alive even before advanced animation exists.
- The scene should be readable at a glance: floor -> workstation -> agent.
- UI chrome outside the canvas should support the scene, not overpower it.

### Scene Composition

Use a top-down / slight isometric-feel flat pixel composition similar to the reference image:

- framed room boundary,
- warm wall area,
- carpet/grid floor,
- decorative furniture around edges,
- workstations arranged in readable rows,
- department/workstation labels above desks,
- pixel workers seated or standing at desks,
- empty desks visually distinct from occupied desks.

### Pixel Style Rules

- `image-rendering: pixelated` everywhere for art surfaces.
- Low-color palette with warm wood, muted blue-gray carpet, deep outline colors.
- Strong dark outlines around furniture and characters.
- Avoid glossy gradients, blurred shadows, glassmorphism, or modern SaaS styling.
- Prefer deliberate chunky spacing and tile-based alignment.

### Initial Palette

- Wall: `#e8d8bf`
- Wall shadow: `#cdbba1`
- Floor base: `#6d7486`
- Floor tile alt: `#737b8f`
- Wood light: `#b7864a`
- Wood dark: `#6c4728`
- Outline: `#2a1f1a`
- Accent green: `#5f8f43`
- Accent blue: `#2f5f8f`
- Accent gold: `#c89b3c`
- Label background: `#2f2b25`
- Label text: `#f4e7c5`

### Typography Direction

Do not keep the current default `Inter` / admin-panel feel for the main product surface.

Recommended approach:

- Use a pixel-capable display font for scene labels and major headings.
- Keep a readable UI font for forms and drawer text.
- Suggested pairing:
  - Scene / section headings: `Press Start 2P` or another bitmap-inspired font.
  - Forms / detail panels: `Nunito Sans` or current system fallback if external font loading is undesirable.

If external font loading is not acceptable in the desktop app, use a local fallback strategy and still preserve the pixel layout style through spacing, borders, and casing.

## Core UI Objects

The office should be modeled around explicit entities instead of free-floating agents.

### Floor

A floor is a manager-visible office layer.

Fields:

- `id`
- `name`
- `index`
- `theme`
- `isVisible`
- `layoutPreset`
- `width`
- `height`

### Workstation

A workstation is the canonical seat in the office.

Fields:

- `id`
- `floorId`
- `name`
- `deskType`
- `x`
- `y`
- `status`
- `assignedAgentId`

`assignedAgentId` is the source of truth for seat occupancy.

### Pixel Agent

A pixel agent is the visualized employee/worker for an existing agent record.

Fields already exist in agent domain, but UI should additionally derive:

- `agentId`
- `displayName`
- `avatarSeed`
- `pose`
- `workstationId`
- `floorId`

### Relationship Rules

- One floor has many workstations.
- One workstation belongs to exactly one floor.
- One workstation can hold zero or one agent.
- One agent can occupy zero or one workstation.
- In MVP 1 to MVP 3, agents should not exist visually without a workstation.

## Primary User Flows

### Flow A: Create Workstation

1. User enters an office floor.
2. User clicks an empty buildable tile or presses `Create Workstation`.
3. UI previews the desk footprint.
4. User confirms placement.
5. Workstation appears as an empty desk with label placeholder.

### Flow B: Create Pixel Agent On Workstation

1. User clicks an empty workstation.
2. Context panel shows `Create Agent`.
3. User fills agent name and role.
4. After creation, the workstation becomes occupied.
5. Pixel worker appears attached to the desk.
6. Label above or near the desk shows agent/team name like `QA`.

### Flow C: Manage Multiple Workstations

1. User creates multiple desks on the same floor.
2. UI prevents creation beyond floor capacity.
3. Each desk clearly shows empty or occupied state.

### Flow D: Manage Multiple Floors

1. User creates a new floor.
2. Floor appears in floor selector.
3. User toggles which floors are visible in the main office view.
4. Canvas renders selected floors in a predictable layout.

## MVP Definition

### MVP 1

Scope:

- Create one workstation in an empty office.
- Create one pixel agent on that workstation.
- Show the pixel worker and name label.
- Establish explicit agent <-> workstation relationship.

Success criteria:

- An empty office is still visually attractive.
- The first desk feels intentionally placed, not dropped into a blank debug canvas.
- Creating an agent always happens through a workstation.

### MVP 2

Scope:

- Create multiple workstations in one floor.
- Maximum 8 workstations per floor.
- Empty and occupied workstations remain clearly distinguishable.
- Layout stays tidy and readable.

Success criteria:

- The manager understands capacity at a glance.
- The floor never becomes visually chaotic.
- The seat map remains primary; raw coordinate dragging becomes secondary or disabled.

### MVP 3

Scope:

- Create multiple floors.
- UI can choose which floors to show.
- Floor navigation and visibility controls are simple and game-like.

Success criteria:

- Adding floors does not break visual clarity.
- The user always knows which floor is active or visible.
- The office still feels like one product world, not separate pages.

## Detailed UI Specification

### Layout Structure

Keep a two-layer UI:

1. React shell for controls, drawers, forms, floor tabs, and build actions.
2. PixiJS scene for room rendering, desks, labels, and pixel workers.

Recommended app shell:

- Left rail: compact game-like navigation.
- Top bar: floor controls, build mode, office stats.
- Main stage: office scene.
- Right drawer: selected workstation or selected agent details.

### Main Office Surface

The office stage should render these layers in order:

1. room frame
2. wall background
3. floor tiles
4. decorative furniture
5. workstation layer
6. workstation labels
7. agent layer
8. hover/selection/build overlay

### Empty Office State

The empty office must not look blank.

Base room should already include:

- walls,
- floor pattern,
- a few decorative static props,
- empty central area reserved for workstation placement.

Empty-state CTA:

- `Build First Workstation`

This CTA should appear as a diegetic overlay or panel, not as a generic empty admin card.

### Workstation Appearance

Each workstation should include:

- desk,
- chair,
- monitor setup,
- small decor variation,
- nameplate above the desk,
- occupancy state.

State variations:

- `empty`: desk visible, chair tucked in, dim label placeholder.
- `occupied`: worker visible, label uses assigned name/role.
- `selected`: highlighted with pixel outline or shadow plate.
- `hovered`: subtle bounce or highlight.

### Agent Appearance

The pixel worker should be visibly more character-like than the current placeholder rectangle sprite.

Minimum readable body parts:

- head / hair,
- torso,
- legs,
- chair-facing pose or standing idle pose,
- role/status accent.

MVP art strategy:

- Use modular generated pixel primitives first.
- Separate hair, clothing, skin, and accessory palettes.
- Generate small variation from `avatarSeed`.

This avoids blocking on hand-drawn sprite sheets while still moving toward the target look.

### Labels

The reference image uses floating desk labels like `QA`, `FRONTEND`, `AI/ML`.

We should preserve that pattern.

Label rules:

- Default label shows workstation name.
- Occupied desk can optionally show agent name or team tag.
- For early MVP, use a short label with max 10 to 12 characters.
- Pixel plaque style with dark fill, warm border, pale text.

### Floor Selector

For MVP 3, the floor selector should feel like room tabs, not spreadsheet filters.

Recommended UI:

- top bar segmented tabs for active floor,
- optional `Visible Floors` popover with multi-select,
- each floor shows occupancy count like `Floor 2 - 5/8`.

## Frontend Architecture Recommendation

### Renderer Boundaries

Keep domain ownership clear:

- React store owns floor/workstation/agent view state.
- PixiJS renders current projection of that state.
- Dialogs and forms remain in React.
- PixiJS should not own business creation logic.

### Proposed Renderer Modules

Add or evolve these modules:

- `src/renderer/office/officeScene.ts`
  - orchestrates scene rendering by floor and layer
- `src/renderer/office/officeLayout.ts`
  - layout presets, capacity rules, tile map helpers
- `src/renderer/office/workstationSprites.ts`
  - desk, chair, label, occupancy visuals
- `src/renderer/office/agentSprites.ts`
  - richer pixel worker composition
- `src/renderer/office/floorScene.ts`
  - per-floor rendering composition
- `src/renderer/stores/officeBuilderStore.ts`
  - build mode, selected floor, selected workstation

### Data Model Changes

Current `AgentRecord` only stores loose `position_x` and `position_y`.

For this roadmap, add durable office entities:

- `FloorRecord`
- `WorkstationRecord`

Suggested `WorkstationRecord`:

```ts
type WorkstationRecord = {
  id: string;
  floor_id: string;
  name: string;
  tile_x: number;
  tile_y: number;
  desk_type: string;
  assigned_agent_id: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};
```

Suggested `FloorRecord`:

```ts
type FloorRecord = {
  id: string;
  name: string;
  floor_index: number;
  layout_preset: string;
  is_visible: number;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};
```

### Important Migration Rule

Agent `position_x` and `position_y` should become secondary compatibility fields.

Future source of truth:

- agent placement derives from assigned workstation,
- workstation derives from floor tile coordinates.

## Interaction Rules

### Build Mode

MVP 1 and MVP 2 should introduce a dedicated build mode.

Build mode actions:

- place workstation,
- cancel placement,
- select placed workstation.

Do not rely on free dragging for desk placement in the target product. The Stardew-like office should feel grid-based and intentional.

### Selection Priority

Click behavior:

1. clicking an occupied workstation selects the workstation,
2. secondary action opens agent details,
3. clicking empty workstation opens build/assignment panel,
4. clicking empty floor tile in build mode previews a workstation.

This keeps the mental model centered on the office seat.

### Capacity Rule

For MVP 2, one floor supports at most 8 workstations.

Recommended default layout:

- 2 rows x 4 columns

Benefits:

- predictable spacing,
- matches the reference image's readable grid,
- easy to visualize occupancy and future departments.

## Milestone Tasks

### Milestone 1: Office Foundation Reset

Goal:

Replace the current abstract office surface with a Stardew-inspired room baseline.

Tasks:

1. Redesign shell styling in [src/renderer/styles/app.css](C:/Users/Administrator/Desktop/repo/pixel_factory/src/renderer/styles/app.css) to support cozy game-like framing.
2. Update [src/renderer/App.tsx](C:/Users/Administrator/Desktop/repo/pixel_factory/src/renderer/App.tsx) toolbar and empty state copy for build-first workflow.
3. Rework [src/renderer/office/officeScene.ts](C:/Users/Administrator/Desktop/repo/pixel_factory/src/renderer/office/officeScene.ts) to render room layers instead of one debug rectangle.
4. Add decorative static office props around edges.
5. Keep current agent detail drawer intact while office presentation changes.

Deliverable:

- A believable empty office scene that already matches the target style.

### Milestone 2: Workstation Domain

Goal:

Introduce explicit desks as first-class UI/data objects.

Tasks:

1. Add `FloorRecord` and `WorkstationRecord`.
2. Add repository and IPC support for floor/workstation CRUD.
3. Add renderer store for build mode and office state.
4. Add workstation sprite renderer and selection behavior.
5. Migrate agent placement from loose coordinates toward workstation occupancy.

Deliverable:

- The office shows real desks even before all agent flows are migrated.

### Milestone 3: MVP 1

Goal:

Allow creating one workstation and one pixel agent attached to it.

Tasks:

1. Build `Create Workstation` interaction.
2. Add empty workstation card/panel state.
3. Connect `Create Agent` flow to selected workstation.
4. Render occupied workstation with pixel agent and label.
5. Validate one-to-one agent/workstation relation.

Deliverable:

- User can create the first desk and first seated agent in an empty office.

### Milestone 4: MVP 2

Goal:

Support multi-desk floor management with capacity rule.

Tasks:

1. Add 8-seat floor layout preset.
2. Show occupancy counts and empty-seat states.
3. Prevent creating a 9th workstation.
4. Add workstation rename/edit affordance.
5. Improve sprite variation so multiple desks do not feel duplicated.

Deliverable:

- One floor can host up to 8 readable, organized workstations.

### Milestone 5: MVP 3

Goal:

Support multiple floors and floor visibility control.

Tasks:

1. Add floor create flow.
2. Add floor selector UI.
3. Add visible-floor multi-select control.
4. Render one or more floors predictably.
5. Persist floor visibility state.

Deliverable:

- Manager can build a multi-floor office and choose what is shown.

## Engineering Notes

### Recommended Implementation Order

1. visual reset of office stage,
2. floor/workstation records,
3. workstation creation flow,
4. agent-to-workstation binding,
5. multi-desk capacity logic,
6. multi-floor controls.

### Why This Order

- It creates visible progress early.
- It avoids overbuilding floors before desks exist.
- It prevents agent visuals from drifting away from the workstation model.

### Backward Compatibility

Existing agents without workstation assignment should be handled temporarily by:

- auto-placing them into a fallback legacy zone, or
- prompting the user to assign them to a workstation during migration.

Preferred option:

- temporary legacy zone only during migration, then remove once workstation creation is stable.

## Acceptance Checklist

The redesign is on track when all statements are true:

- The office looks like a pixel room, not a wireframe canvas.
- An empty office is visually complete.
- A workstation is a first-class object.
- An agent is visually tied to a workstation.
- Labels like `QA` are clear and readable.
- Floor capacity is obvious.
- Multi-floor UI is understandable without explanation.

## Out Of Scope For These MVPs

- full animation cycles,
- pathfinding between desks,
- free roaming agents,
- meeting rooms as separate explorable rooms,
- advanced furniture customization,
- remote multiplayer editing.

## Recommended Next Execution Step

The next implementation slice should be:

1. office visual reset,
2. workstation data model,
3. MVP 1 create-workstation + create-agent-on-workstation flow.

That gives the fastest path from the current project state to the target product shape shown in the reference image.
