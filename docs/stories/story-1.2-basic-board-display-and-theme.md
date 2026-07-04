# Story 1.2: Basic Board Display and Theme

## Status
✅ **Implemented** (June 11, 2026)

## Implementation Details
- **Files**: `index.html`, `styles.css`, `src/js/app.js`, `src/js/board.js`
- Header with logo, project/board selectors, user avatar, theme toggle
- Board container with gradient `--board-bg` from board settings
- Theme toggle with `data-theme` on `<html>`, persisted to `flowboard-theme` in localStorage
- System `prefers-color-scheme: dark` detected on first visit
- Empty state when no board is selected
- Playwright coverage: `tests/story-1.2-theme.spec.js`

## Story
**As a** user,  
**I want** to see a visually appealing board interface with theme support,  
**so that** I can work comfortably in my preferred color scheme.

## Acceptance Criteria
1. Header displays logo, board selector, and user avatar
2. Board area fills viewport below header with gradient background
3. Theme toggle switches between light and dark modes
4. Theme preference persists in localStorage
5. System theme preference is detected on first visit
6. Empty state displays when no board is selected

## Tasks / Subtasks

- [ ] Task 1: Header Component Structure (AC: 1)
  - [ ] Create header HTML with logo, board selector dropdown, user avatar
  - [ ] Style header with fixed positioning and z-index
  - [ ] Implement responsive layout for mobile

- [ ] Task 2: Board Area Layout (AC: 2, 6)
  - [ ] Create board container that fills remaining viewport
  - [ ] Apply gradient background from board settings
  - [ ] Implement empty state message when no board selected
  - [ ] Add scrolling behavior for horizontal list overflow

- [ ] Task 3: Theme Toggle Implementation (AC: 3, 4, 5)
  - [ ] Add theme toggle button in header
  - [ ] Implement CSS custom properties for light/dark themes
  - [ ] Load theme preference from localStorage on init
  - [ ] Detect system theme using `prefers-color-scheme` media query
  - [ ] Save theme changes to localStorage

- [ ] Task 4: Theme CSS Variables (AC: 3)
  - [ ] Define color variables for light mode
  - [ ] Define color variables for dark mode
  - [ ] Apply theme class to body or root element
  - [ ] Ensure all UI components respect theme variables

- [ ] Task 5: Manual Testing
  - [ ] Verify header displays correctly on desktop
  - [ ] Verify header displays correctly on mobile
  - [ ] Test theme toggle switches colors
  - [ ] Test theme persists after page reload
  - [ ] Test system theme detection on first visit
  - [ ] Test empty state displays when no board

## Dev Notes

### File Locations
- **Main HTML:** `index.html` - Header and board container markup
- **Main Styles:** `styles.css` - Theme variables and layout styles
- **App Module:** `src/js/app.js` - Theme initialization logic
- **Utils Module:** `src/js/utils.js` - localStorage helpers

### Theme Architecture [Source: architecture/components.md]
- Theme state stored in localStorage key: `theme`
- Theme applied via `data-theme` attribute on `<body>`
- CSS custom properties define colors for each theme

### Data Storage
- Theme preference: localStorage (no Firestore needed for personal preference)
- Board background: Firestore board document (`background` field)

## Testing

### Manual Testing Checklist
- [ ] Header shows logo, board selector, user avatar
- [ ] Board fills viewport with gradient background
- [ ] Theme toggle changes UI colors
- [ ] Theme persists after page refresh
- [ ] System theme auto-detected on first visit
- [ ] Empty state shows when no board loaded

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-09 | 1.0.0 | Initial story draft | BMad Master |

---

## Dev Agent Record
_To be filled by Dev Agent_

## QA Results
_To be filled by QA Agent_
