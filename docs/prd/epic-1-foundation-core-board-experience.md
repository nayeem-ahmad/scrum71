# Epic 1: Foundation & Core Board Experience

**Goal**: Deliver a fully functional Kanban board where users can authenticate, create boards with lists, manage cards with basic properties (title, description, labels, due date, checklist), and drag-and-drop cards between lists. This epic establishes the core user experience.

## Story 1.1: User Authentication Setup
**As a** user,  
**I want** to register and sign in with email/password or social providers,  
**so that** I can access my personal boards securely.

**Acceptance Criteria:**
1. Registration form accepts email, password, and display name
2. Login form accepts email and password
3. Google OAuth sign-in button initiates popup flow
4. GitHub OAuth sign-in button initiates popup flow
5. Password reset sends email with reset link
6. Auth state persists across browser sessions
7. Loading screen displays during auth check
8. Error messages display for invalid credentials

## Story 1.2: Basic Board Display and Theme
**As a** user,  
**I want** to see a visually appealing board interface with theme support,  
**so that** I can work comfortably in my preferred color scheme.

**Acceptance Criteria:**
1. Header displays logo, board selector, and user avatar
2. Board area fills viewport below header with gradient background
3. Theme toggle switches between light and dark modes
4. Theme preference persists in localStorage
5. System theme preference is detected on first visit
6. Empty state displays when no board is selected

## ✅ Story 1.3: List Management - **COMPLETED**
**Status**: Implemented with Firestore Persistence (April 23, 2026)  
**As a** user,  
**I want** to create, rename, reorder, and delete lists on my board,  
**so that** I can organize my workflow stages.

**Implementation Details**:
- ✅ Firestore persistence with optimistic UI updates
- ✅ `createList()`, `updateListTitle()`, `deleteList()`, `reorderLists()` functions
- ✅ Error handling with rollback and toast notifications
- ✅ Real-time updates and user feedback

## ✅ Story 1.4: Card Creation and Basic Editing - **COMPLETED**
**Status**: Implemented with Firestore Persistence (April 23, 2026)  
**As a** user,  
**I want** to create cards and edit their basic properties,  
**so that** I can track individual work items.

**Implementation Details**:
- ✅ Firestore persistence with optimistic UI updates
- ✅ `createCard()`, `updateCard()`, `deleteCard()` functions
- ✅ Card modal with full editing capabilities
- ✅ Duplicate and delete card functionality
- ✅ Error handling with rollback and toast notifications

**Acceptance Criteria:**
1. "Add a card" button appears at bottom of each list
2. Quick-add form accepts title and creates card
3. Clicking card opens modal with full editing
4. Card modal displays title, description fields
5. Card modal has save and cancel buttons
6. Card can be duplicated via modal action
7. Card can be deleted via modal action
8. Changes persist immediately

## Story 1.5: Card Labels and Due Dates
**As a** user,  
**I want** to add labels and due dates to cards,  
**so that** I can categorize and schedule work.

**Acceptance Criteria:**
1. Card modal shows label picker with color options
2. Multiple labels can be selected per card
3. Selected labels display as colored bars on card
4. Due date picker allows date selection
5. Due date displays on card with icon
6. Overdue dates are highlighted in red
7. Upcoming dates (within 2 days) show warning color

## ✅ Story 1.6: Card Checklists - **COMPLETED**
**Status**: Implemented with Firestore Persistence (April 23, 2026)  
**As a** user,  
**I want** to add checklists to cards,  
**so that** I can break down work into subtasks.

**Implementation Details**:
- ✅ Firestore persistence with optimistic UI updates
- ✅ Add, toggle, and delete checklist items
- ✅ Real-time progress tracking
- ✅ Strikethrough styling for completed items
- ✅ Error handling with rollback and toast notifications

## ✅ Story 1.7: Drag and Drop Cards - **COMPLETED**
**Status**: Implemented with Firestore Persistence (April 23, 2026)  
**As a** user,  
**I want** to drag cards between lists and reorder within lists,  
**so that** I can update work status visually.

**Implementation Details**:
- ✅ Firestore persistence with `moveCard()` function
- ✅ Drag-and-drop with visual feedback
- ✅ Drop zone highlighting
- ✅ Card reordering within and between lists
- ✅ Real-time persistence to Firestore
- ✅ Optimistic UI updates with rollback on error

**Acceptance Criteria:**
1. Cards are draggable with visual feedback (rotation, shadow)
2. Drop zones highlight when card hovers over list
3. Cards can be dropped between other cards with insertion indicator
4. Card order persists after drop
5. Moving card to different list updates status
6. Animation provides smooth transition feedback
7. Touch devices support drag gestures

## ✅ Story 1.8: Board Creation and Selection - **COMPLETED**
**Status**: Implemented with Firestore Persistence (April 23, 2026)  
**As a** user,  
**I want** to create new boards and switch between them,  
**so that** I can manage multiple projects.

**Implementation Details**:
- ✅ Firestore persistence with `createBoard()` and `updateBoard()` functions
- ✅ Board selector dropdown with all user boards
- ✅ "Create new board" modal with name and background color picker
- ✅ Gradient preset color options
- ✅ Sprint properties editing (name, goal, dates)
- ✅ Optimistic UI updates with rollback on error

---
