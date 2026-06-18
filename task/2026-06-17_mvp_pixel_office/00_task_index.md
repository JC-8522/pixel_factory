# Pixel Office MVP Task Index

## Folder Purpose

This folder contains the new Stardew-inspired Pixel Office MVP plan.

It is separated from the historical task set so the next product phase stays focused on:

- workstation-first office building,
- pixel agent placement on real seats,
- floor capacity management,
- multi-floor office presentation.

Historical task files were archived into:

- `task/2026-06-17_legacy_tasks`

## MVP Roadmap

### MVP 1

File:

- `01_mvp1_first_workstation_and_agent.md`

Goal:

- create the first workstation in an empty office,
- create the first pixel agent on that workstation,
- make the agent-workstation relationship explicit in UI and data.

### MVP 2

File:

- `02_mvp2_multi_workstation_single_floor.md`

Goal:

- support multiple workstations on one floor,
- enforce max 8 workstations per floor,
- keep the layout readable and clearly occupied or empty.

### MVP 3

File:

- `03_mvp3_multi_floor_visibility.md`

Goal:

- support multiple floors,
- allow UI selection of which floors are shown,
- preserve a game-like office management feeling.

## Execution Order

1. MVP 1
2. MVP 2
3. MVP 3

## Global Acceptance Rules

All MVPs should satisfy these shared product checks:

- The office should feel like a pixel room, not a generic admin dashboard.
- Small UI decisions should reinforce the workstation model.
- Agents should not visually float independently of desks.
- Empty state, occupied state, and selected state should be readable without explanation.
- The implementation should preserve future extension room for richer sprites, more furniture, and richer floor management.
