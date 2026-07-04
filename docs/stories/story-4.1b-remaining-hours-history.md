# Story 4.1b: Per-Card Remaining Hours History

## Status
Complete (June 11, 2026)

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

- [x] Task 1: Card Modal Tab
  - [x] Time Tracking section with remaining hours inputs and history toggle
  - [x] Badge on section header shows effective remaining hours

- [x] Task 2: Per-Card Burndown Chart
  - [x] Chart.js line chart in history panel (`cardRemainingChart`)

- [x] Task 3: Add Entry Form
  - [x] Remaining hours + datetime-local; persists via `updateCard`

- [x] Task 4: Entry List
  - [x] Sorted descending; inline edit and delete

- [x] Task 5: Persistence
  - [x] Guest localStorage + Firestore `updateCard` path

- [x] Task 6: Helper Integration
  - [x] `getEffectiveRemainingHours` drives badge, sprint burndown, and `recordDailyBurndown`

## Dev Notes
- History panel is collapsed by default; toggle reveals chart + remaining/spent logs.
- Sprint burndown panel updates when remaining entries change via `renderBoard`.