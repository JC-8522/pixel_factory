# MVP 1 Asset Usage Matrix

## Purpose

This file links MVP 1 implementation tasks to the art assets they consume and explains how frontend should use those assets.

## Current Asset Pack

The current first-pass generated image pack lives in:

- [`assets/pixel_office/mvp1`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1)

Important current files:

- [`floor/floor_room_shell_day.png`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1/floor/floor_room_shell_day.png)
- [`workstation/workstation_state_sheet.png`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1/workstation/workstation_state_sheet.png)
- [`agent/agent_state_sheet.png`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1/agent/agent_state_sheet.png)
- [`ui/modal/create_agent_modal_sheet.png`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1/ui/modal/create_agent_modal_sheet.png)
- [`ui/chat/chat_panel_frame.png`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1/ui/chat/chat_panel_frame.png)
- [`preview/mvp1_concept_board.png`](C:/Users/Administrator/Desktop/repo/pixel_factory/assets/pixel_office/mvp1/preview/mvp1_concept_board.png)

## Task To Asset Mapping

### Task 1.1: Empty Office Visual Reset

UI uses:

- `floor_room_shell_day`
- `floor_wall_backdrop`
- `floor_tile_bluegray_a`
- `floor_tile_bluegray_b`
- `floor_prop_pantry_left`
- `floor_prop_door_top`
- `floor_prop_sofa_top`
- `floor_prop_bookshelf_top`
- `floor_prop_printer_right`
- `floor_prop_plant_strip_bottom`

Frontend uses:

- render these as the static room baseline
- activate them under `floor_empty` and `floor_active`
- never replace them with a blank container background

### Task 1.4: Render Empty Workstation Sprite

UI uses:

- `workstation_empty_base`
- `workstation_empty_shadow`
- `workstation_hover_overlay`
- `workstation_selected_overlay`
- `workstation_label_plaque`

Frontend uses:

- build workstation from layered art, not one merged screenshot
- use overlays for hover and selection states
- keep label plaque separate so text stays dynamic

### Task 1.5: Create First Workstation Flow

UI uses:

- `workstation_empty_base`
- `workstation_empty_shadow`
- `workstation_hover_overlay`
- `workstation_selected_overlay`
- `workstation_label_plaque`

Frontend uses:

- render the first created workstation immediately after create succeeds
- move floor state from `floor_empty` to `floor_active`
- allow hover and selected overlays to confirm interactivity

### Task 1.6: Create Agent From Selected Workstation

UI uses:

- `modal_create_agent_confirm_frame`
- `modal_create_agent_form_frame`
- `button_primary_green`
- `button_secondary_orange`
- `button_close_pixel`
- `input_frame_pixel`
- `dropdown_frame_pixel`

Frontend uses:

- show confirm modal when empty workstation is selected
- show form modal for the actual create flow
- preserve selected workstation visual state beneath the modal

### Task 1.7: Render Occupied Workstation With Pixel Agent

UI uses:

- `workstation_occupied_base`
- `workstation_label_plaque`
- `agent_pixel_idle`
- `agent_pixel_working`
- `agent_pixel_thinking`
- `agent_pixel_blocked`
- `workstation_status_badge_green`
- `workstation_status_badge_blue`
- `workstation_status_badge_red`

Frontend uses:

- switch to `workstation_occupied` when `assignedAgentId` exists
- render agent sprite as part of the workstation composition
- choose sprite and badge based on agent status

### Task 1.8: Desk Label And First-Pass Polish

UI uses:

- `workstation_label_plaque`
- `workstation_hover_overlay`
- `workstation_selected_overlay`
- status badge assets

Frontend uses:

- keep label readable above the desk
- align overlay and badge placement so the desk still reads clearly at one glance

## FE Implementation Rule

Frontend should resolve visuals through semantic state keys:

- `floor_empty`
- `floor_active`
- `workstation_empty`
- `workstation_hover`
- `workstation_selected`
- `workstation_occupied`
- `agent_idle`
- `agent_working`
- `agent_thinking`
- `agent_blocked`
- `modal_create_agent_confirm_open`
- `modal_create_agent_form_open`

Then map those keys to concrete assets using:

- [`docs/pixel_office_art_assets/mappings/asset_state_mapping.md`](C:/Users/Administrator/Desktop/repo/pixel_factory/docs/pixel_office_art_assets/mappings/asset_state_mapping.md)
- [`docs/pixel_office_art_assets/mappings/asset_state_mapping.json`](C:/Users/Administrator/Desktop/repo/pixel_factory/docs/pixel_office_art_assets/mappings/asset_state_mapping.json)

## BE Readability Note

Backend does not need to output image paths.

Backend only needs to expose the state that FE can translate into art:

- floor empty or active
- workstation empty, selected, hovered, or occupied
- assigned agent id
- agent status
- modal open state
