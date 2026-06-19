# MVP1 AI Employee UI Design Doc

Date: 2026-06-19

## Primary Reference

Interaction storyboard:

- `task/2026-06-17_mvp_pixel_office/mvp1_first_workstation_and_agent/UI_06_18.png`

Pixel art asset pack:

- `assets/pixel_office/mvp1`

## Design Intent

The app should feel like a playable pixel office, not a dashboard pasted on top of pixel art.

The baseline visual direction is closer to a warm retro office scene with integrated overlays than to a modern dark SaaS modal.

## Screen Model

### Default screen

- Only one office room is visible.
- No permanent left sidebar.
- No persistent right utility rail.
- No top-page product title block.
- One compact office button lives inside the office view.

### Overlay model

- Empty workstation click opens a small confirmation modal.
- Confirming opens the AI employee creation modal.
- Occupied workstation click opens a large conversation panel.
- All overlays should feel visually anchored to the pixel office scene.

## Required UI States

### Empty workstation

- Desk is visible in the room even before assignment.
- Hover state adds highlight and helper text.
- Helper text explains the seat can create an AI employee.

### Create confirmation modal

- Smaller than the full create form.
- Uses pixel-frame styling from the modal sheet.
- Copy should frame the action as opening a new AI employee seat.

### Create AI employee modal

- Uses the pixel modal frame, warm colors, and retro borders.
- Avoid flat modern enterprise styling.
- Labels should use product language: `AI employee name`, `Initial brief`.
- The modal should be large enough to feel like a primary workflow, not a tiny confirmation box.
- Primary setup fields stay visible first; advanced runtime knobs can be visually secondary.

### Occupied workstation

- The seated character should be visible at the desk.
- The desk label should switch to the AI employee name.
- Hover or selected state can expose latest conversation preview.

### Conversation panel

- Significantly larger than the previous narrow drawer.
- Should read like a proper chat surface, similar in importance to Codex or WeChat conversation view.
- Includes only the employee identity, message timeline, and larger input area in the default surface.
- User messages should read as clear outgoing bubbles.
- Employee replies should read as incoming chat bubbles with the pixel employee identity attached.
- Runtime thoughts or work progress should appear inside the conversation flow itself when available, not as a separate dashboard block.
- Remove metadata cards such as `role`, `seat`, `runtime`, `latest conversation context`, and `recent activity`.

## Style Rules

### Keep

- pixel office background
- pixel desks and worker sprites
- pixel-frame modal language
- warm beige, wood, brass, and muted ink tones from the art pack

### Remove or minimize

- generic dark SaaS cards
- thin teal-outline enterprise fields as the dominant look
- detached modern modal chrome that ignores the pixel asset style

## Asset Usage

Use these assets as the source of truth:

- `assets/pixel_office/mvp1/floor/floor_room_shell_day.png`
- `assets/pixel_office/mvp1/workstation/workstation_state_sheet.png`
- `assets/pixel_office/mvp1/agent/agent_state_sheet.png`
- `assets/pixel_office/mvp1/ui/modal/create_agent_modal_sheet.png`
- `assets/pixel_office/mvp1/ui/chat/chat_panel_frame.png`
- `assets/pixel_office/mvp1/preview/mvp1_concept_board.png`

## FE Handoff Notes

Frontend should preserve these design behaviors:

- labels appear inside the office, not as a separate external list
- conversation panel is large enough for real reading and writing
- employee naming replaces workstation placeholder naming once occupied
- overlay spacing should preserve room visibility where possible
- setup modal reads as `open a new AI employee conversation`
- conversation panel remains the dominant interaction surface once an employee is selected
- the default selected-employee surface is chat-first, not management-first
