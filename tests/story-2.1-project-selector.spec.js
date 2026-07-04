// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const PROJECT_A = 'p1';
const PROJECT_B = 'p2';
const BOARD_A = 'b1';
const BOARD_B = 'b2';

const MULTI_PROJECT_STATE = {
  currentBoardId: BOARD_A,
  currentProjectId: PROJECT_A,
  editingCard: null,
  projects: [
    {
      id: PROJECT_A,
      name: 'Alpha',
      description: 'First project',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
      members: [],
      sprintIds: [BOARD_A],
      backlog: [],
    },
    {
      id: PROJECT_B,
      name: 'Beta',
      description: 'Second project',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
      members: [],
      sprintIds: [BOARD_B],
      backlog: [],
    },
  ],
  boards: [
    {
      id: BOARD_A,
      name: 'Sprint A',
      projectId: PROJECT_A,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l1', title: 'To Do', cards: [] }],
    },
    {
      id: BOARD_B,
      name: 'Sprint B',
      projectId: PROJECT_B,
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l2', title: 'To Do', cards: [] }],
    },
  ],
};

test('AC1: project selector appears in header alongside board selector', async ({ page }) => {
  await loadGuestBoard(page, MULTI_PROJECT_STATE);

  await expect(page.locator('#projectSelectorBtn')).toBeVisible();
  await expect(page.locator('#boardSelectorBtn')).toBeVisible();
  await expect(page.locator('#currentProjectName')).toHaveText('Alpha');
  await expect(page.locator('#currentBoardName')).toHaveText('Sprint A');
});

test('AC4: switching projects filters available boards', async ({ page }) => {
  await loadGuestBoard(page, MULTI_PROJECT_STATE);

  await page.locator('#projectSelectorBtn').click();
  await page.locator('#projectList .board-list-item[data-id="p2"]').click();
  await expect(page.locator('#currentProjectName')).toHaveText('Beta');

  await page.locator('#boardSelectorBtn').click();
  const names = await page.locator('#boardList .board-item-name').allTextContents();
  expect(names.map(t => t.trim())).toEqual(['Sprint B']);
});

test('AC5: Manage Projects opens project management screen', async ({ page }) => {
  await loadGuestBoard(page, MULTI_PROJECT_STATE);

  await page.locator('#projectSelectorBtn').click();
  await page.locator('#headerManageProjectsBtn').click();
  await expect(page.locator('#projectManagementScreen')).not.toHaveClass(/hidden/);
});

test('AC6: new project can be created from selector dropdown', async ({ page }) => {
  await loadGuestBoard(page, { ...MULTI_PROJECT_STATE, projects: [], boards: [], currentProjectId: null, currentBoardId: null });

  await page.locator('#projectSelectorBtn').click();
  await page.locator('#createProjectBtn').click();
  await page.locator('#quickProjectName').fill('Gamma Project');
  await page.locator('#quickCreateProjectBtn').click();

  await expect(page.locator('.toast.success')).toContainText('Gamma Project');
  await expect(page.locator('#currentProjectName')).toHaveText('Gamma Project');

  const persisted = await getPersistedState(page);
  expect(persisted.projects.some(p => p.name === 'Gamma Project')).toBe(true);
  expect(persisted.currentProjectId).toBeTruthy();
});

test('AC3: board creation modal includes project selection', async ({ page }) => {
  await loadGuestBoard(page, MULTI_PROJECT_STATE);

  await page.locator('#boardSelectorBtn').click();
  await page.locator('#createBoardBtn').click();
  await expect(page.locator('#boardModal')).toHaveClass(/active/);

  const options = page.locator('#boardProjectSelect option');
  await expect(options).toHaveCount(2);
  await expect(page.locator('#boardProjectSelect')).toHaveValue(PROJECT_A);

  await page.locator('#boardProjectSelect').selectOption(PROJECT_B);
  await page.locator('#boardName').fill('New Sprint');
  await page.locator('#saveBoardBtn').click();

  await expect(page.locator('#boardModal')).not.toHaveClass(/active/);
  const persisted = await getPersistedState(page);
  const newBoard = persisted.boards.find(b => b.name === 'New Sprint');
  expect(newBoard?.projectId).toBe(PROJECT_B);
});

test('empty state when project has no boards', async ({ page }) => {
  const noBoards = {
    ...MULTI_PROJECT_STATE,
    currentBoardId: null,
    boards: MULTI_PROJECT_STATE.boards.filter(b => b.projectId === PROJECT_B),
    projects: [MULTI_PROJECT_STATE.projects[0]],
  };

  await loadGuestBoard(page, noBoards);
  await expect(page.locator('.board-container .empty-state')).toContainText('No boards in "Alpha"');
});