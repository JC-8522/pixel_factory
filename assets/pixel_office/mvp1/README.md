# Pixel Office MVP1 Asset Pack

## Purpose

This folder contains the first reusable UI art asset pack for the Pixel Office MVP 1 flow:

1. empty office floor
2. first workstation
3. first agent on workstation
4. create-agent modal
5. agent chat panel

These assets are stored in the repo so future UI work does not depend on temporary generated-image folders.

## Status

This pack is a `first-pass generated asset pack`.

It is intended for:

- frontend implementation reference
- early slicing and UI composition
- prompt-to-asset reuse
- future artist refinement

It is not yet a final cut, transparent, production-perfect sprite atlas.

## Folder Layout

- `floor/`
- `workstation/`
- `agent/`
- `ui/modal/`
- `ui/chat/`
- `preview/`
- `prompts/`
- `manifest/`

## Canonical Manifest

Use:

- `manifest/assets_manifest.json`

as the machine-readable inventory of this asset pack.

## MVP1 Files

- `floor/floor_room_shell_day.png`
- `workstation/workstation_state_sheet.png`
- `agent/agent_state_sheet.png`
- `ui/modal/create_agent_modal_sheet.png`
- `ui/chat/chat_panel_frame.png`
- `preview/mvp1_concept_board.png`

## Reuse Rule

Whenever new Pixel Office art is generated:

1. copy it into `assets/pixel_office/...`
2. add or update prompt files
3. update the manifest
4. keep semantic filenames stable
