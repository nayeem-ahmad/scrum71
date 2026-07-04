# Story 3.3: Team Member List and Roles

## Status
Complete (June 11, 2026)

## Story
**As a** project owner,  
**I want** to view and manage team members,  
**so that** I can control project access.

## Acceptance Criteria
1. Project info modal shows team members list
2. Each member shows avatar, name, email, and role
3. Owner is clearly indicated
4. Member roles include: owner, admin, member
5. Members can be removed by owner/admin
6. Team count badge shows total members

## Tasks / Subtasks
- [x] Task 1: Member Data Handling
  - [x] `getProjectTeamMembers()` with `TEAM_ROLES` constants
  - [x] Project-level team (owner + members array)

- [x] Task 2: Member List UI
  - [x] Project info modal + PM Team tab with avatar, name, email, role badges
  - [x] Team count badge includes owner
  - [x] Remove button shown only for owner/admin on non-owner members

- [x] Task 3: Management Actions
  - [x] Remove member with `updateProject` persistence
  - [x] Promote/demote admin role (owner/admin only)
  - [x] Clears assignee from project cards when member removed

## Dev Notes
- Ensure one cannot remove themselves if they are the only owner.
- Optimizing user profile fetching (batch fetch or cache) is important for performance.
