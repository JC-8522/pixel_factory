---
name: pixel-office-task-delivery
description: Deliver the current Pixel Office task end to end by reading the task definition, making the minimum required product change, validating the local UI, and saving reusable evidence and lessons.
---

# Pixel Office Task Delivery

## Overview

Use this skill when work must stay tightly scoped to the current Pixel Office task while still covering implementation, UI behavior, QA acceptance, and reusable documentation.

This is the default workflow for tasks such as:

- visual office resets
- workstation-first creation flows
- single-agent and multi-agent interaction fixes
- acceptance-driven renderer or scene adjustments

## Principles

- read the task before editing code
- prefer minimum-change delivery over speculative cleanup
- keep task wording, data model, and UI copy aligned
- verify the real UI, not just static code shape
- save evidence under `verification/`, not `out/`
- save reusable art assets under `assets/pixel_office/`, not only in temporary generation folders

## Workflow

1. Read the task and nearby docs.
   - Confirm what is in scope now.
   - Ignore later MVP tasks unless the current task explicitly depends on them.
   - If wording is ambiguous, identify the core entity first, such as workstation versus agent.

2. Inspect the current implementation.
   - Read the relevant renderer, office scene, data model, and acceptance files.
   - Check whether existing behavior already partially satisfies the task.
   - Preserve unrelated user changes.

3. Define the smallest correct change.
   - Update only the layers needed for the current task.
   - Avoid broad refactors when copy, data shape, or one renderer path is enough.
   - If the app model is workstation-first, the empty workstation must exist before an agent is created.

4. Run local verification.
   - Open the app with the project's real local dev command.
   - Validate empty office first when relevant.
   - Validate create, chat, and delete for one agent.
   - Validate create, chat, and delete for multiple agents when the task touches agent flows.
   - Fail only on real UI breakage, not on unrelated environment noise.

5. Save acceptance evidence.
   - Store screenshots, logs, and machine-readable results under `verification/`.
   - Keep artifact names descriptive enough for later reuse.
   - Clean transient debug output that is not part of the retained evidence set.

6. Save reusable UI asset outputs when the task includes art delivery.
   - Copy generated images into `assets/pixel_office/<scope>/`.
   - Add a README and machine-readable manifest.
   - Record prompt-to-file mapping when possible.
   - Use semantic filenames that FE can keep stable.

7. Update reusable knowledge.
   - If a failure pattern repeats, add it to `AGENT.md` or the relevant local skill.
   - Record the exact validation path that proved the task complete.

## Repeated Failure Patterns

### Stale Agent Data

Previous local agents can break empty-state acceptance. Reset app data or use an isolated app-data directory before judging the product state.

### Session Counting Mistakes

One conversation may span multiple short-lived Codex sessions. Verify the visible transcript outcome, not only a single backend session identifier.

### Canvas-Only Interaction Risk

If a flow depends on precise pixel clicks, add or prefer deterministic selection controls so multi-agent verification stays stable.

### Task and UI Language Drift

If the task says workstation-first but the UI says create agent directly, fix the smallest surface necessary so the user sees the same mental model the task describes.

### Temporary Asset Loss

If generated images remain only in tool output folders, the task is not fully delivered. Copy them into the repo with semantic names and a manifest before considering the UI asset work complete.

## Acceptance Baseline

When the task touches office interaction, the baseline acceptance is:

- the app opens locally
- the office renders without visible in-app error UI
- a user can create one agent
- a user can create multiple agents
- each agent can be selected and chatted with independently
- one or many agents can be deleted
- the office returns to a usable state after cleanup

## Deliverables

Leave behind:

- the minimal code change required for the task
- updated task or QA notes when acceptance changed
- retained evidence in `verification/`
- retained UI art outputs in `assets/pixel_office/` when art was generated
- reusable guidance in `AGENT.md` or a local skill when new lessons were learned
