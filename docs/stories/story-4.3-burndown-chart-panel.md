# Story 4.3: Burndown Chart Panel

## Status
Complete (June 11, 2026)

## Story
**As a** scrum master,  
**I want** to see a burndown chart for the sprint,  
**so that** I can track progress against timeline.

## Acceptance Criteria
1. Floating burndown panel appears on board view
2. Panel header shows total current remaining hours (sum across all sprint cards using `getEffectiveRemainingHours` at now)
3. Chart plots total remaining hours on Y-axis
4. Chart plots sprint days on X-axis (start to end date, one point per day)
5. For each day on the X-axis, total remaining hours = sum of `getEffectiveRemainingHours(card, endOfDay)` across all cards in the sprint — using the latest log entry available at or before that day's end
6. Days with no log entries for any card carry forward the last known value for each card (step-function behaviour)
7. Panel can be collapsed to header-only view
8. Panel can be dragged/repositioned (optional)

## Tasks / Subtasks
- [x] Task 1: Panel Structure
  - [x] Floating panel with header, view toggles, and Chart.js canvas

- [x] Task 2: Chart Data Aggregation
  - [x] Daily totals via `getEffectiveRemainingHours` and `board.history` snapshots

- [x] Task 3: Chart Initialization & Rendering
  - [x] `updateBurndownChart` on board render; team and per-person modes

- [x] Task 4: Panel Functionality
  - [x] Collapse via `.collapsed` class on toggle
  - [x] Drag reposition on header with localStorage persistence
  - [x] Hidden when sprint lacks start/end dates or PM screen is open

## Dev Notes
- Panel visibility controlled by `updateBurndownPanelVisibility(board)` in `board.js`.
- Ideal trend line implemented in team view (Story 4.4 overlap).