# Story 1.7: Drag and Drop Cards

## Status
✅ **Implemented with Firestore Persistence**

## Implementation Details
- **Date Completed**: April 23, 2026
- **Files Updated**: `src/js/store.js`, `src/js/board.js`
- **Firestore Integration**: ✅ Complete
- **Features Implemented**:
  - `moveCard()`: Moves cards between lists with Firestore persistence
  - Drag-and-drop with visual feedback
  - Drop zone highlighting
  - Card reordering within and between lists
  - Real-time persistence to Firestore
  - Optimistic UI updates with rollback on error
  - Smooth transition animations

## Story

**As a** user,  
**I want** to drag cards between lists and reorder within lists,  
**so that** I can update work status visually.

## Acceptance Criteria
1. Cards are draggable with visual feedback (rotation, shadow)
2. Drop zones highlight when card hovers over list
3. Cards can be dropped between other cards with insertion indicator
4. Card order persists after drop
5. Moving card to different list updates status
6. Animation provides smooth transition feedback
7. Touch devices support drag gestures

## Tasks / Subtasks

- [ ] Task 1: Drag Source (AC: 1)
  - [ ] Make card elements draggable
  - [ ] Add visual feedback (shadow, slight rotation)

- [ ] Task 2: Drop Targets (AC: 2, 3)
  - [ ] Highlight lists on hover
  - [ ] Show insertion indicator between cards

- [ ] Task 3: Persistence (AC: 4, 5)
  - [ ] Update card `order` within list on drop
  - [ ] Update `listId` when moved across lists
  - [ ] Persist changes to Firestore (batch for reorders)

- [ ] Task 4: Animations (AC: 6)
  - [ ] Smooth transition animation on drop
  - [ ] Optimize for 60fps using CSS transforms

- [ ] Task 5: Touch Support (AC: 7)
  - [ ] Implement touch gestures or use compatible DnD lib
  - [ ] Test on mobile devices

- [ ] Task 6: Manual Testing
  - [ ] Reorder cards within list
  - [ ] Move card across lists
  - [ ] Verify persistence and live updates
  - [ ] Verify animations and touch support

## Dev Notes

### File Locations

- **Board Module:** `src/js/board.js` - DnD handlers and UI state
- **Store Module:** `src/js/store.js` - Batch updates for order/list changes
- **Main Styles:** `styles.css` - Drag visuals and transitions

### Data Models

**Card Fields Impacted:**

- `order`: number
- `listId`: string
- `updatedAt`: timestamp

### Firestore Collections

Collection: boards/{boardId}/lists/{listId}/cards/

- Batch updates required for order recalculation

### Core Workflows

[Source: architecture/core-workflows.md#drag-and-drop]

- Start drag → hover targets → drop → persist updates → UI refresh

### Integration Points

- Accessibility: Provide non-drag affordances if needed
- Performance: Throttle hover updates; use transforms

## Change Log

| Date       | Version | Description           | Author       |
|------------|---------|-----------------------|--------------|
| 2026-01-09 | 1.0.0   | Initial story draft   | BMad Master  |

---

## Dev Agent Record

To be filled by Dev Agent.

## QA Results

To be filled by QA Agent.
