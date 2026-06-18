# AGENT.md And SKILL.md Reuse Spec

## Purpose

This document defines a reusable abstraction for:

- `AGENT.md`
- `SKILL.md`

The goal is to make agent identity and skill instructions portable across:

- local project setup,
- future Pixel Office MVP flows,
- Agent Packs,
- imported reusable office teams,
- future community sharing.

## Why This Matters

The current project already supports:

- reusable `agent_profiles`,
- reusable `SKILL.md` scanning,
- `agent-pack.json` for installable packs.

What is still missing is a lightweight human-readable agent definition that can live beside skills and be reused later without going through the full UI every time.

`AGENT.md` should become that portable agent-level definition.

## Design Principle

Separate identity from capability:

- `AGENT.md` defines who the agent is.
- `SKILL.md` defines what the agent knows how to do.

That separation makes it possible to:

- reuse the same agent with different skill sets,
- reuse the same skill across multiple agents,
- compose office teams from shared building blocks.

## File Roles

### AGENT.md

`AGENT.md` is the reusable human-readable definition of one agent archetype.

It should describe:

- name,
- role,
- persona,
- default behavior,
- collaboration style,
- preferred skills,
- visual identity,
- workstation or office presentation hints.

It should not contain:

- runtime session state,
- transient chat history,
- mutable execution logs,
- database ids that only make sense on one machine.

### SKILL.md

`SKILL.md` is the reusable instruction unit for a capability.

It should describe:

- what the skill is for,
- when to use it,
- how to use it,
- required references,
- expected constraints,
- reusable operating instructions.

It should not contain:

- one-off task results,
- private machine-local runtime state,
- unrelated persona definition for one specific agent.

## Recommended Reuse Model

### Layer 1: Agent Archetype

Portable file:

- `AGENT.md`

Maps to product concepts:

- `agent_profiles`
- agent creation defaults
- office visual identity

### Layer 2: Capability

Portable file:

- `SKILL.md`

Maps to product concepts:

- `skills`
- agent skill assignment
- prompt context building

### Layer 3: Bundle

Portable files:

- `agent-pack.json`
- `AGENT.md`
- `SKILL.md`
- optional assets

Maps to product concepts:

- Agent Pack install/import
- reusable office templates

## Recommended Folder Structure

For one reusable agent:

```text
agent-name/
  AGENT.md
  skills/
    skill-a/
      SKILL.md
    skill-b/
      SKILL.md
  assets/
```

For one shareable office pack:

```text
office-pack/
  agent-pack.json
  agents/
    qa-lead/
      AGENT.md
      skills/
        test-review/
          SKILL.md
    frontend-builder/
      AGENT.md
      skills/
        ui-implementation/
          SKILL.md
  assets/
```

## AGENT.md Contract

### Purpose

`AGENT.md` should be readable by both:

- humans,
- product import tooling.

### Minimal Contract

Recommended frontmatter:

```md
---
id: qa-agent
name: QA
role: QA Agent
persona: Detail-oriented software tester
default_skills:
  - test-review
  - bug-repro
workspace_scope: office
visual_identity:
  color: "#c89b3c"
  desk_label: "QA"
  sprite_style: "pixel-worker"
---
```

Recommended body sections:

- `# Agent Name`
- `## Mission`
- `## Responsibilities`
- `## Collaboration Style`
- `## Escalation Rules`
- `## Preferred Skills`
- `## Office Presence`

### AGENT.md Example

```md
---
id: qa-agent
name: QA
role: QA Agent
persona: Detail-oriented software tester
default_skills:
  - test-review
  - bug-repro
visual_identity:
  color: "#c89b3c"
  desk_label: "QA"
---

# QA

## Mission

Protect product quality before release.

## Responsibilities

- validate new UI flows
- reproduce defects clearly
- provide concise acceptance feedback

## Collaboration Style

Be direct, specific, and evidence-based.

## Escalation Rules

Escalate when expected behavior is unclear or contradictory.
```

## SKILL.md Contract

### Current Compatible Shape

The current project already supports simple frontmatter like:

```md
---
name: review-loop
description: Capture review feedback and convert repeated corrections into reusable operating knowledge.
---
```

That should remain valid.

### Recommended Extended Shape

```md
---
name: test-review
description: Review a feature against acceptance criteria and identify regressions.
category: qa
inputs:
  - task
  - ui_state
outputs:
  - review_findings
---
```

Recommended body sections:

- `# Skill Name`
- `## Use When`
- `## Do`
- `## Avoid`
- `## Validation`
- `## References`

## Mapping To Existing Product Models

### AGENT.md -> Agent Profile Snapshot

When imported, `AGENT.md` should map to:

- `agent_profiles`
- `profile_snapshot_json`
- visual identity fields
- collaboration behavior fields
- validation policy fields

### SKILL.md -> Skill Record

When scanned or imported, `SKILL.md` should map to:

- `skills`
- `skill_md_path`
- prompt context construction

### Important Rule

Imported `AGENT.md` should generate a profile snapshot, but should not mutate already-created live agents unless the user explicitly reapplies it.

## Future Import Behavior

Recommended behavior for future implementation:

1. scan folder for `AGENT.md`
2. parse frontmatter
3. create or update reusable `agent_profile`
4. scan nested `skills/**/SKILL.md`
5. attach declared default skills to that profile
6. allow the manager to create a seated pixel office agent from that reusable definition

## Pixel Office Usage

For the Pixel Office UI, `AGENT.md` should also support office-facing hints:

- `desk_label`
- `color`
- `sprite_style`
- optional `preferred_floor`
- optional `preferred_workstation_type`

This lets the same reusable agent definition drive both:

- operational behavior,
- office presentation.

## Recommended Engineering Boundary

Do not overload `SKILL.md` with agent persona.

Do not overload `AGENT.md` with long procedural skills.

Keep the boundary clean:

- persona, role, office identity -> `AGENT.md`
- executable reusable capability instructions -> `SKILL.md`

## Lessons Learned From Current App Runtime

While validating the current app end to end, a few recurring failure modes showed up that are worth preserving for future agent and skill work.

### Keep Reusable Definitions Separate From Runtime State

The most important boundary held up in practice:

- reusable agent definition belongs in `AGENT.md`
- reusable capability instructions belong in `SKILL.md`
- live session state belongs in the database and runtime layer

This matters because several of the bugs we fixed were caused by runtime behavior, not by reusable agent definition shape.

### Do Not Assume Machine-Local Runtime Defaults Are Portable

The local Codex runtime only worked reliably after resolving the real `CODEX_HOME` / `.codex` location instead of relying on a sandboxed or inherited home directory.

Implication for future `AGENT.md` work:

- never encode machine-local auth paths in reusable agent definitions
- keep authentication and runtime bootstrap outside `AGENT.md`
- treat local runtime environment as adapter configuration, not agent identity

### One-Shot Runtime Flows Need Explicit Session Handling

`codex exec` one-shot flows behaved differently from long-lived chat sessions:

- stdin needed to be closed explicitly
- UI message history needed to aggregate across multiple one-shot sessions

Implication:

- `AGENT.md` should describe expected collaboration style, not transport/session mechanics
- session stitching belongs in runtime and renderer code, not reusable markdown definitions

### CRUD Completeness Matters For UI Reliability

Creating an agent worked before deleting one worked cleanly. The delete path required explicit support across:

- IPC
- repository cleanup
- renderer state updates

Implication:

- when future `AGENT.md` import or install flows are added, define the full lifecycle up front: create, display, chat, delete, and re-import
- a reusable definition is only truly usable if the whole UI lifecycle is implemented

### Visual Defaults Must Avoid Overlap

Newly created agents originally stacked on top of each other in the UI. Default desk positioning had to be assigned deliberately.

Implication:

- `AGENT.md` may describe visual identity
- actual placement logic should stay in layout/orchestration code
- reusable agent metadata should not be trusted as the only source of spatial behavior

### Windows Runtime Behavior Needs Defensive Handling

On Windows, cached `codex.exe` reuse needed fallback handling because file copy operations could fail with `EBUSY`.

Implication:

- importable agent definitions should stay platform-neutral
- runtime bootstrap code should defensively handle Windows-specific file behavior
- operational portability comes more from adapters than from richer markdown schema

### Treat Console Warnings Separately From Real UI Errors

During UI verification, some browser or platform warnings were not product-breaking errors. What mattered was whether the actual app UI surfaced failures or blocked the flow.

Implication:

- future validation for agent import flows should distinguish benign environment noise from real UI regressions
- acceptance should focus on successful create/chat/delete behavior with no in-app error state

### Recommended Rule Of Thumb

If a piece of information answers "who is this agent?" or "how should this agent collaborate?", it likely belongs in `AGENT.md`.

If it answers "how is this machine/runtime wired so the agent can execute?", it does not belong in `AGENT.md`.

## Suggested Next Product Tasks

1. Add `AGENT.md` parsing support alongside existing profile import flows.
2. Support a folder-based reusable agent import path.
3. Allow one `AGENT.md` to declare default linked skills.
4. Let Pixel Office create seated agents from imported reusable agent definitions.
5. Let Agent Packs include `agents/*/AGENT.md` as a first-class source format.

## MVP Relevance

This abstraction is not required to finish MVP 1 rendering, but it is important to preserve now so later work does not paint the product into a corner.

It will be especially useful when:

- building reusable office teams,
- installing themed agent packs,
- sharing specialized pixel workers,
- recreating office layouts across projects.
