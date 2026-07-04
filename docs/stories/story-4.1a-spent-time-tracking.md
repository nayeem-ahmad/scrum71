# Story 4.1a: Spent Time Tracking

## Status
Complete (June 11, 2026)

## Story
**As a** developer,
**I want** to log time I've spent on a card (in addition to estimate and remaining),
**so that** the team can see effort actually invested and compute accurate burndown.

## Acceptance Criteria
1. Card modal exposes spent time alongside `initialEstimate` and `remainingHours`
2. Time can be logged as discrete entries, each with `hours` (decimal), `userId`, and `date`
3. A card's total `spentHours` is derived from the sum of its time log entries
4. Adding a log entry updates the card in Firestore atomically
5. Entries can be edited or deleted by the user who created them
6. Card display shows a spent/estimate summary (e.g. `3.5 / 8h`)
7. The default date on a new entry is today; user can back-date
8. Entries persist in a `timeLogs` array on the card document (single document, not subcollection) for MVP simplicity

## Tasks / Subtasks

- [x] Task 1: Data Model
  - [x] Add `spentHoursLog: Array<{id, spentHours, userId, timestamp, note?}>` to Card schema
  - [x] Derive total spent at read time via `getSpentHours(card)`

- [x] Task 2: Card Modal UI
  - [x] Spent time row in Time Tracking section with hours, datetime, optional note
  - [x] Spent log list in history panel
  - [x] Summary bar shows Estimate → Spent | Remaining

- [x] Task 3: Derivation Helpers
  - [x] `getSpentHours(card)` in `utils.js`
  - [x] Used in card display, list totals, and burndown aggregation

- [x] Task 4: Card Display
  - [x] Card time badge shows `spent / estimate` with over-budget styling

- [x] Task 5: Persistence
  - [x] Add/delete via `updateCard` + `saveState` (guest and Firestore paths)

## Dev Notes
- Implemented as `spentHoursLog` (not `timeLogs`) for consistency with `remainingHoursLog`.
- Delete restricted to entry author via `userId` matching.