# Story 4.6: Per-Person Burndown

## Status
Draft

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

- [ ] Task 1: Aggregation Refactor
  - [ ] Extract burndown data aggregation into a function that accepts an optional `assigneeId` parameter
  - [ ] When `assigneeId` is set, filter cards to `card.assigneeId === assigneeId` before summing
  - [ ] Ensure historical snapshots (story 4.5) store per-assignee breakdown so past data can be re-filtered

- [ ] Task 2: UI — Filter Dropdown
  - [ ] Add a `<select>` control inside the burndown panel header
  - [ ] Populate from the current project's team members
  - [ ] Default selection: "All team"
  - [ ] On change, re-aggregate and re-render the chart

- [ ] Task 3: Ideal Line Scaling
  - [ ] Ideal line anchors at the filtered starting total (not team total)
  - [ ] End point is always zero at sprint end
  - [ ] Handle edge case: member with zero assigned hours → show flat zero line with explanatory empty state

- [ ] Task 4: Snapshot Schema
  - [ ] Daily snapshot (from story 4.5) gains a `byAssignee: { [userId]: remainingHours }` map
  - [ ] Backfill is not required — historical per-person view starts working from the day this ships

- [ ] Task 5: Persistence of User Preference
  - [ ] Remember last-selected filter per project in localStorage so the panel reopens where the user left it

## Dev Notes
- Depends on story 3.4 (assignee selection) being Done — cards must reliably have an `assigneeId`.
- Depends on story 4.5 (history snapshots) for the historical view to be per-person meaningful; without it, only "today" is filterable.
- Keep the chart library (Chart.js) single-dataset plus ideal line — do not attempt small multiples in MVP.
- If spent time (story 4.1a) is shipped, consider a separate "Spent by person" view as a follow-up; MVP filters remaining only.
