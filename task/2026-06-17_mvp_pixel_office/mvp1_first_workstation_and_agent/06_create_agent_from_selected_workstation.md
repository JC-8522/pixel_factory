# Task 1.6: Create Agent From Selected Workstation

## Goal

Make workstation selection the entry point to agent creation.

## Files Likely Involved

- `src/renderer/components/CreateAgentDialog.tsx`
- `src/renderer/App.tsx`
- agent store or IPC flow
- workstation repository or service layer

## Implementation

- open `Create Agent` from selected empty workstation,
- pass workstation context into creation flow,
- on success assign the created agent to the workstation.

## UI Assets Used

- `workstation_selected_overlay`
- `modal_create_agent_confirm_frame`
- `modal_create_agent_form_frame`
- `button_primary_green`
- `button_secondary_orange`
- `button_close_pixel`
- `input_frame_pixel`
- `dropdown_frame_pixel`

## Frontend Usage

- FE keeps the clicked empty workstation visually selected while the create flow is open.
- The first modal state is `modal_create_agent_confirm_open`, rendered with the confirm frame and green or orange action buttons.
- If the user proceeds, FE opens `modal_create_agent_form_open`, rendered with form frame, input frame, dropdown frame, and close button.
- FE passes workstation context into the dialog so successful creation returns an assigned workstation id.

## Deliverable

An empty desk can become an occupied desk by creating an agent from it.

## MVP 1 Delivery Rule

This task introduces the workstation-bound create-agent flow.

MVP 1 is not done until the created agent can also be seen seated at the desk, opened in chat, deleted cleanly, and restored correctly after restart as defined in `09_mvp1_acceptance.md`.

## Acceptance

- The user cannot create the workstation-bound agent flow without selecting a workstation.
- Agent creation assigns the seat automatically.
- The workstation no longer appears empty after creation.

## Validation

1. Create one workstation.
2. Select that workstation.
3. Create an agent from it.
4. Confirm the workstation becomes occupied.
