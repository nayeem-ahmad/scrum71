# Story 1.5: Card Labels and Due Dates

## Status
✅ **Implemented with Firestore Persistence**

## Implementation Details
- **Date Completed**: June 11, 2026
- **Files Updated**: `src/js/app.js`, `src/js/board.js`, `src/js/store.js`
- **Firestore Integration**: ✅ Complete (via `updateCard` + `saveState`)
- **Features Implemented**:
  - Label picker in card modal with multi-select
  - Colored label bars on card tiles
  - Due date picker with calendar icon on cards
  - Overdue (red) and soon (warning) styling
  - Playwright coverage in `tests/story-1.5-labels-due-dates.spec.js`

## Story
**As a** user,  
**I want** to add labels and due dates to cards,  
**so that** I can categorize and schedule work.

## Acceptance Criteria
1. Card modal shows label picker with color options
2. Multiple labels can be selected per card
3. Selected labels display as colored bars on card
4. Due date picker allows date selection
5. Due date displays on card with icon
6. Overdue dates are highlighted in red
7. Upcoming dates (within 2 days) show warning color

## Tasks / Subtasks

- [ ] Task 1: Label Picker UI (AC: 1, 2)
  - [ ] Add label picker component to card modal
  - [ ] Show preset color options with selection state
  - [ ] Persist label IDs to card document

- [ ] Task 2: Label Rendering (AC: 3)
  - [ ] Render selected labels as colored bars on card tiles
  - [ ] Ensure contrast is accessible per guidelines

- [ ] Task 3: Due Date Picker (AC: 4)
  - [ ] Add due date input to card modal (date picker)
  - [ ] Validate date selection and clear option

- [ ] Task 4: Due Date Indicators (AC: 5, 6, 7)
  - [ ] Display due date on card with calendar icon
  - [ ] Style overdue dates in red
  - [ ] Style upcoming dates (<= 2 days) with warning color

- [ ] Task 5: Persistence and Updates (AC: 1-7)
  - [ ] Save labels and dueDate to Firestore on change
  - [ ] Use optimistic UI update patterns
  - [ ] Subscribe to real-time card updates

- [ ] Task 6: Manual Testing
  - [ ] Select multiple labels and verify rendering
  - [ ] Set due date and verify display
  - [ ] Verify overdue and upcoming styling changes with time

## Dev Notes

### File Locations

- **Board Module:** `src/js/board.js` - Modal UI additions and card render
- **Store Module:** `src/js/store.js` - Card update operations
- **Main Styles:** `styles.css` - Label bars and due date styles

### Data Models

**Label Model** [Source: architecture/data-models.md#label]:

- `id`: string - Label identifier
- `name`: string - Optional name
- `color`: string - Hex or CSS variable

**Card Additions:**

- `labels`: array of strings
- `dueDate`: timestamp or null


### Firestore Collections

Collection: boards/{boardId}/lists/{listId}/cards/

- Fields: labels, dueDate (in addition to base card fields)

### Core Workflows

[Source: architecture/core-workflows.md#card-labels-and-dates]

- Set labels & due date: Modal selection → Firestore update → UI render

### Integration Points

- Accessibility: Ensure color contrast meets WCAG AA
- Date handling: Use local time and format consistently

## Change Log

| Date       | Version | Description           | Author       |
|------------|---------|-----------------------|--------------|
| 2026-01-09 | 1.0.0   | Initial story draft   | BMad Master  |

---

## Dev Agent Record

To be filled by Dev Agent.

## QA Results

To be filled by QA Agent.
