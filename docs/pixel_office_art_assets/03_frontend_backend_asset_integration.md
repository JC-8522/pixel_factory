# Frontend And Backend Asset Integration

## Purpose

This document explains how art assets connect to product state so both frontend and backend can work with the same model.

## Core Rule

Backend owns state.

Frontend chooses art assets based on that state.

## State Objects

### Floor

Relevant fields:

- `id`
- `name`
- `layoutPreset`
- `isEmpty`
- `workstationCount`

Frontend uses these to choose:

- empty room presentation
- workstation slot layout
- occupancy summary labels

### Workstation

Relevant fields:

- `id`
- `floorId`
- `status`
- `assignedAgentId`
- `isHovered`
- `isSelected`

Frontend uses these to choose:

- empty base asset
- occupied base asset
- hover overlay
- selected overlay
- label plaque
- status badge

### Agent

Relevant fields:

- `id`
- `name`
- `status`
- `role`
- `avatarSeed`
- `workstationId`

Frontend uses these to choose:

- sprite state
- visual variant
- desk label text
- chat header profile

## State-Driven Rendering Examples

### Empty Office

Condition:

- floor exists
- workstation count is `0`

Render:

- room shell
- decorative props
- empty build CTA

### Empty Workstation Hover

Condition:

- workstation status is `empty`
- workstation is hovered

Render:

- `workstation_empty_base`
- `workstation_hover_overlay`
- hover tooltip

### Selected Empty Workstation

Condition:

- workstation status is `empty`
- workstation is selected

Render:

- `workstation_empty_base`
- `workstation_selected_overlay`
- create-agent confirm modal

### Occupied Workstation

Condition:

- workstation status is `occupied`
- assigned agent exists

Render:

- `workstation_occupied_base`
- agent state sprite
- label plaque
- status badge

### Agent Chat Open

Condition:

- agent is selected
- chat panel is open

Render:

- `chat_panel_frame`
- header frame
- status chip
- message bubbles
- input frame
- send button

## FE Integration Pattern

Recommended frontend pattern:

1. read domain state
2. derive asset state key
3. map asset state key to asset file
4. render layer stack

This should be done through a deterministic asset mapping table, not hand-coded conditionals scattered across UI files.

## BE Integration Pattern

Backend does not need to know file paths.

Backend should expose durable state only:

- floor empty or not
- workstation occupied or not
- workstation selected or not
- agent status
- chat panel target agent

The frontend can then translate those states into concrete assets.

## Important Boundary

Do not store art file paths inside core backend records unless theme selection is explicitly required later.

Instead:

- backend exposes semantic state,
- frontend theme layer resolves asset files.
