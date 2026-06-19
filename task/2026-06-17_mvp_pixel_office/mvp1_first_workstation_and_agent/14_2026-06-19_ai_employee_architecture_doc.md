# MVP1 AI Employee Architecture Doc

Date: 2026-06-19

## Architecture Goal

Support a single-office-view product where each workstation can host one AI employee and each AI employee exposes one persistent conversation experience in the renderer.

## Current Model

The current stack already has the right core entities:

- floor
- workstation
- agent
- session
- message

This means we do not need a backend rewrite for the new product language.

## Product-To-System Mapping

### User-facing object: AI employee

System mapping:

- stored as an `agent`
- assigned through `workstation.assigned_agent_id`
- rendered into the office as the occupied seat state

### User-facing object: conversation

System mapping:

- backed by one or more runtime `session` records
- message history loaded from `messages.listBySession`
- renderer composes a persistent preview and timeline from those records
- recent visible work activity can be derived from persisted `events` for the same agent

### User-facing object: workstation

System mapping:

- visual seat location comes from `officeSlots`
- persisted seat record comes from workstation storage
- workstation may exist with or without an assigned employee

## Frontend Responsibilities

- derive the active workstation from clicked slot state
- lazily create the workstation record if the visual seat is clicked before persistence exists
- open the AI employee creation flow from the selected workstation
- resolve the assigned employee when an occupied seat is selected
- hydrate message previews so the office can show latest context
- render conversation UI as an in-office overlay rather than a detached app page
- render a larger thread-first conversation shell rather than a narrow data drawer
- keep the default chat window minimal; management metadata belongs outside the primary conversation surface
- if runtime progress is surfaced, it should be rendered as inline conversation context rather than standalone cards

## Backend Responsibilities

- persist floor and workstation records
- allow workstation creation by `slotKey`
- assign agent to workstation on create
- keep workstation row after agent deletion
- expose agent, session, and message queries needed for renderer hydration

## QA Contract

QA should verify the contract at the behavior level:

1. empty seat can open creation flow
2. creation assigns employee to the clicked seat
3. occupied seat label reflects employee name
4. conversation panel loads the correct history for that employee
5. deleting employee frees the seat but does not break future reuse

## Recommended Non-Goals

Avoid for MVP1:

- introducing a separate `employee` persistence table
- rewriting sessions into a brand-new conversation model
- coupling renderer art behavior into backend IPC contracts

## Renderer Data Flow

1. `OfficeCanvas` emits selected `slotKey`.
2. `App.tsx` resolves `workstation` by `slotKey`.
3. If no workstation exists, renderer calls `createWorkstation`.
4. If workstation is empty, renderer opens create flow.
5. If workstation is occupied, renderer resolves `selectedAgentId`.
6. Conversation preview hydration loads sessions and messages per agent.
7. `AgentChat` hydrates persisted events for the selected agent to expose recent visible activity.
8. `AgentDetailDrawer` renders the persistent conversation experience as a large office overlay.

## Future Extension Points

- add a composite IPC such as `createAgentAtSlot` if FE wants a single transaction
- add richer conversation summaries per employee
- support more office-level actions behind the office button
