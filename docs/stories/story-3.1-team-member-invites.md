# Story 3.1: Team Member Invites

## Status
Complete (June 11, 2026)

## Story
**As a** project member (any role),
**I want** to invite others to join the project using a shareable link,
**so that** anyone on the team can grow the team without depending on the owner.

## Acceptance Criteria
1. Project info modal shows invite link section to every project member (owner, admin, member)
2. Invite link contains unique token and board/project ID
3. Link can be copied to clipboard with one click — available to all members
4. Link can be regenerated (invalidating old links) — restricted to owner/admin only
5. Regeneration requires confirmation
6. Invite description explains the link's purpose
7. Firestore security rules permit any authenticated member to read the invite token; only owner/admin may write/rotate it

## Tasks / Subtasks
- [x] Task 1: Invite Token Generation
  - [x] Add `inviteToken` field to Project/Board model
  - [x] Implement token generation logic (e.g., UUID or random string)
  - [x] Create function to generate full invite URL

- [x] Task 2: Invite UI in Project Settings
  - [x] Add "Invite Team" section to Project Management/Settings modal
  - [x] Display current invite link (readonly input)
  - [x] Add "Copy Link" button
  - [x] Add "Regenerate Link" button

- [x] Task 3: Logic Implementation
  - [x] Implement "Copy" functionality using Clipboard API
  - [x] Implement "Regenerate" functionality with confirmation dialog
  - [x] Persist new token to Firestore immediately

## Dev Notes
- Ensure the token is secure enough (long random string).
- Invite link format: `app_url/?invite=<token>&board=<id>`
- Open-invite model: any member can share the link, but rotating the token (invalidating outstanding links) is a privileged action — keeps accidental/malicious rotation off the table while still letting everyone grow the team.
- Removal of members remains owner/admin-only (see story 3.3). This story only opens up invitations, not member management.