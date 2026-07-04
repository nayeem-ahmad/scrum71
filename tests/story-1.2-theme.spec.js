// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const BOARD_STATE = {
  currentBoardId: 'b1',
  currentProjectId: 'p1',
  editingCard: null,
  projects: [{ id: 'p1', name: 'Theme Project', description: '', owner: { id: 'u1', name: 'Tester', email: 'test@test.com' }, members: [], sprintIds: ['b1'], backlog: [] }],
  boards: [{
    id: 'b1',
    name: 'Theme Board',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }]
  }]
};

const EMPTY_BOARD_STATE = {
  currentBoardId: null,
  currentProjectId: 'p1',
  editingCard: null,
  projects: [{ id: 'p1', name: 'Empty Project', description: '', owner: { id: 'u1', name: 'Tester', email: 'test@test.com' }, members: [], sprintIds: ['b1'], backlog: [] }],
  boards: [{
    id: 'b1',
    name: 'Unselected Board',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }]
  }]
};

test('AC1: header displays logo, selectors, and user avatar', async ({ page }) => {
  await loadGuestBoard(page, BOARD_STATE);

  await expect(page.locator('.logo-text')).toHaveText('Scrum71');
  await expect(page.locator('#projectSelectorBtn')).toBeVisible();
  await expect(page.locator('#boardSelectorBtn')).toBeVisible();
  await expect(page.locator('.user-avatar')).toBeVisible();
});

test('AC2: board area fills viewport with gradient background', async ({ page }) => {
  await loadGuestBoard(page, BOARD_STATE);

  const boardContainer = page.locator('.board-container');
  await expect(boardContainer).toBeVisible();
  await expect(page.locator('.list')).toBeVisible();

  const bg = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--board-bg').trim()
  );
  expect(bg.length).toBeGreaterThan(0);
});

test('AC3+AC4: theme toggle switches mode and persists in localStorage', async ({ page }) => {
  await loadGuestBoard(page, BOARD_STATE);

  const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

  await page.locator('#themeToggle').click();
  const toggledTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(toggledTheme).not.toBe(initialTheme);

  const stored = await page.evaluate(() => localStorage.getItem('flowboard-theme'));
  expect(stored).toBeTruthy();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.list', { timeout: 12000 });

  const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(afterReload).toBe(toggledTheme);
});

test('AC5: system dark preference applies on first visit when no saved theme', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('flowboard-theme');
  });

  await page.emulateMedia({ colorScheme: 'dark' });
  await loadGuestBoard(page, BOARD_STATE);

  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  expect(theme).toBe('dark');
});

test('AC6: empty state displays when no board is selected', async ({ page }) => {
  await loadGuestBoard(page, EMPTY_BOARD_STATE);

  await expect(page.locator('.board-container .empty-state')).toBeVisible();
  await expect(page.locator('.board-container .empty-state')).toContainText(/no boards|select a project/i);
});