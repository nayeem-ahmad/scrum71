# Story 2.3: Project Backlog Management

## Status
Complete (June 11, 2026)

## Story
**As a** product owner,  
**I want** to maintain a backlog of items for my project,  
**so that** I can plan future sprints.

## Acceptance Criteria
1. Backlog tab shows list of backlog items
2. New backlog items can be added with title
3. Backlog items can be edited and deleted
4. Backlog items show creation date
5. Items persist in project data
6. Backlog is separate from sprint boards

## Tasks / Subtasks
- [x] Task 1: Backlog Data Structure
  - [x] Define `BacklogItem` schema (id, title, description, createdAt, status)
  - [x] Add `backlog` array/collection to Project entity in Firestore

- [x] Task 2: Backlog UI List
  - [x] Implement Backlog Tab content in Project Management Screen
  - [x] Render list of items with title and date
  - [x] Sort by creation date (newest first)

- [x] Task 3: Add/Edit/Delete Operations
  - [x] Add "Add Item" input field (quick add)
  - [x] Implement inline editing or modal for item details
  - [x] Implement delete action with confirmation

- [x] Task 4: Persistence
  - [x] Wire up Firestore updates for Backlog operations via `updateProject`
  - [ ] Real-time listener for Project backlog changes

## Dev Notes
- Consider using a sub-collection for backlog items if the list is expected to grow large, otherwise an array on the Project document is simpler for now.
