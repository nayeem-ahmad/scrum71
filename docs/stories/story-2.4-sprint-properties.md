# Story 2.4: Sprint Properties (Dates and Goal)

## Status
Complete (June 11, 2026)

## Story
**As a** scrum master,  
**I want** to set sprint start/end dates and goal,  
**so that** I can define sprint boundaries.

## Acceptance Criteria
1. Board/sprint has start date and end date fields
2. Board/sprint has goal text field
3. Sprint dates display in board info
4. Sprint goal displays in board header or info modal
5. Dates are used for burndown chart timeline
6. Sprint duration calculates automatically

## Tasks / Subtasks
- [x] Task 1: Data Model Updates
  - [x] Add `startDate`, `endDate`, `goal` fields to Board document
  - [x] Update `createBoard` and `updateBoard` functions

- [x] Task 2: Sprint Settings UI
  - [x] Sprint edit modal with date inputs and goal field
  - [x] Live duration preview when dates change

- [x] Task 3: Board Header Display
  - [x] Sprint info bar shows goal, dates, duration, and days remaining
  - [x] PM sprints tab shows goal, dates, and duration

- [x] Task 4: Burndown Integration
  - [x] Burndown chart uses sprint start/end for timeline and ideal line

## Dev Notes
- Date handling should use a library like `date-fns` or native `Intl` if simple enough.
- Ensure consistent date formatting.
