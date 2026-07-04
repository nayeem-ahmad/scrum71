# Story 4.6: Per-Person Burndown

## Status
Complete (June 11, 2026)

## Story
**As a** scrum master,
**I want** to view a burndown chart filtered to a single team member,
**so that** I can see individual workload progress alongside the team total.

## Acceptance Criteria
1. Burndown panel has an "Assignee" filter dropdown (default: "All team")
2. Dropdown lists all project team members plus an "All team" option
3. Selecting a member filters the chart to cards assigned to that member
4. Filtered chart shows the member's remaining work (actual line) and their ideal trend
5. Ideal trend is scaled to the member's starting total for the sprint, not the team total
6. Switching filter re-renders without reloading the page
7. "All team" restores the team-wide view (same as story 4.3)
8. Cards with no assignee are excluded from per-member views but included in "All team"

## Tasks / Subtasks

- [x] Task 1: Aggregation Refactor
  - [x] Filter cards by `assigneeId` before summing burndown data

- [x] Task 2: UI — Filter Dropdown
  - [x] `#burndownAssigneeFilter` select in panel header

- [x] Task 3: Ideal Line Scaling
  - [x] Ideal line uses filtered member's total `initialEstimate`

- [x] Task 4: Snapshot Schema
  - [x] `byAssignee: { [userId]: remainingHours }` on daily `board.history` entries

- [x] Task 5: Persistence of User Preference
  - [x] `localStorage` key `flowboard-burndown-filter-{projectId}`

## Dev Notes
- Replaced Team/Per Person toggle buttons with single assignee filter dropdown.
- Per-person multi-line overlay mode removed in favour of story-aligned filter UX.