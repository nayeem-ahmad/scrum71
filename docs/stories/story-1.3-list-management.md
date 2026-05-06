# Story 1.3: List Management

## Status
✅ **Implemented with Firestore Persistence**

## Implementation Details
- **Date Completed**: April 23, 2026
- **Files Updated**: `src/js/store.js`, `src/js/board.js`
- **Firestore Integration**: ✅ Complete
- **Features Implemented**:
  - `createList()`: Creates new lists with Firestore persistence
  - `updateListTitle()`: Updates list titles with Firestore persistence
  - `deleteList()`: Deletes lists with Firestore persistence
  - `reorderLists()`: Reorders lists with Firestore persistence
  - Optimistic UI updates with rollback on error
  - Toast notifications for user feedback

## Story
**As a** user,  
**I want** to create, rename, reorder, and delete lists on my board,  
**so that** I can organize my workflow stages.

## Acceptance Criteria
1. "Add another list" button appears after existing lists
2. New list form accepts title and creates list on submit
3. List title is editable inline by clicking
4. List menu provides Move Left, Move Right, Copy, Clear, Delete actions
5. Lists can be dragged to reorder
6. List card count badge updates dynamically
7. Changes persist to Firestore immediately

## Tasks / Subtasks

- [ ] Task 1: Add Another List Button (AC: 1)
  - [ ] Create "Add another list" button HTML element
  - [ ] Style button with icon and text
  - [ ] Position button after the last list
  - [ ] Implement responsive behavior for narrow screens

- [ ] Task 2: List Creation Form (AC: 2)
  - [ ] Create inline form with title input
  - [ ] Show form on button click with focus on input
  - [ ] Implement form submit handler
  - [ ] Generate list ID and create Firestore document
  - [ ] Clear form and close on successful creation
  - [ ] Cancel button reverts to button view

- [ ] Task 3: List Title Inline Editing (AC: 3)
  - [ ] Make list title clickable to enter edit mode
  - [ ] Replace title with input field on click
  - [ ] Auto-focus input field for immediate editing
  - [ ] Save changes on blur or Enter key
  - [ ] Revert on Escape key
  - [ ] Update Firestore document on save

- [ ] Task 4: List Actions Menu (AC: 4)
  - [ ] Add menu button (⋮) to each list header
  - [ ] Create dropdown menu with actions
  - [ ] Implement Move Left action
  - [ ] Implement Move Right action
  - [ ] Implement Copy action (copies list and all cards)
  - [ ] Implement Clear action (removes all cards from list)
  - [ ] Implement Delete action (removes list and all cards)
  - [ ] Add confirmation dialog for destructive actions

- [ ] Task 5: Drag-and-Drop List Reordering (AC: 5)
  - [ ] Make lists draggable
  - [ ] Show visual feedback during drag (highlight, shadow)
  - [ ] Update list order on drop
  - [ ] Persist new order to Firestore

- [ ] Task 6: Card Count Badge (AC: 6)
  - [ ] Display count of cards in each list
  - [ ] Update count in real-time as cards are added/removed
  - [ ] Format count display (e.g., "5")
  - [ ] Hide or show badge based on count

- [ ] Task 7: Firestore Persistence (AC: 7)
  - [ ] Implement list creation in Firestore
  - [ ] Implement list update in Firestore
  - [ ] Implement list deletion in Firestore
  - [ ] Handle real-time updates from Firestore
  - [ ] Implement optimistic UI updates with rollback on error

- [ ] Task 8: Manual Testing
  - [ ] Test creating new list
  - [ ] Test renaming list title
  - [ ] Test all menu actions (Move, Copy, Clear, Delete)
  - [ ] Test drag-and-drop reordering
  - [ ] Test card count badge updates
  - [ ] Test Firestore persistence across page reload
  - [ ] Test error handling for failed operations

## Dev Notes

### File Locations
- **Board Module:** `src/js/board.js` - List management logic
- **Store Module:** `src/js/store.js` - Firestore list operations
- **App Module:** `src/js/app.js` - Event listeners and initialization
- **Main HTML:** `index.html` - List HTML structure
- **Main Styles:** `styles.css` - List styling and drag-drop feedback

### Data Models
**List Model** [Source: architecture/data-models.md#list]:
- `id`: string - Unique list identifier
- `boardId`: string - Reference to parent board
- `title`: string - List name
- `order`: number - Display order (0, 1, 2, etc.)
- `createdAt`: timestamp - Creation date
- `updatedAt`: timestamp - Last modification date

### Firestore Collections
**boards/{boardId}/lists/**
- Document ID: auto-generated
- Fields: title, order, createdAt, updatedAt

### Core Workflows
[Source: architecture/core-workflows.md#board-list-management]
- List Create: User clicks button → Form → Firestore write → UI update
- List Rename: User clicks title → Edit mode → Firestore update → UI update
- List Reorder: User drags → Firestore batch update → UI reflects new order

### Integration Points
- Board module: Get list collection for active board
- Real-time updates: Listen to board lists subcollection
- Card count: Query card count in each list

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-09 | 1.0.0 | Initial story draft | BMad Master |

---

## Dev Agent Record
_To be filled by Dev Agent_

## QA Results
_To be filled by QA Agent_

