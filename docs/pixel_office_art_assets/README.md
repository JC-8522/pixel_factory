# Pixel Office Art Assets

## Goal

This folder defines the reusable art asset plan for the Stardew-inspired Pixel Office in `pixel_factory`.

The deliverables here are intended for:

- UI and frontend implementation,
- backend state-driven asset switching,
- later art production and slicing,
- future agent pack and office theme reuse.

## Folder Layout

- `README.md`
- `01_art_asset_design_doc.md`
- `02_asset_directory_structure.md`
- `03_frontend_backend_asset_integration.md`
- `mappings/asset_state_mapping.md`
- `mappings/asset_state_mapping.json`
- `prompts/01_floor_scene_prompt.md`
- `prompts/02_workstation_prompt.md`
- `prompts/03_agent_sprite_prompt.md`
- `prompts/04_chat_and_modal_prompt.md`
- `references/01_style_board.md`

## What This Folder Solves

It answers these practical questions:

- what art assets need to exist,
- how they should be categorized,
- how they should be named,
- which UI or backend state chooses which asset,
- what prompt/art direction should be used to generate or commission the first art pass.

## Main Product Constraints

- One `Floor` supports at most `12` workstations.
- Workstation layout is `4 columns x 3 rows`.
- Empty office state must still look complete and inviting.
- Hover, selected, empty, and occupied workstation states must be visually distinct.
- Agent visuals must be tied to workstations, not float independently.
- Chat panel and create-agent modal must feel like pixel game UI, not SaaS admin UI.
