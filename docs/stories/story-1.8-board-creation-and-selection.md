# Story 1.8: Board Creation and Selection

## Status
✅ **Implemented with Firestore Persistence**

## Implementation Details
- **Date Completed**: April 23, 2026
- **Files Updated**: `src/js/store.js`, `src/js/app.js`
- **Firestore Integration**: ✅ Complete
- **Features Implemented**:
  - `createBoard()`: Creates new boards with Firestore persistence
  - `updateBoard()`: Updates board properties with Firestore persistence
  - Board selector dropdown with all user boards
  - "Create new board" modal with name and background color picker
  - Gradient preset color options
  - New boards appear in selector and become active
  - Current board name displayed in header
  - Sprint properties editing (name, goal, dates)
  - Optimistic UI updates with rollback on error

## Story

**As a** user,  
**I want** to create new boards and switch between them,  
**so that** I can manage multiple projects.

## Acceptance Criteria
1. Board selector dropdown lists all user boards
2. Clicking board name switches active board
3. "Create new board" button opens creation modal
4. Board creation form accepts name and background color
5. Color picker offers gradient presets
6. New board appears in selector and becomes active
7. Board selector shows current board name

## Tasks / Subtasks

- [ ] Task 1: Board Selector (AC: 1, 2, 7)
  - [ ] Populate dropdown with user boards from Firestore
  - [ ] Switch active board on selection
  - [ ] Display current board name in header

- [ ] Task 2: Create Board Modal (AC: 3, 4)
  - [ ] Open modal from "Create new board" button
  - [ ] Accept board name and background color
  - [ ] Validate name and color selection
  - [ ] Create board document in Firestore

- [ ] Task 3: Gradient Presets (AC: 5)
  - [ ] Offer preset gradient options in color picker
  - [ ] Preview selected gradient in modal

- [ ] Task 4: Post-Creation Updates (AC: 6)
  - [ ] Add new board to selector list
  - [ ] Set newly created board as active
  - [ ] Persist active board in local state

- [ ] Task 5: Manual Testing
  - [ ] Selector lists boards and switches correctly
  - [ ] Creation modal validates and creates new board
  - [ ] New board becomes active and visible in header

## Dev Notes

### File Locations

- **Project Module:** `src/js/project.js` - Board selector and creation logic
- **Store Module:** `src/js/store.js` - Board CRUD and active state
- **App Module:** `src/js/app.js` - Initialization and header integration
- **Main HTML:** `index.html` - Selector and modal containers
- **Main Styles:** `styles.css` - Header and modal styles

### Data Models

**Board Model** [Source: architecture/data-models.md#board]:

- `id`: string
- `name`: string
- `background`: string (color/gradient)
- `createdAt`: timestamp
- `updatedAt`: timestamp

### Firestore Collections

Collection: boards/

- Document ID: auto-generated
- Fields: name, background, createdAt, updatedAt

### Core Workflows

[Source: architecture/core-workflows.md#board-management]

- Create board → Firestore write → Update selector → Set active
- Switch board → Load lists/cards → Update UI

### Integration Points

- Header shows current board name and selector
- Board background applied to board area

## Change Log

| Date       | Version | Description           | Author       |
|------------|---------|-----------------------|--------------|
| 2026-01-09 | 1.0.0   | Initial story draft   | BMad Master  |

---

## Dev Agent Record

To be filled by Dev Agent.

## QA Results

To be filled by QA Agent.
