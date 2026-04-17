# Story 4.1a: Spent Time Tracking

## Status
Draft

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

- [ ] Task 1: Data Model
  - [ ] Add `timeLogs: Array<{id, hours, userId, date, note?}>` to Card schema
  - [ ] Remove any previous notion of a single `spentHours` scalar (derive at read time)
  - [ ] Update Firestore security rules so only project members can write `timeLogs`; only entry author can edit/delete their own entry

- [ ] Task 2: Card Modal UI
  - [ ] Add a "Time Log" section to the card modal (below or beside existing time tracking)
  - [ ] Show existing entries as a list: date, author avatar, hours, note, delete button (for own entries)
  - [ ] "Log time" input row: hours (number), date (default today), optional note, Add button
  - [ ] Show derived total: `Spent: <sum>h / Estimate: <initialEstimate>h`

- [ ] Task 3: Derivation Helpers
  - [ ] `getSpentHours(card)` returns sum of `timeLogs[].hours`
  - [ ] Use in card display, list totals, and burndown aggregation

- [ ] Task 4: Card Display
  - [ ] Update card time badge to `spent/estimate` when either is > 0
  - [ ] Overdue state when `spent > estimate` (subtle visual treatment only)

- [ ] Task 5: Persistence
  - [ ] Add/edit/delete entry calls update the card document's `timeLogs` array
  - [ ] Real-time listener reflects updates across clients

## Dev Notes
- Keep `timeLogs` as an embedded array (not subcollection) for MVP: simpler queries, one-document reads, Firestore array ops are sufficient for expected volume (<100 entries/card).
- `remainingHours` stays a manual field (user-controlled). Spent is log-derived. This lets the user adjust scope without double-bookkeeping.
- For burndown, per-day spent is computed by bucketing entries by their `date` field — not by when the entry was created.
