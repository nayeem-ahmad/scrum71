# Story 3.6: Shareable Card URLs

## Status
Complete (June 11, 2026)

## Story
**As a** user,  
**I want** to share a direct link to a card,  
**so that** teammates can jump directly to it.

## Acceptance Criteria
1. Card modal shows "Share" or "Copy Link" action
2. URL format includes board ID and card ID
3. Visiting URL opens board with card modal active
4. URL works for all team members with access
5. Non-members see access denied message
6. Invalid card URLs show not-found message

## Tasks / Subtasks
- [x] Task 1: URL Routing/Parsing
  - [x] URL structure: `?board=<boardId>&card=<cardId>` (optional `project`)
  - [x] `handleCardDeepLink` runs after board loads

- [x] Task 2: Deep Linking Logic
  - [x] Switches board/project from URL params
  - [x] Opens card modal when card is found; error toasts otherwise

- [x] Task 3: UI Actions
  - [x] "Copy Link" button in card modal actions
  - [x] Copies deep link to clipboard with success toast

## Dev Notes
- Ensure race conditions are handled (wait for board data to load before trying to open card).
