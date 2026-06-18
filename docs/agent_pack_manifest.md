# Agent Pack Manifest

Agent Packs are source-readable packages for sharing reusable digital employee assets. The product moat is not calling many agents; it is training agents into reusable employees through profiles, skills, review rules, workflow templates, and audit history. Agent Packs are the open-source distribution boundary for those assets.

## Manifest File

Each pack is a folder containing:

```text
agent-pack.json
skills/
assets/
tests/
scripts/
```

`agent-pack.json` must be readable before install. Inspection must never execute scripts.

## Format

```json
{
  "format": "local-codex-office.agent-pack",
  "version": 1,
  "id": "founder-engineering-pack",
  "name": "Founder Engineering Pack",
  "author": { "name": "Local Codex Office" },
  "profiles": [],
  "skillDependencies": [],
  "bundledSkills": [],
  "scripts": [],
  "assets": [],
  "permissionManifest": {},
  "workflowTemplates": [],
  "validationTests": [],
  "metadata": { "version": "0.1.0" }
}
```

## Inspection Contract

Inspection must show:

- included Agent Profiles,
- skill dependencies,
- bundled skills,
- scripts as review-only declarations,
- visual assets,
- permission manifest,
- workflow templates,
- validation tests,
- author and version metadata,
- checksum and signature status,
- validation status.

Inspection must not:

- execute scripts,
- install profiles,
- mutate skills,
- start runtimes,
- run commands.

## Install Contract

Reviewed installation stores the pack in `agent_packs`, installs bundled skills as normal `skills`, and installs profiles as normal `agent_profiles` with `source_pack_id` set to the pack id. When those profiles are later used to create agents, they still generate immutable profile snapshots through the existing Agent Profile flow.

Install decisions are recorded as audit events:

- `agent_pack_inspected`
- `agent_pack_permission_manifest_reviewed`
- `agent_pack_installed`
- `agent_pack_install_rejected`
- `agent_pack_uninstalled`

## Uninstall Contract

Uninstall removes pack-owned profiles and bundled skills, but it must not delete user-created profiles or profiles that no longer belong to the pack.
