// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const BOARD_ID = 'sprint-board-1';
const PROJECT_ID = 'p1';

const SPRINT_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Alpha',
    description: '',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
    members: [],
    sprintIds: [BOARD_ID],
    backlog: [],
  }],
  boards: [{
    id: BOARD_ID,
    name: 'Sprint 2',
    projectId: PROJECT_ID,
    goal: 'Ship checkout flow',
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
  }],
};

test('AC3+AC4: sprint goal and dates display in board info bar', async ({ page }) => {
  await loadGuestBoard(page, SPRINT_STATE);

  const bar = page.locator('#sprintInfoBar');
  await expect(bar).not.toHaveClass(/hidden/);
  await expect(page.locator('#sprintGoalDisplay')).toContainText('Ship checkout flow');
  await expect(page.locator('#sprintDatesDisplay')).toContainText('Jun');
});

test('AC6: sprint duration is calculated and shown (14 days)', async ({ page }) => {
  await loadGuestBoard(page, SPRINT_STATE);

  await expect(page.locator('#sprintDatesDisplay')).toContainText('14 days');
});

test('AC1+AC2: sprint settings modal edits goal and dates', async ({ page }) => {
  await loadGuestBoard(page, SPRINT_STATE);

  await page.locator('#editSprintPropsBtn').click();
  await expect(page.locator('#sprintEditModal')).toHaveClass(/active/);

  await page.locator('#sprintEditGoal').fill('Updated sprint goal');
  await page.locator('#sprintEditStart').fill('2026-06-01');
  await page.locator('#sprintEditEnd').fill('2026-06-07');
  await expect(page.locator('#sprintEditDuration')).toContainText('7 days');

  await page.locator('#saveSprintEditBtn').click();
  await expect(page.locator('#sprintEditModal')).not.toHaveClass(/active/);
  await expect(page.locator('#sprintGoalDisplay')).toContainText('Updated sprint goal');
  await expect(page.locator('#sprintDatesDisplay')).toContainText('7 days');

  const persisted = await getPersistedState(page);
  const board = persisted.boards.find(b => b.id === BOARD_ID);
  expect(board.goal).toBe('Updated sprint goal');
  expect(board.endDate).toBe('2026-06-07');
});