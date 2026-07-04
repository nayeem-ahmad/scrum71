# Story 4.5: Burndown History Tracking

## Status
Complete (June 11, 2026)

## Story
**As a** system,  
**I want** to record daily remaining hours,  
**so that** burndown chart shows historical progress.

## Acceptance Criteria
1. System records total remaining hours daily
2. History stores date and remaining value pairs
3. History used to plot actual burndown line
4. New day's data added automatically or on first access
5. History persists with board data

## Tasks / Subtasks
- [x] Task 1: Board Data Model Update
  - [x] Add `burndownHistory` (array of `{ date: string, remaining: number }` objects) to Board schema

- [x] Task 2: Daily Snapshot Logic
  - [x] Implement a function (e.g., `recordDailyBurndown`) that calculates total `remainingHours` for the current board
  - [x] This function should be called once per day for an active sprint, ideally on initial load or first interaction of the day.
  - [x] Check if an entry for the current day already exists in `burndownHistory` to avoid duplicates.

- [x] Task 3: Persistence
  - [x] Update the `burndownHistory` array in the current board's data
  - [x] Ensure `saveState()` is called after `burndownHistory` is updated

- [x] Task 4: Chart Integration
  - [x] Use the `burndownHistory` array as the data source for the actual burndown line in the Chart.js visualization.
  - [x] Ensure labels for the X-axis correspond to the dates in `burndownHistory`.

## Dev Notes
- The trigger for `recordDailyBurndown` needs careful consideration: a simple approach is to call it on `onAuthStateChanged` or `loadState` if a sprint board is active, checking the last recorded date.
- Consider server-side function for more robust daily tracking if client-side is unreliable.
- Implemented as `board.history` in code; `recordDailyBurndown` runs on each `renderBoard` call.