# Task 1.1: Empty Office Visual Reset

## Goal

Make the office feel like a Stardew-inspired pixel room before desks exist.

## Files Likely Involved

- `src/renderer/styles/app.css`
- `src/renderer/App.tsx`
- `src/renderer/office/officeScene.ts`
- `src/renderer/office/OfficeCanvas.tsx`

## Implementation

- replace the current debug-like office background,
- add room frame, wall area, floor tiles, and basic static decor,
- change empty state CTA to workstation-first copy,
- preserve existing app shell and right drawer behavior.

## Deliverable

A visually complete empty office scene.

## Acceptance

- The office no longer looks like a dark debug canvas.
- The empty office looks intentional even with zero desks.
- The CTA language is about building a workstation, not directly creating an agent.

## Validation

1. Launch the app with no workstation data.
2. Confirm the office shows a room, floor, and decorative baseline.
3. Confirm the primary CTA says `Build First Workstation` or equivalent.
