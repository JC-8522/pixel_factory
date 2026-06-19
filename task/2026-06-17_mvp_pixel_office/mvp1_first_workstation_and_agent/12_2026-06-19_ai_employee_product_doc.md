# MVP1 AI Employee Product Doc

Date: 2026-06-19

## Product Shift

MVP1 is no longer a generic multi-panel agent management app.

MVP1 is now a single pixel office where each workstation can host one AI employee, and each AI employee owns one persistent conversation history.

User-facing language should prefer `AI employee`, `workstation`, and `conversation`.

Avoid exposing `agent`, `session`, or `runtime` as the primary mental model unless the UI is in an advanced or diagnostic surface.

## Core User Story

As a solo founder or manager, I open one office view, click an empty workstation, create an AI employee, and then continue chatting with that same employee over time from the office itself.

## MVP1 Scope

The shipped MVP1 flow is:

1. Open app into one office scene.
2. Hover an empty workstation to see affordance.
3. Click workstation to open a confirmation modal.
4. Continue into AI employee creation.
5. Submit name, role, workspace, permissions, and initial brief.
6. See the AI employee appear at that seat.
7. Click the seated employee to open the persistent conversation panel.
8. Continue the same conversation history from that employee later.
9. Remove the AI employee and return the seat to empty.

## Product Rules

### 1. Workstation is the primary container

- One workstation maps to one potential AI employee seat.
- Empty workstation means the seat is available.
- Occupied workstation means an AI employee is assigned.

### 2. AI employee is the primary user object

- The seat label should show the AI employee name when occupied.
- The employee panel should read like an employee workspace, not like a low-level agent debugger.
- Employee deletion should release the seat without destroying the visual workstation layout.

### 3. Conversation is persistent

- Clicking an occupied workstation should reopen that employee's conversation.
- Replies should accumulate as employee history, not feel like unrelated temporary prompts.
- Preview text can summarize the latest conversation context from that employee.
- The default employee surface should feel like opening a persistent Codex or chat-app thread, not like opening a diagnostics drawer.
- The conversation window should prioritize only the AI employee identity and the chat thread itself.
- Product chrome such as `role`, `seat`, `runtime`, `last conversation`, or separate `recent activity` cards should not dominate the default chat window.

### 4. Office view is the home screen

- Left navigation is removed from the default experience.
- The old right-side management panel is no longer the default workflow entry.
- Global controls move behind the small office button inside the office scene.

### 5. Creating an employee is equivalent to opening a new persistent thread

- The user is not mentally creating a low-level runtime object.
- The user is opening a new AI employee identity at a fixed workstation.
- That creation flow should feel as important as opening a new Codex conversation.

## Out Of Scope For MVP1

- Multi-room office navigation
- Team hierarchy management
- Rich employee profile editing
- Advanced runtime diagnostics as a first-class user flow
- Workflow orchestration between multiple AI employees

## Product Acceptance

MVP1 is acceptable when:

- the app opens directly into one office scene
- a user can create an AI employee from an empty workstation
- the occupied seat visibly reflects the employee identity
- clicking that employee opens a large persistent conversation panel
- the panel is large enough to read and write like a real chat workspace
- the panel does not show management-style cards such as `role`, `seat`, `runtime`, `last conversation`, or `recent activity`
- the same employee retains prior conversation context
- deleting the employee returns the seat to empty

## Naming Contract

Preferred product copy:

- `AI employee`
- `workstation`
- `conversation`
- `office`

Avoid as first-touch copy:

- `agent management`
- `session orchestration`
- `runtime event`
