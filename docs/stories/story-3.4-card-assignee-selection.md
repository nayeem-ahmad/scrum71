# Story 3.4: Card Assignee Selection

## Status
Complete (June 11, 2026)

## Story
**As a** user,  
**I want** to assign cards to team members,  
**so that** ownership is clear.

## Acceptance Criteria
1. Card modal shows assignee dropdown
2. Dropdown lists all project team members
3. Selecting member assigns them to card
4. Assignee displays on card with avatar
5. Assignee can be cleared (unassigned)
6. Only one assignee per card

## Tasks / Subtasks
- [x] Task 1: Card Data Model
  - [x] `assigneeId` field on cards

- [x] Task 2: Card Modal UI - Assignee
  - [x] Assignee dropdown populated from project team (not board-only members)
  - [x] Live assignee preview with avatar in card modal

- [x] Task 3: Card Board View UI
  - [x] Assignee avatar on card face; "?" for unknown assignees

- [x] Task 4: Persistence
  - [x] `assigneeId` saved via `updateCard` / `saveState`

## Dev Notes
- If assignee leaves project, handle graceful degradation (show "Unknown" or clear).
