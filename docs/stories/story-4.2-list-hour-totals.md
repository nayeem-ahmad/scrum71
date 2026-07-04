# Story 4.2: List Hour Totals

## Status
Complete (June 11, 2026)

## Story
**As a** scrum master,  
**I want** to see total hours per list,  
**so that** I can gauge column workload.

## Acceptance Criteria
1. List header shows total initial estimate badge
2. List header shows total remaining hours badge
3. Badges update when cards are added/moved/edited
4. Different styling distinguishes estimate vs remaining
5. Tooltips explain badge meanings

## Tasks / Subtasks
- [x] Task 1: Calculation Logic
  - [x] `getListHourTotals(list)` sums `initialEstimate` and effective remaining hours

- [x] Task 2: UI Integration in List Header
  - [x] `createListElement` displays estimate and remaining badges

- [x] Task 3: Real-time Updates
  - [x] `renderBoard()` refreshes badges on card changes

- [x] Task 4: Styling & Tooltips
  - [x] Distinct `.estimate` / `.remaining` classes with descriptive `title` attributes

## Dev Notes
- Performance: Ensure calculations are not overly expensive, especially with many cards/lists.
- Consider memoization for calculation results if needed.