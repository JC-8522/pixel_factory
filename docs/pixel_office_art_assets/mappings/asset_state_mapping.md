# Asset State Mapping

## Floor

| State Key | Meaning | Assets |
| --- | --- | --- |
| `floor_empty` | Floor has zero workstations | `floor_room_shell_day`, `floor_wall_backdrop`, `floor_tile_bluegray_a`, `floor_tile_bluegray_b`, decorative props |
| `floor_active` | Floor has one or more workstations | floor shell plus workstation layout |

## Workstation

| State Key | Meaning | Assets |
| --- | --- | --- |
| `workstation_empty` | Empty workstation not hovered | `workstation_empty_base`, `workstation_empty_shadow`, `workstation_label_plaque` |
| `workstation_hover` | Empty workstation hovered | `workstation_empty_base`, `workstation_hover_overlay`, `workstation_label_plaque` |
| `workstation_selected` | Empty workstation selected | `workstation_empty_base`, `workstation_selected_overlay`, `workstation_label_plaque` |
| `workstation_occupied` | Agent assigned to workstation | `workstation_occupied_base`, `workstation_label_plaque`, status badge, agent sprite |

## Agent

| State Key | Meaning | Assets |
| --- | --- | --- |
| `agent_idle` | Agent seated but idle | `agent_pixel_idle` |
| `agent_working` | Agent actively working | `agent_pixel_working`, `workstation_status_badge_green` |
| `agent_thinking` | Agent reasoning or waiting on internal task | `agent_pixel_thinking`, `workstation_status_badge_blue` |
| `agent_blocked` | Agent blocked or errored | `agent_pixel_blocked`, `workstation_status_badge_red` |

## Modal

| State Key | Meaning | Assets |
| --- | --- | --- |
| `modal_create_agent_confirm_open` | Confirm create-agent prompt visible | `modal_create_agent_confirm_frame`, `button_primary_green`, `button_secondary_orange`, `button_close_pixel` |
| `modal_create_agent_form_open` | Agent creation form visible | `modal_create_agent_form_frame`, `input_frame_pixel`, `dropdown_frame_pixel`, `button_primary_green`, `button_close_pixel` |

## Chat

| State Key | Meaning | Assets |
| --- | --- | --- |
| `chat_panel_open` | Agent chat drawer visible | `chat_panel_frame`, `chat_header_frame`, `chat_input_frame`, `chat_send_button` |
| `chat_agent_message` | Agent-authored message bubble | `chat_bubble_agent` |
| `chat_user_message` | User-authored message bubble | `chat_bubble_user` |
| `chat_status_working` | Agent shown as working in chat header | `chat_status_chip_working` |
| `chat_status_waiting` | Agent shown as waiting in chat header | `chat_status_chip_waiting` |
