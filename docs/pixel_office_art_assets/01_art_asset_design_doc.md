# Pixel Office Art Asset Design Doc

## Objective

Produce a reusable art asset plan for a Stardew-inspired office floor that supports:

- `12` workstations per floor,
- `4 x 3` workstation layout,
- empty office presentation,
- workstation hover and selected states,
- create-agent modal flow,
- seated agent rendering,
- agent chat drawer UI.

## Visual Target

The office should feel like a cozy pixel management game scene.

The target is not a generic dashboard. The target is:

- warm,
- handcrafted,
- readable,
- low-resolution,
- stateful,
- operationally useful.

## Asset Categories

### 1. Floor Scene Assets

These establish the room before any agent exists.

Required assets:

- room frame
- wall background
- floor tile pattern
- top-left pantry or coffee area
- top-center door wall
- top-right sofa or shelf area
- right-side printer or utility cabinet
- bottom decorative plant strip
- corner props

Recommended format:

- base scene as layered large PNG or layered source art
- reusable floor tiles as tileset
- decorative props as independent transparent PNGs

### 2. Workstation Assets

These represent the canonical seats in the office.

Required assets:

- empty workstation base
- workstation hover overlay
- workstation selected overlay
- workstation occupied base
- workstation label plaque
- workstation shadow plate

Each workstation visual should include:

- desk
- chair
- monitor
- small desk prop
- label area

Recommended format:

- one workstation sprite sheet or modular workstation parts
- hover and selected visuals as transparent overlays

### 3. Agent Assets

These are the pixel workers seated at desks.

Required assets:

- agent seated idle
- agent working
- agent thinking
- agent blocked
- avatar variations for hair and outfit

Recommended format:

- sprite sheet with per-state frames
- optional layered parts for hair, body, accessory variation

### 4. Modal And Panel Assets

These create the local UI skin inside the game world.

Required assets:

- create-agent confirmation modal frame
- create-agent form modal frame
- primary button skin
- secondary button skin
- input box frame
- dropdown box frame
- pixel close button

Recommended format:

- sliced UI atlas or 9-slice capable panel assets

### 5. Chat Drawer Assets

These define the right-side agent conversation panel.

Required assets:

- chat drawer frame
- header panel
- agent avatar box
- status chip
- incoming bubble skin
- outgoing bubble skin
- input bar
- send button

Recommended format:

- UI atlas with 9-slice compatible panels
- independent bubble and icon PNGs

## Required Asset List

### Floor

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

### Workstation

- `workstation_empty_base`
- `workstation_empty_shadow`
- `workstation_hover_overlay`
- `workstation_selected_overlay`
- `workstation_occupied_base`
- `workstation_label_plaque`
- `workstation_status_badge_green`
- `workstation_status_badge_yellow`
- `workstation_status_badge_blue`
- `workstation_status_badge_red`

### Agent

- `agent_pixel_idle`
- `agent_pixel_working`
- `agent_pixel_thinking`
- `agent_pixel_blocked`
- `agent_avatar_hair_set_a`
- `agent_avatar_hair_set_b`
- `agent_avatar_outfit_green`
- `agent_avatar_outfit_blue`
- `agent_avatar_outfit_brown`

### Modal

- `modal_create_agent_confirm_frame`
- `modal_create_agent_form_frame`
- `button_primary_green`
- `button_secondary_orange`
- `button_close_pixel`
- `input_frame_pixel`
- `dropdown_frame_pixel`

### Chat

- `chat_panel_frame`
- `chat_header_frame`
- `chat_status_chip_working`
- `chat_status_chip_waiting`
- `chat_bubble_agent`
- `chat_bubble_user`
- `chat_input_frame`
- `chat_send_button`

## Art Production Recommendation

### Use Both A Scene Asset Strategy And A UI Skin Strategy

Split production into two tracks:

1. environment and workstation art
2. UI skin art

This keeps floor rendering and modal rendering decoupled.

### Keep Modular Over Fully Baked Where State Changes Matter

Use baked art for:

- room shell
- decorative props

Use modular art for:

- workstations
- hover overlay
- selected overlay
- agent state
- chat drawer
- modal buttons

That allows the product to change state without repainting the whole room.

## Acceptance Standard For Art Direction

The art direction is correct when:

- the office reads as a Stardew-like pixel room,
- the empty office looks complete,
- a workstation feels like a real seat,
- hover and selected states feel like game interactions,
- an occupied desk clearly feels assigned to a worker,
- the chat panel feels like part of the same game world.
