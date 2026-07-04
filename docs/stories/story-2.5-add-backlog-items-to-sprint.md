# Story 2.5: Add Backlog Items to Sprint

## Status
Complete (June 11, 2026)

## Story
**As a** product owner,  
**I want** to add backlog items to sprints,  
**so that** I can plan sprint scope.

## Acceptance Criteria
1. Backlog items can be selected for sprint inclusion
2. Adding to sprint creates corresponding card on board
3. Original backlog item remains in backlog (reference)
4. Backlog shows which items are in active sprints
5. Items can be removed from sprint without deleting from backlog
6. Sprint selector shows available sprints for project

## Tasks / Subtasks
- [x] Task 1: Move to Sprint UI
  - [x] Add to sprint button on backlog tasks
  - [x] Sprint picker modal filtered to current project
  - [x] Remove-from-sprint button when item is already in a sprint

- [x] Task 2: Conversion Logic
  - [x] `createCardFromBacklogItem` creates card in sprint's first list
  - [x] Copies title, description, and story link

- [x] Task 3: Backlog Status Update
  - [x] Status `in-sprint` with `sprintId` and `cardId` links
  - [x] `unlinkBacklogFromCard` when linked card is deleted on board

- [x] Task 4: Feedback & Sync
  - [x] Sprint badge and `in-sprint` styling in backlog list
  - [x] Toast notifications for add/remove

## Dev Notes
- Decide if Backlog Item is *moved* (removed from backlog) or *linked* (stays in backlog but marked). Story says "Original backlog item remains... (reference)".
