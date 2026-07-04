# Story 2.1: Project Entity and Selector

## Status
Complete (June 11, 2026)

## Story
**As a** user,  
**I want** to organize boards under projects,  
**so that** I can group related sprints together.

## Acceptance Criteria
1. Project selector appears in header alongside board selector
2. Projects have name, description, and owner
3. Creating a board prompts project selection
4. Switching projects filters available boards
5. "Manage Projects" button opens project management screen
6. New project can be created from selector dropdown

## Tasks / Subtasks
- [x] Task 1: Project Data Model & Service
  - [x] Project schema with name, description, owner, members, sprintIds, backlog
  - [x] Firestore rules for projects; `createProject`, `updateProject`, `deleteProject` in `store.js`

- [x] Task 2: Project Selector UI
  - [x] Project selector dropdown in header with persistence via `saveState`
  - [x] Quick-create project form in dropdown

- [x] Task 3: Board-Project Association
  - [x] Board creation modal includes project `<select>`
  - [x] `getBoardsForProject()` filters boards by `projectId`

- [x] Task 4: Navigation Integration
  - [x] "Manage projects" in dropdown + header button
  - [x] Project switch updates board view; contextual empty states

## Dev Notes
- Existing `project.js` likely needs refactoring to separate "Project" entity from "Board" entity if they were conflated.
- Ensure backward compatibility for orphan boards if any.
