# Story 4.1b: Per-Card Remaining Hours History

## Status
Draft

## Story
**As a** developer,  
**I want** to view and manage a full history of remaining hour updates for each card,  
**so that** I can log past values I forgot to enter at the time, and see a burndown chart for that individual card.

## Acceptance Criteria
1. Card modal has a "Remaining Hours" tab (alongside existing tabs such as Checklists, Comments)
2. At the top of the tab, a line chart plots timestamp (X-axis) vs remaining hours (Y-axis) for all log entries on this card
3. Below the chart, an "Add Entry" form allows entering:
   - Remaining hours (decimal, required)
   - Timestamp (datetime-local input, defaults to current date-time, editable for back-dating)
4. Entries are listed below the form, sorted by timestamp descending (latest first)
5. Each entry row displays: formatted timestamp, remaining hours value, and a delete button
6. Deleting an entry removes it from `remainingHoursLog` and refreshes the chart
7. Entries can be edited in-place (click to edit timestamp or hours, confirm with Enter/blur)
8. The chart updates in real-time whenever an entry is added, edited, or deleted
9. The tab badge shows the current effective remaining hours (latest entry value)

## Tasks / Subtasks

- [ ] Task 1: Card Modal Tab
  - [ ] Add a "Remaining Hours" tab to the card modal tab bar
  - [ ] Render tab content lazily (only when tab is selected)
  - [ ] Show effective remaining hours as a badge on the tab label

- [ ] Task 2: Per-Card Burndown Chart
  - [ ] Use Chart.js (already a dependency) to render a line chart inside the tab
  - [ ] X-axis: timestamps from `remainingHoursLog` entries, formatted as readable date-time labels
  - [ ] Y-axis: `remainingHours` values; min = 0
  - [ ] Points are connected in chronological order; chart starts at the earliest log entry
  - [ ] Chart is responsive and fits the modal width

- [ ] Task 3: Add Entry Form
  - [ ] Remaining hours: number input (step=0.5, min=0)
  - [ ] Timestamp: `datetime-local` input, pre-filled with current date-time on open
  - [ ] "Add" button appends `{id: uuid, remainingHours, timestamp}` to `remainingHoursLog` via Firestore array union
  - [ ] After adding, clear the hours field and reset timestamp to now; refresh chart and list

- [ ] Task 4: Entry List
  - [ ] Render entries sorted by `timestamp` descending
  - [ ] Each row: formatted local date-time, hours, edit button, delete button
  - [ ] Edit mode: inline inputs for timestamp and hours, confirm on Enter or blur, cancel on Escape
  - [ ] Edit saves by replacing the matching entry (filter by `id`) in `remainingHoursLog`
  - [ ] Delete removes the entry by `id` from `remainingHoursLog`

- [ ] Task 5: Persistence
  - [ ] Add: Firestore `arrayUnion` on `remainingHoursLog`
  - [ ] Edit: Firestore transaction — read doc, replace entry by `id`, write back
  - [ ] Delete: Firestore `arrayRemove` on the matching entry object (or transaction if object equality is unreliable — use transaction + filter by `id`)
  - [ ] All writes trigger the real-time listener, which refreshes the chart and list

- [ ] Task 6: Helper Integration
  - [ ] Ensure `getEffectiveRemainingHours(card, atTime?)` (defined in Story 4.1) is used for the tab badge and exposed for Story 4.3 burndown aggregation

## Dev Notes
- `remainingHoursLog` entries are stored with `timestamp` as an ISO 8601 string (or Firestore Timestamp); normalise to JS `Date` at read time.
- For edit/delete operations, identify entries by their `id` field (UUID generated at creation), not by object equality, to avoid Firestore `arrayRemove` pitfalls with floating-point fields.
- The per-card chart is intentionally simple: no ideal line, no sprint overlay. It shows raw history only.
- Back-dating is intentional — users may enter yesterday's remaining hours; the log is not append-only by wall-clock order.
- Limit chart X-axis to the date range of existing entries; do not extend to sprint start/end here (that is Story 4.3's concern).
