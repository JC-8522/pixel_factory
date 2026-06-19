# Asset Directory Structure

## Purpose

This document defines how art assets should be organized on disk so frontend and backend can refer to them predictably.

## Recommended Production Directory

```text
assets/
  pixel_office/
    floor/
      shells/
      tiles/
      props/
    workstation/
      base/
      overlays/
      labels/
      badges/
    agent/
      sprites/
      avatars/
      states/
    ui/
      modal/
      chat/
      buttons/
      inputs/
    exports/
      preview/
      production/
```

## Recommended Working Structure In This Repo

```text
docs/pixel_office_art_assets/
  README.md
  01_art_asset_design_doc.md
  02_asset_directory_structure.md
  03_frontend_backend_asset_integration.md
  mappings/
  prompts/
  references/
```

## Asset Type Rules

### `floor/shells`

Use for large room background images.

Examples:

- `floor_room_shell_day.png`

### `floor/tiles`

Use for repeatable tile textures.

Examples:

- `floor_tile_bluegray_a.png`
- `floor_tile_bluegray_b.png`

### `floor/props`

Use for independent decorative furniture and room props.

Examples:

- `floor_prop_printer_right.png`
- `floor_prop_bookshelf_top.png`

### `workstation/base`

Use for desk base renders.

Examples:

- `workstation_empty_base.png`
- `workstation_occupied_base.png`

### `workstation/overlays`

Use for state layers that can be toggled by interaction.

Examples:

- `workstation_hover_overlay.png`
- `workstation_selected_overlay.png`

### `workstation/labels`

Use for desk plaque frames and label background skins.

Examples:

- `workstation_label_plaque.png`

### `workstation/badges`

Use for status indicators.

Examples:

- `workstation_status_badge_green.png`
- `workstation_status_badge_red.png`

### `agent/sprites`

Use for rendered agent state sprites.

Examples:

- `agent_pixel_idle.png`
- `agent_pixel_working.png`

### `agent/avatars`

Use for avatar and appearance variants.

Examples:

- `agent_avatar_hair_set_a.png`
- `agent_avatar_outfit_green.png`

### `ui/modal`

Use for create-agent and confirm dialog skin assets.

Examples:

- `modal_create_agent_confirm_frame.png`
- `modal_create_agent_form_frame.png`

### `ui/chat`

Use for agent chat drawer and message bubbles.

Examples:

- `chat_panel_frame.png`
- `chat_bubble_agent.png`
- `chat_bubble_user.png`

### `ui/buttons`

Use for reusable button skins.

Examples:

- `button_primary_green.png`
- `button_secondary_orange.png`

### `ui/inputs`

Use for input and dropdown skins.

Examples:

- `input_frame_pixel.png`
- `dropdown_frame_pixel.png`

## Naming Convention

Use lowercase snake case.

Pattern:

`<category>_<object>_<state>_<variant>`

Examples:

- `workstation_hover_overlay`
- `agent_pixel_working`
- `chat_status_chip_working`

## Export Recommendations

### Preview Exports

Use for design review and documentation.

### Production Exports

Use for frontend integration.

Each production asset should have:

- fixed pixel dimensions
- transparent background where needed
- documented origin or source prompt
