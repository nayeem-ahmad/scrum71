# Story 2.2: Project Management Screen

## Status
✅ **Implemented** (June 11, 2026)

## Implementation Details
- **Files**: `src/js/project.js`, `index.html`, `src/js/app.js`
- Sidebar project list with create form
- Detail panel with Backlog / Sprints / Team tabs
- Editable project name and description via `updateProject()`
- Toggle exit via Manage Projects button
- Empty state when no project selected
- Board selector filters by selected project; board creation requires a project
- Playwright coverage: `tests/story-2.2-project-management.spec.js`

## Story
**As a** user,  
**I want** a dedicated screen to manage project details,  
**so that** I can configure backlogs, sprints, and team.

## Acceptance Criteria
1. Project management screen shows sidebar list of projects
2. Selecting project displays detail panel with tabs
3. Tabs include: Backlog, Sprints, Team
4. Project name/description are editable
5. Screen can be exited to return to board view
6. Empty state prompts project creation

## Tasks / Subtasks
- [ ] Task 1: View Structure & Routing
  - [ ] Create `ProjectManagementView` container
  - [ ] Implement toggle/routing between Board View and Project View
  - [ ] Add close/exit button to return to Board

- [ ] Task 2: Sidebar & Project List
  - [ ] Implement sidebar showing list of user's projects
  - [ ] Add "Create New Project" button in sidebar
  - [ ] Highlight active project

- [ ] Task 3: Details Panel & Tabs
  - [ ] Create main content area with tabs (Backlog, Sprints, Team)
  - [ ] Implement tab switching logic
  - [ ] Render Project Name and Description inputs

- [ ] Task 4: Project Editing
  - [ ] Implement "Save" functionality for Name/Description
  - [ ] validation for required fields

- [ ] Task 5: Empty State
  - [ ] Design and implement view when no project is selected
  - [ ] Call to action to create first project

## Dev Notes
- Reuse existing modal/form styles.
- State management needs to track `viewMode` (Board vs ProjectMgmt).
