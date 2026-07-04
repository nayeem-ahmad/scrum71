// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const PROJECT_ID = 'p1';
const BOARD_ID = 'b1';

const TEAM_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Team Project',
    description: '',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [
      { id: 'admin1', name: 'Alex Admin', email: 'admin@test.com', role: 'admin', addedAt: '2026-06-01T00:00:00.000Z' },
      { id: 'mem1', name: 'Sam Member', email: 'member@test.com', role: 'member', addedAt: '2026-06-02T00:00:00.000Z' },
    ],
    sprintIds: [BOARD_ID],
    backlog: [],
  }],
  boards: [{
    id: BOARD_ID,
    name: 'Sprint 1',
    projectId: PROJECT_ID,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
  }],
};

test('AC1+AC2+AC3+AC6: project info modal lists team with roles and count', async ({ page }) => {
  await loadGuestBoard(page, TEAM_STATE);
  await page.locator('#projectInfoBtn').click();
  await expect(page.locator('#projectInfoModal')).toHaveClass(/active/);

  await expect(page.locator('#teamCount')).toHaveText('3');
  await expect(page.locator('#teamMembersList')).toContainText('Pat Owner');
  await expect(page.locator('#teamMembersList .role-badge.owner')).toBeVisible();
  await expect(page.locator('#teamMembersList')).toContainText('Alex Admin');
  await expect(page.locator('#teamMembersList .role-badge.admin')).toBeVisible();
  await expect(page.locator('#teamMembersList')).toContainText('Sam Member');
  await expect(page.locator('#teamMembersList .role-badge.member')).toBeVisible();
});

test('AC4+AC5: PM team tab allows owner to remove a member', async ({ page }) => {
  await loadGuestBoard(page, TEAM_STATE);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="team"]').click();

  await expect(page.locator('#pmTeamCount')).toHaveText('3');
  await expect(page.locator('#pmTeamList')).toContainText('Sam Member');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('#pmTeamList .remove-member-btn').last().click();

  await expect(page.locator('#pmTeamList')).not.toContainText('Sam Member');
  await expect(page.locator('#pmTeamCount')).toHaveText('2');

  const persisted = await getPersistedState(page);
  const project = persisted.projects.find(p => p.id === PROJECT_ID);
  expect(project.members).toHaveLength(1);
  expect(project.members[0].email).toBe('admin@test.com');
});