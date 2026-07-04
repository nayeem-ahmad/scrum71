# Story 3.5: Card Comments

## Status
Complete (June 11, 2026)

## Story
**As a** team member,  
**I want** to add comments to cards,  
**so that** I can discuss work with teammates.

## Acceptance Criteria
1. Card modal shows comments section
2. Text input allows adding new comment
3. Comments show author, timestamp, and content
4. Comments are ordered newest-first or oldest-first (toggle)
5. Comment author can delete their own comments
6. Comments persist with card data

## Tasks / Subtasks
- [x] Task 1: Data Model
  - [x] Define `Comment` schema (id, authorId, author, content, createdAt)
  - [x] Add `comments` array to Card schema

- [x] Task 2: Comment Section UI
  - [x] Add Comments area to Card Modal
  - [x] Create "Add Comment" text area + submit button
  - [x] Render list of existing comments (with Author info & relative time)

- [x] Task 3: Comment Actions
  - [x] Implement Add Comment logic
  - [x] Implement Delete Comment logic (permission check: author only)
  - [x] Newest/oldest sort toggle

- [ ] Task 4: Real-time Updates
  - [ ] Ensure comments update in real-time for open modals (multi-user)

## Dev Notes
- Use `date-fns` `formatDistanceToNow` for friendly timestamps (e.g., "2 hours ago").
- If comments are expected to be numerous, a subcollection `cards/{cardId}/comments` is better than an array.
