# Story 5.1: File Attachments on Cards

## Status
Complete (June 11, 2026)

## Story
**As a** user,  
**I want** to attach files to cards,  
**so that** I can reference relevant documents.

## Acceptance Criteria
1. Card modal shows attachments section
2. File upload button allows selecting files
3. Files upload to Firebase Storage
4. Attachments display as list with filename and icon
5. Clicking attachment opens/downloads file
6. Attachments can be deleted
7. Image attachments show thumbnail preview

## Tasks / Subtasks
- [x] Task 1: Data Model & Storage Setup
  - [x] `storage.rules` for `attachments/{boardId}/{cardId}/{fileName}`
  - [x] `attachments` array on Card (`{id, name, url, type, storagePath?, addedAt}`)

- [x] Task 2: Upload UI & Logic
  - [x] Attachments section in card modal with file input + upload button
  - [x] Upload progress indicator
  - [x] Guest mode: data-URL storage (≤500KB); Firebase Storage when configured

- [x] Task 3: Attachment Display
  - [x] List with filename, image thumbnail or file icon, delete button

- [x] Task 4: Card View Indicator
  - [x] Paperclip + count on card face (Story 5.3)

## Dev Notes
- Firebase Storage SDK loaded via `firebase-storage-compat.js`.
- Distinct path: `attachments/{boardId}/{cardId}/{filename}`.