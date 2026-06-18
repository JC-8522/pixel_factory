# Task 09: Pixel Office View

You are the Pixel Office Agent for Local Codex Office.

## Product Context

The core product experience is a visual office where each local Codex agent appears as a clickable pixel-art worker.

## Feature

PixiJS office scene and interactive pixel agents.

## Objective

Build the PixiJS office scene with desks, meeting room, whiteboard, idle area, error/blocked area, and skill shelf/toolbox area. Render agents as pixel characters with status-specific animations and persistent positions.

Task 02 created a CSS-based office preview shell only. This task must replace that preview with the real PixiJS canvas while preserving the surrounding app shell layout, selected-agent behavior, and store integration.

## Architecture Alignment

This task implements the first visual Human Console. It must render Agent Registry state through renderer stores and never own runtime execution, task policy, permission policy, message routing, or database access directly.

## Expected Output

- `src/renderer/office/OfficeCanvas.tsx`
- `src/renderer/office/officeScene.ts`
- `src/renderer/office/agentSprites.ts`
- `src/renderer/office/officeLayout.ts`
- Remove or retire the CSS-only office mock from the primary office surface.
- Pixel-style placeholder assets or generated sprite primitives.
- Click handling for selecting an agent.
- Drag handling for repositioning agents.
- Persisted agent positions.
- Tests or visual checks for rendering and interaction.

## Expected Feature

The user can see multiple agents in a pixel office, click an agent to select it, and move agents between office areas.

## Validation Goal

The office renders correctly at desktop and smaller window sizes, agents are visible and clickable, and status changes trigger distinct visual states.

## Verification Steps

- Run the app and confirm the PixiJS canvas is nonblank.
- Confirm the primary office surface is PixiJS, not the Task 02 CSS mock.
- Confirm at least one mock agent appears as a pixel character.
- Click an agent and confirm selection state updates.
- Move an agent and confirm position persists after restart.
- Verify each product status maps to an animation or visual marker.
- Verify UI controls do not overlap the canvas incoherently.

## Continuation

After this task passes validation, continue with `10_agent_detail_and_chat.md`. Clicking an agent should open the detail and chat experience.
