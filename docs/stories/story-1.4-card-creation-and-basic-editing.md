# Story 1.4: Card Creation and Basic Editing

## Status
✅ **Implemented with Firestore Persistence**

## Implementation Details
- **Date Completed**: April 23, 2026
- **Files Updated**: `src/js/store.js`, `src/js/app.js`, `src/js/board.js`
- **Firestore Integration**: ✅ Complete
- **Features Implemented**:
  - `createCard()`: Creates new cards with Firestore persistence
  - `updateCard()`: Updates card properties with Firestore persistence
  - `deleteCard()`: Deletes cards with Firestore persistence
  - Card modal with full editing capabilities
  - Duplicate card functionality
  - Delete card functionality with confirmation
  - Optimistic UI updates with rollback on error
  - Toast notifications for user feedback

## Story


**As a** user,  
**I want** to create cards and edit their basic properties,  
**so that** I can track individual work items.

## Acceptance Criteria

1. "Add a card" button appears at bottom of each list
2. Quick-add form accepts title and creates card
3. Clicking card opens modal with full editing
4. Card modal displays title, description fields
5. Card modal has save and cancel buttons
6. Card can be duplicated via modal action
7. Card can be deleted via modal action
8. Changes persist immediately

## Tasks / Subtasks

- [ ] Task 1: Add Card Entry (AC: 1, 2)
  - [ ] Add "Add a card" button to each list footer
  - [ ] Show inline quick-add form with title input
  - [ ] Create card with generated ID and default fields
  - [ ] Clear form and return to button after submit/cancel

- [ ] Task 2: Card Modal (AC: 3, 4, 5)
  - [ ] Implement modal open on card click
  - [ ] Display title and description fields
  - [ ] Implement Save and Cancel actions
  - [ ] Validate minimum title length
  - [ ] Persist changes to Firestore on Save

- [ ] Task 3: Duplicate & Delete (AC: 6, 7)
  - [ ] Implement Duplicate action (clone card with new ID)
  - [ ] Implement Delete action with confirmation dialog
  - [ ] Ensure list/card counts update accordingly

- [ ] Task 4: Persistence (AC: 8)
  - [ ] Write new/updated card to Firestore immediately
  - [ ] Use optimistic UI updates with rollback on error
  - [ ] Subscribe to real-time updates from Firestore

- [ ] Task 5: Manual Testing
  - [ ] Quick-add creates card successfully
  - [ ] Modal edits save and reflect on UI
  - [ ] Duplicate creates separate card
  - [ ] Delete removes card and updates counts
  - [ ] Changes persist across reload

## Dev Notes

### File Locations

- **Board Module:** `src/js/board.js` - Card create/edit UI hooks
- **Store Module:** `src/js/store.js` - Card CRUD Firestore operations
- **App Module:** `src/js/app.js` - Event listeners and initialization
- **Main HTML:** `index.html` - Card modal container markup
- **Main Styles:** `styles.css` - Modal and card styling

### Data Models

**Card Model** [Source: architecture/data-models.md#card]:

- `id`: string - Unique card identifier
- `listId`: string - Parent list reference
- `boardId`: string - Parent board reference
- `title`: string - Card title
- `description`: string - Card description
- `order`: number - Position within list
- `labels`: array of strings - Label IDs
- `dueDate`: timestamp or null - Optional due date
- `checklist`: array of objects - Items if any
- `createdAt`: timestamp
- `updatedAt`: timestamp


### Firestore Collections

Collection: boards/{boardId}/lists/{listId}/cards/

- Document ID: auto-generated
- Fields: title, description, order, labels, dueDate, checklist, createdAt, updatedAt

### Core Workflows

[Source: architecture/core-workflows.md#card-management]

- Card Create: Quick-add → Firestore write → UI update
- Card Edit: Modal → Firestore update → UI update
- Card Duplicate/Delete: Action → Firestore write/delete → UI update

### Integration Points

- Board module: Render cards per list; open modal
- Real-time updates: Listen to list cards subcollection
- Count badges: Update list card counts

## Change Log

| Date       | Version | Description           | Author       |
|------------|---------|-----------------------|--------------|
| 2026-01-09 | 1.0.0   | Initial story draft   | BMad Master  |



---

## Dev Agent Record

To be filled by Dev Agent.

## QA Results

To be filled by QA Agent.
