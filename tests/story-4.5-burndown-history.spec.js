// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const BOARD_ID = 'b-burndown';

const BURNDOWN_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'Burndown Sprint',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    history: [
      { date: '2026-06-01', remaining: 20 },
      { date: '2026-06-02', remaining: 18 },
    ],
    lists: [{
      id: 'l1',
      title: 'In Progress',
      cards: [
        {
          id: 'c1',
          title: 'Task A',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          initialEstimate: 10,
          remainingHoursLog: [
            { id: 'log1', remainingHours: 8, timestamp: '2026-06-10T10:00:00.000Z' },
          ],
        },
        {
          id: 'c2',
          title: 'Task B',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          initialEstimate: 5,
          remainingHoursLog: [
            { id: 'log2', remainingHours: 5, timestamp: '2026-06-10T10:00:00.000Z' },
          ],
        },
      ],
    }],
  }],
};

test('AC1+AC2+AC4+AC5: board render records today in burndown history', async ({ page }) => {
  await loadGuestBoard(page, BURNDOWN_STATE);

  const today = new Date().toISOString().slice(0, 10);
  const persisted = await getPersistedState(page);
  const board = persisted.boards.find(b => b.id === BOARD_ID);

  expect(board.history).toBeDefined();
  const todayEntry = board.history.find(h => h.date === today);
  expect(todayEntry).toBeDefined();
  expect(todayEntry.remaining).toBe(13);
});

test('AC3: burndown chart renders when history exists', async ({ page }) => {
  await loadGuestBoard(page, BURNDOWN_STATE);
  await expect(page.locator('#burndownChart')).toBeVisible();
  await expect(page.locator('#totalRemainingValue')).toHaveText('13 h');
});