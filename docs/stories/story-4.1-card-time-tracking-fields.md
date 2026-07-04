# Story 4.1: Card Time Tracking Fields

## Status
Complete (June 11, 2026)

## Story
**As a** developer,  
**I want** to log initial estimate and remaining hours on cards,  
**so that** my team can track effort.

## Acceptance Criteria
1. Card modal shows "Initial Estimate (hrs)" number input
2. Card modal shows "Remaining (hrs)" number input — entering a value here creates a new entry in `remainingHoursLog` with the current timestamp
3. Values accept decimal (0.5 increments)
4. Time badge appears on card if any hours > 0
5. Remaining hours can be updated independently; each update appends a new log entry
6. Zero remaining indicates complete
7. The effective remaining hours for a card at any point in time is the latest log entry with `timestamp <= t`

## Tasks / Subtasks
- [x] Task 1: Card Data Model Update
  - [x] Add `initialEstimate` (number) field to Card schema; default to `0`
  - [x] Replace scalar `remainingHours` with `remainingHoursLog: Array<{id, remainingHours, timestamp}>` — default to `[]`
  - [x] Add helper `getEffectiveRemainingHours(card, atTime?)`: returns `remainingHours` from the latest log entry with `timestamp <= atTime` (defaults to now); returns `0` if log is empty
  - [x] Update Firestore security rules to allow project members to append to `remainingHoursLog`

- [x] Task 2: Card Modal UI
  - [x] Add number input for "Initial Estimate (hrs)"
  - [x] Add number input for "Remaining (hrs)" — on save, appends a new log entry (timestamp = now) rather than overwriting a scalar
  - [x] Implement input validation: accept numbers and decimals (e.g., `0.5`, `1`, `1.5`)
  - [x] Pre-populate "Remaining (hrs)" with the latest log entry value (if any)

- [x] Task 3: Card Display Updates
  - [x] Update `createCardElement` to call `getEffectiveRemainingHours(card)` for the time badge
  - [x] Style the time badge clearly (e.g., icon + number)

- [x] Task 4: Persistence
  - [x] On save, append a new `{id, remainingHours, timestamp}` object to `remainingHoursLog` via Firestore array union
  - [x] Persist `initialEstimate` as a direct field update
  - [x] Ensure changing `initialEstimate` does not affect `remainingHoursLog`

## Dev Notes
- `remainingHoursLog` is an embedded array on the card document (not a subcollection) — same rationale as `timeLogs` in Story 4.1a.
- `getEffectiveRemainingHours` is the single source of truth used by card display, list totals (Story 4.2), and sprint burndown (Story 4.3).
- Sorting the log by `timestamp` descending and taking the first entry with `timestamp <= atTime` is sufficient for MVP volumes.
- When a card is first created with an estimate, optionally seed `remainingHoursLog` with one entry (timestamp = creation time, value = `initialEstimate`).
