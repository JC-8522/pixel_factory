# MVP 1 Task Index

## Goal

Deliver the first playable Stardew-inspired office loop:

1. empty office,
2. create workstation,
3. create agent on workstation,
4. see the worker seated with a readable label.

## Task Order

1. `01_empty_office_visual_reset.md`
2. `02_floor_and_workstation_data_model.md`
3. `03_office_builder_store_and_selection_state.md`
4. `04_render_empty_workstation_sprite.md`
5. `05_create_first_workstation_flow.md`
6. `06_create_agent_from_selected_workstation.md`
7. `07_render_occupied_workstation_with_pixel_agent.md`
8. `08_desk_label_and_first_pass_polish.md`
9. `09_mvp1_acceptance.md`
10. `10_mvp1_asset_usage_matrix.md`

## Notes

- Tasks are ordered to minimize rework.
- Each file contains its own implementation slice, local acceptance, and local validation.
- Child task validation proves that one slice works; it does not by itself close MVP 1.
- `09_mvp1_acceptance.md` is the single end-to-end gate for the whole MVP.
- `10_mvp1_asset_usage_matrix.md` links MVP 1 tasks to the art assets and explains how frontend should use them.

## Delivery Rule

Treat Tasks `1.1` through `1.8` as build slices, not independent release gates.

MVP 1 is only done when the whole workstation-first product loop works end to end:

1. the office opens in a believable empty state,
2. the user creates the first workstation,
3. the user creates an agent from that workstation,
4. the workstation becomes occupied and readable,
5. the user can chat with and delete the created agent,
6. the office stays consistent after cleanup and restart.
