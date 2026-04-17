# Story 3.1: Team Member Invites

## Status
Draft

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
- [ ] Task 1: Invite Token Generation
  - [ ] Add `inviteToken` field to Project/Board model
  - [ ] Implement token generation logic (e.g., UUID or random string)
  - [ ] Create function to generate full invite URL

- [ ] Task 2: Invite UI in Project Settings
  - [ ] Add "Invite Team" section to Project Management/Settings modal
  - [ ] Display current invite link (readonly input)
  - [ ] Add "Copy Link" button
  - [ ] Add "Regenerate Link" button

- [ ] Task 3: Logic Implementation
  - [ ] Implement "Copy" functionality using Clipboard API
  - [ ] Implement "Regenerate" functionality with confirmation dialog
  - [ ] Persist new token to Firestore immediately

## Dev Notes
- Ensure the token is secure enough (long random string).
- Invite link format: `app_url/?invite=<token>&project=<id>`
- Open-invite model: any member can share the link, but rotating the token (invalidating outstanding links) is a privileged action — keeps accidental/malicious rotation off the table while still letting everyone grow the team.
- Removal of members remains owner/admin-only (see story 3.3). This story only opens up invitations, not member management.
