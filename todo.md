# Flowboard Kanban (Scrum71) — Prioritized Task List

Last updated: June 11, 2026  
Sources: `docs/prd/`, `docs/stories/`, `README_STATUS.md`, codebase audit, Playwright test run

---

## Summary

| Priority | Focus | Open tasks |
|----------|-------|------------|
| P0 | Stabilize & verify | 5 |
| P1 | Finish Epic 1 gaps | 4 |
| P2 | Epic 2 — Projects & sprints | 6 |
| P3 | Epic 3 — Team collaboration | 5 |
| P4 | Epic 4 — Time tracking & burndown | 4 |
| P5 | Epic 5 — Enhanced cards | 3 |
| P6 | Infrastructure & tech debt | 2 |

---

## Done (reference)

Epic 1 core board features with Firestore persistence:

- [x] Story 1.3 — List management (`createList`, rename, reorder, delete)
- [x] Story 1.4 — Card creation & editing (modal, duplicate, delete)
- [x] Story 1.6 — Card checklists
- [x] Story 1.7 — Drag & drop cards
- [x] Story 1.8 — Board creation & selection

Partially implemented in code but not fully verified or documented:

- [x] Story 1.1 — Auth (email/password, Google, GitHub, reset)
- [x] Story 1.2 — Board display & theme
- [x] Story 1.5 — Labels & due dates
- [x] Story 2.1 — Project entity & selector
- [x] Story 2.2 — Project management screen
- [x] Story 2.3 — Backlog management (Firestore sync, dates, sort)
- [x] Story 2.4 — Sprint properties (dates, goal, duration in info bar)
- [x] Story 2.5 — Backlog ↔ sprint linking (add/remove, keeps reference)
- [x] Story 3.1 — Team invite links (generate, copy, regenerate)
- [x] Story 3.2 — Join via invite link (`handleInviteLink`)
- [~] Story 3.4 — Card assignee selection (dropdown in card modal)
- [x] Story 4.1 — Card time tracking fields (estimate, remaining hours log)
- [x] Story 4.1a — Spent time tracking (`spentHoursLog`, card badge, author delete)
- [x] Story 4.1b — Remaining hours history (log CRUD, per-card chart, burndown sync)
- [x] Story 4.2 — List hour totals (badges in list headers)
- [x] Story 4.3 — Burndown chart panel (floating panel + Chart.js)
- [x] Story 4.4 — Burndown trend line (ideal dashed line)
- [x] Story 4.6 — Per-person burndown view mode

---

## P0 — Stabilize & verify (do first)

- [x] **Fix failing drag-and-drop test** — fixed double-splice bug in `dropCardToContainer` (`board.js`)
- [x] **Update Playwright tests for async Firestore** — shared helpers in `tests/helpers.js` with localStorage persistence waits
- [x] **Add `npm test` script** — `npm test` runs `playwright test`
- [x] **End-to-end Firebase verification** — `npm run verify:firebase` validates config; rules deployed to `scrum71`; auth UI tested against live Firebase in Playwright
- [x] **Tighten Firestore security rules** — membership-based rules with `memberEmails` + `ownerId` checks; subcollection rules for lists/cards

---

## P1 — Finish Epic 1 gaps

- [x] **Story 1.1 — Verify & harden auth flow**
  - User-friendly Firebase error messages added
  - Auth tab switching (login / register / reset) wired up
  - Playwright tests in `tests/story-1.1-auth-ui.spec.js`
- [x] **Story 1.2 — Verify board display & theme**
  - System theme, persistence, empty state verified via Playwright
  - Playwright tests in `tests/story-1.2-theme.spec.js`
- [x] **Story 1.5 — Verify labels & due dates**
  - Overdue (red) and upcoming (warning) styling verified via Playwright
  - Label bars render on card faces after save
  - Story status updated to Complete (June 11, 2026)
- [x] **Story 1.7 — Touch device drag support** — touch drag handlers + AC7 Playwright test in `story-1.7-drag-and-drop.spec.js`

---

## P2 — Epic 2: Project & sprint management

- [x] **Story 2.1 — Complete project entity & selector**
  - Project/board selectors in header; quick-create project in dropdown
  - Board modal project picker; `getBoardsForProject` filtering
  - Playwright tests in `tests/story-2.1-project-selector.spec.js`
- [x] **Story 2.2 — Polish project management screen**
  - Sidebar, tabs, edit, empty state, exit toggle verified
  - Board selector filters by project; create board requires project
  - Playwright tests in `tests/story-2.2-project-management.spec.js`
- [x] **Story 2.3 — Harden backlog management**
  - Persist backlog to Firestore via `updateProject` / `persistProjectBacklog`
  - Show creation dates on backlog items; sort newest first
  - Playwright tests in `tests/story-2.3-backlog.spec.js`
- [x] **Story 2.4 — Sprint properties UX**
  - Sprint info bar + edit modal with goal, dates, duration preview
  - Auto-calculated duration (`formatSprintDuration`); PM sprints tab updated
  - Playwright tests in `tests/story-2.4-sprint-properties.spec.js`
- [x] **Story 2.5 — Backlog ↔ sprint linking**
  - Add to sprint creates linked card; backlog item stays with `in-sprint` badge
  - Remove from sprint deletes card only; `unlinkBacklogFromCard` on board delete
  - Playwright tests in `tests/story-2.5-backlog-sprint.spec.js`
- [x] **Persist projects to Firestore** — `createProject`, `updateProject`, `deleteProject` in `store.js`; `saveState` syncs all projects/boards

---

## P3 — Epic 3: Team collaboration & sharing

- [x] **Story 3.3 — Team member list & roles**
  - Project info modal + PM Team tab with roles, count, owner/admin remove
  - `getProjectTeamMembers`, `persistProjectTeam` via `updateProject`
  - Playwright tests in `tests/story-3.3-team-members.spec.js`
- [x] **Story 3.4 — Complete card assignee**
  - Assignee dropdown from project team; preview with avatar in modal
  - Assignee avatar on card face; unknown assignee fallback
  - Playwright tests in `tests/story-3.4-card-assignee.spec.js`
- [x] **Story 3.5 — Card comments**
  - Comments section in card modal with sort toggle
  - Add, display (with author + timestamp), delete own comments
  - Persist with card data; comment count on card face
  - Playwright tests in `tests/story-3.5-card-comments.spec.js`
- [x] **Story 3.6 — Shareable card URLs**
  - "Copy Link" in card modal; deep link `?board=X&card=Y`
  - `handleCardDeepLink` opens card modal on visit; error toasts for invalid URLs
  - Playwright tests in `tests/story-3.6-shareable-card-urls.spec.js`
- [x] **Story 3.1/3.2 — Verify invite flow end-to-end**
  - Guest/local `handleInviteLink` validates token against local state
  - `checkInviteLink` dispatched on guest init; regenerate restricted to owner/admin
  - Playwright tests in `tests/story-3.1-3.2-invite.spec.js`

---

## P4 — Epic 4: Time tracking & burndown

- [x] **Story 4.1a — Spent time tracking**
  - `getSpentHours` helper; spent log with `userId`; author-only delete
  - Card face badge `spent / estimate` with over-budget styling
  - Playwright tests in `tests/story-4.1a-spent-time.spec.js`
- [x] **Story 4.1b — Remaining hours history**
  - Log CRUD + per-card chart; time tracking badge; burndown panel sync
  - Playwright tests in `tests/story-4.1b-remaining-hours.spec.js`
- [x] **Story 4.5 — Burndown history tracking**
  - `recordDailyBurndown` snapshots total remaining hours once per day on board render
  - `board.history` drives actual burndown line in chart (card logs as fallback)
  - Playwright tests in `tests/story-4.5-burndown-history.spec.js`
- [x] **Story 4.3 — Burndown panel polish**
  - `.collapsed` class toggle; pointer-drag reposition with localStorage persistence
  - `updateBurndownPanelVisibility` hides panel without sprint dates or on PM screen
  - Playwright tests in `tests/story-4.3-burndown-panel.spec.js`
- [x] **Story 4.2 — List hour totals**
  - `getListHourTotals` helper; estimate + remaining badges in list headers with tooltips
  - Playwright tests in `tests/story-4.2-list-hour-totals.spec.js`
- [x] **Story 4.4 — Burndown ideal trend line**
  - Ideal line from total `initialEstimate` to zero; dashed styling; Actual vs Ideal legend
  - Playwright tests in `tests/story-4.4-burndown-trend-line.spec.js`
- [x] **Story 4.6 — Per-person burndown filter**
  - Assignee dropdown replaces Team/Per Person toggle; `byAssignee` in daily snapshots
  - Member-scoped actual + ideal lines; filter persisted per project in localStorage
  - Playwright tests in `tests/story-4.6-per-person-burndown.spec.js`

---

## P5 — Epic 5: Enhanced card features

- [x] **Story 5.1 — File attachments**
  - Card modal attachments section; guest data-URL + Firebase Storage upload paths
  - List, image thumbnail, download link, delete; `storage.rules` added
  - Playwright tests in `tests/story-5.1-file-attachments.spec.js`
- [x] **Story 5.2 — Project label configuration**
  - PM Labels tab; `DEFAULT_PROJECT_LABELS`; dynamic card label picker from project
  - Playwright tests in `tests/story-5.2-project-labels.spec.js`
- [x] **Story 5.3 — Enhanced card display**
  - Labels, due date, checklist, remaining/spent time, assignee, comments, attachment count on card face
  - Playwright tests in `tests/story-5.3-enhanced-card-display.spec.js`

### UX polish (June 11, 2026)

- [x] PM Labels — inline edit name/color in Labels tab
- [x] Attachments — image lightbox preview + drag-and-drop upload zone
- [x] List headers — hide hour badges when totals are zero
- [x] Burndown — subtitle when assignee filter is not "All team"
- [x] Keyboard — Escape closes lightbox, card modal, project info, and other overlays

### Mobile responsiveness (June 11, 2026)

- [x] Mobile nav drawer — hamburger menu with project/board switch, create, manage
- [x] PM screen — collapsible sidebar drawer + back-to-board on mobile
- [x] Burndown — full-width bottom sheet on ≤768px; drag reposition disabled
- [x] Safe-area insets — header/board padding for notched devices
- [x] Playwright — `story-mobile-responsive.spec.js` on iPhone 14 + Pixel 7

---

## P6 — Infrastructure & tech debt

- [x] **Add root `README.md`** — quick start, Firebase setup link, test commands
- [x] **Sync story docs with reality** — story docs marked Complete where implemented (incl. Story 4.1)
- [x] **Offline support & sync** — improve localStorage ↔ Firestore reconciliation on reconnect
- [x] **Firebase Storage rules** — `storage.rules` for `attachments/{boardId}/{cardId}/{fileName}`
- [x] **Expand Playwright coverage** — add specs for auth, project management, burndown, invites
- [x] **CI pipeline** — `.github/workflows/ci.yml` runs Playwright on push/PR to `main`

---

## Suggested execution order

```
P0 (tests + Firebase) → P1 (close Epic 1) → P2 (projects) → P3 (collaboration) → P4 (burndown polish) → P5 (attachments) → P6 (ongoing)
```

### Next 3 tasks to pick up

1. Refactor CSS styles into modular component styles (P6)
2. Improve web application bundles and asset compression (P6)
3. Integrate advanced state pre-caching or Service Worker for instant startup (P6)

---

## Links

- PRD: `docs/prd/index.md`
- Stories: `docs/stories/`
- Architecture: `docs/architecture/index.md`
- Firebase setup: `FIREBASE_SETUP.md`
- Status snapshot: `README_STATUS.md` (April 23, 2026)