# Story 4.3: Burndown Chart Panel

## Status
Draft

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
- [ ] Task 1: Panel Structure
  - [ ] Create HTML structure for a floating, draggable panel (e.g., `div` with `position: fixed`)
  - [ ] Add header to the panel with total remaining hours and a collapse/expand button
  - [ ] Integrate Chart.js canvas element within the panel body

- [ ] Task 2: Chart Data Aggregation
  - [ ] Generate an array of date labels from `sprint.startDate` to `sprint.endDate` (inclusive, one per day)
  - [ ] For each date label `d`, compute `totalRemaining(d)`:
    - For each card in the sprint, call `getEffectiveRemainingHours(card, endOfDay(d))`
    - Sum the results
  - [ ] `getEffectiveRemainingHours(card, t)` returns the `remainingHours` value from the latest entry in `card.remainingHoursLog` where `entry.timestamp <= t`; returns `0` if no entry exists at or before `t`
  - [ ] Days before any log entry for a card contribute `0` for that card (no estimate logged yet)

- [ ] Task 3: Chart Initialization & Rendering
  - [ ] Initialize Chart.js line chart with the aggregated daily totals
  - [ ] Render the chart when the board loads and a sprint is active
  - [ ] Update the chart whenever any card in the sprint receives a new `remainingHoursLog` entry (real-time listener triggers re-aggregation)

- [ ] Task 4: Panel Functionality
  - [ ] Implement collapse/expand for panel content
  - [ ] (Optional) Implement drag-and-drop repositioning using standard HTML Drag & Drop API

## Dev Notes
- The shift from a scalar `remainingHours` to `remainingHoursLog` means the chart now reflects true historical state rather than only the current value.
- `endOfDay(d)` should be `d` at 23:59:59.999` local time so a log entry made any time during that day is included.
- For performance at MVP scale, re-aggregate all days on any change (lazy optimisation later: only recompute affected days).
- The `board.js` already includes Chart.js — reuse the existing instance/import.
- This story depends on Story 4.1 (`getEffectiveRemainingHours` helper) and Story 4.1b (log entries being populated).
