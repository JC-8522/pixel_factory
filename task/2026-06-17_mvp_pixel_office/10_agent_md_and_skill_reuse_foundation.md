# Task: AGENT.md And SKILL.md Reuse Foundation

## Goal

Define a reusable content abstraction for portable agent definitions and reusable skills.

## Why

The product already has:

- reusable `agent_profiles`
- reusable `SKILL.md`
- installable `agent-pack.json`

But it does not yet have a portable file-level agent definition that can be reused across office setups and future packs.

## Scope

- define `AGENT.md` contract
- clarify `SKILL.md` contract
- document boundary between agent identity and capability
- preserve compatibility with current profile and skill systems

## Deliverable

- `docs/agent_md_and_skill_reuse_spec.md`

## Acceptance

- `AGENT.md` responsibility is clearly separated from `SKILL.md`
- the spec maps cleanly to current project concepts like `agent_profiles` and `skills`
- the spec is usable later for Agent Packs and Pixel Office agent creation

## Validation

1. Read the spec.
2. Confirm a future imported agent can be represented without inventing new ambiguous concepts.
3. Confirm a skill can still be reused by multiple agents without embedding persona into the skill file.
