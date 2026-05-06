# Story 1.6: Card Checklists

## Status
✅ **Implemented with Firestore Persistence**

## Implementation Details
- **Date Completed**: April 23, 2026
- **Files Updated**: `src/js/app.js`
- **Firestore Integration**: ✅ Complete
- **Features Implemented**:
  - Checklist section in card modal
  - Add new checklist items with Firestore persistence
  - Toggle item completion with Firestore persistence
  - Delete checklist items with Firestore persistence
  - Real-time progress updates
  - Strikethrough styling for completed items
  - Optimistic UI updates with rollback on error

## Story

**As a** user,  
**I want** to add checklists to cards,  
**so that** I can break down work into subtasks.

## Acceptance Criteria
1. Card modal shows checklist section
2. New checklist items can be added via input
3. Checklist items have checkbox to toggle completion
4. Completed items show strikethrough styling
5. Checklist items can be deleted
6. Card displays checklist progress (e.g., "2/5") when items exist
7. Progress updates in real-time

## Tasks / Subtasks

- [ ] Task 1: Checklist UI (AC: 1, 2)
  - [ ] Add checklist section to card modal
  - [ ] Input to add new checklist items
  - [ ] Render checklist items below input

- [ ] Task 2: Item Completion (AC: 3, 4)
  - [ ] Toggle completion with checkbox
  - [ ] Style completed items with strikethrough

- [ ] Task 3: Item Deletion (AC: 5)
  - [ ] Add delete icon/button to each item
  - [ ] Confirm deletion optionally for UX

- [ ] Task 4: Progress Indicator (AC: 6, 7)
  - [ ] Compute progress as completed/total
  - [ ] Display progress on card tile
  - [ ] Update in real-time on item changes

- [ ] Task 5: Persistence (AC: 1-7)
  - [ ] Save checklist array to Firestore
  - [ ] Use batched updates for multiple item changes
  - [ ] Subscribe to real-time card updates

- [ ] Task 6: Manual Testing
  - [ ] Add, complete, delete items
  - [ ] Verify progress calculation
  - [ ] Verify real-time updates across clients

## Dev Notes

### File Locations

- **Board Module:** `src/js/board.js` - Modal additions and card render
- **Store Module:** `src/js/store.js` - Card update operations
- **Main Styles:** `styles.css` - Checklist and progress styles

### Data Models

**Checklist Item** [Source: architecture/data-models.md#checklist]:

- `id`: string
- `text`: string
- `completed`: boolean

**Card Additions:**

- `checklist`: array of checklist items

### Firestore Collections

Collection: boards/{boardId}/lists/{listId}/cards/

- Fields: checklist (array of objects)

### Core Workflows

[Source: architecture/core-workflows.md#card-checklists]

- Add item → Firestore update → UI render
- Toggle completion → Firestore update → Progress update

### Integration Points

- Accessibility: Labels and focus states for checklist controls
- Performance: Batch updates reduce write operations

## Change Log

| Date       | Version | Description           | Author       |
|------------|---------|-----------------------|--------------|
| 2026-01-09 | 1.0.0   | Initial story draft   | BMad Master  |

---

## Dev Agent Record

To be filled by Dev Agent.

## QA Results

To be filled by QA Agent.
