// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const PM_STATE = {
  currentBoardId: 'b1',
  currentProjectId: 'p1',
  editingCard: null,
  projects: [
    { id: 'p1', name: 'Alpha Project', description: 'First project', owner: { id: 'u1', name: 'Tester', email: 'test@test.com' }, members: [], sprintIds: ['b1'], backlog: [{ id: 'bl1', type: 'story', title: 'User login', status: 'open', addedAt: new Date().toISOString() }] },
    { id: 'p2', name: 'Beta Project', description: 'Second project', owner: { id: 'u1', name: 'Tester', email: 'test@test.com' }, members: [], sprintIds: [], backlog: [] },
  ],
  boards: [{
    id: 'b1',
    name: 'Sprint 1',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    goal: 'Ship MVP',
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }]
  }]
};

test('AC1+AC2: project management screen shows sidebar and detail panel', async ({ page }) => {
  await loadGuestBoard(page, PM_STATE);

  await page.locator('#manageProjectsBtn').click();
  await expect(page.locator('#projectManagementScreen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#pmProjectList .pm-project-item')).toHaveCount(2);
  await expect(page.locator('#pmProjectDetails')).toBeVisible();
  await expect(page.locator('#pmProjectName')).toHaveText('Alpha Project');
});

test('AC3: tabs include Backlog, Sprints, and Team', async ({ page }) => {
  await loadGuestBoard(page, PM_STATE);
  await page.locator('#manageProjectsBtn').click();

  await expect(page.locator('.pm-tab[data-tab="backlog"]')).toBeVisible();
  await expect(page.locator('.pm-tab[data-tab="sprints"]')).toBeVisible();
  await expect(page.locator('.pm-tab[data-tab="team"]')).toBeVisible();

  await page.locator('.pm-tab[data-tab="sprints"]').click();
  await expect(page.locator('#pmTabSprints')).toHaveClass(/active/);
  await expect(page.locator('#pmSprintList')).toContainText('Sprint 1');

  await page.locator('.pm-tab[data-tab="team"]').click();
  await expect(page.locator('#pmTabTeam')).toHaveClass(/active/);
});

test('AC4: project name and description are editable', async ({ page }) => {
  await loadGuestBoard(page, PM_STATE);
  await page.locator('#manageProjectsBtn').click();

  await page.locator('#editProjectBtn').click();
  await expect(page.locator('#pmEditProjectForm')).toBeVisible();

  await page.locator('#pmEditProjectName').fill('Renamed Project');
  await page.locator('#pmEditProjectDesc').fill('Updated description');
  await page.locator('#pmSaveEditProjectBtn').click();

  await expect(page.locator('#pmProjectName')).toHaveText('Renamed Project');
  await expect(page.locator('#pmProjectDesc')).toContainText('Updated description');
});

test('AC5: screen can be exited to return to board view', async ({ page }) => {
  await loadGuestBoard(page, PM_STATE);
  await page.locator('#manageProjectsBtn').click();
  await expect(page.locator('#boardContainer')).toHaveClass(/hidden/);

  await page.locator('#manageProjectsBtn').click();
  await expect(page.locator('#projectManagementScreen')).toHaveClass(/hidden/);
  await expect(page.locator('#boardContainer')).not.toHaveClass(/hidden/);
  await expect(page.locator('.list')).toBeVisible();
});

test('AC6: empty state prompts project creation when none selected', async ({ page }) => {
  const noSelection = {
    ...PM_STATE,
    currentProjectId: null,
  };
  await loadGuestBoard(page, noSelection);
  await page.locator('#manageProjectsBtn').click();

  await expect(page.locator('#pmNoProjectSelected')).toBeVisible();
  await expect(page.locator('#pmNoProjectSelected')).toContainText(/create a new one/i);
});

test('board selector filters boards by selected project', async ({ page }) => {
  const multiBoard = {
    ...PM_STATE,
    boards: [
      ...PM_STATE.boards,
      {
        id: 'b2',
        name: 'Sprint 2',
        projectId: 'p2',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
        members: [],
        lists: [{ id: 'l2', title: 'Backlog', cards: [] }]
      }
    ]
  };

  await loadGuestBoard(page, multiBoard);
  await page.locator('#boardSelectorBtn').click();

  let boardNames = await page.locator('#boardList .board-item-name').allTextContents();
  expect(boardNames.map(t => t.trim())).toEqual(['Sprint 1']);

  await page.locator('#projectSelectorBtn').click();
  await page.locator('#projectList .board-list-item[data-id="p2"]').click();
  await page.locator('#boardSelectorBtn').click();

  boardNames = await page.locator('#boardList .board-item-name').allTextContents();
  expect(boardNames.map(t => t.trim())).toEqual(['Sprint 2']);
});

test('create board requires a project to be selected', async ({ page }) => {
  const noProject = {
    currentBoardId: null,
    currentProjectId: null,
    editingCard: null,
    projects: [],
    boards: [],
  };
  await loadGuestBoard(page, noProject);

  await page.locator('#boardSelectorBtn').click();
  await page.locator('#createBoardBtn').click();

  await expect(page.locator('.toast.warning')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('#projectQuickCreate')).not.toHaveClass(/hidden/, { timeout: 5000 });
});