# Story 5.3: Enhanced Card Display

## Status
Complete (June 11, 2026)

## Story
**As a** user,  
**I want** cards to show key info at a glance,  
**so that** I can scan the board efficiently.

## Acceptance Criteria
1. Cards show labels as colored bars at top
2. Cards show due date with appropriate styling
3. Cards show checklist progress if items exist
4. Cards show time badge if hours tracked
5. Cards show assignee avatar
6. Cards show comment count if comments exist
7. Cards show attachment icon if files attached

## Tasks / Subtasks
- [x] Task 1: Component Layout Update
  - [x] `createCardElement` renders labels, meta row, assignee corner

- [x] Task 2: Badge Implementation
  - [x] Remaining hours badge (`5h`) and spent/estimate badge
  - [x] Checklist `X/Y`, comments count, attachments paperclip + count

- [x] Task 3: Assignee & Date Display
  - [x] Assignee avatar bottom-right; due date overdue/soon styling

- [x] Task 4: Styling & Polish
  - [x] Distinct classes for time-remaining vs time-spent; over-budget warning

## Dev Notes
- Attachment display reads `card.attachments` array (upload UI is Story 5.1).
- `attachments: []` added to default card schema in `createCard`.