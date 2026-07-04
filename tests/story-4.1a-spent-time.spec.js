// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const BOARD_ID = 'b-time';
const LIST_ID = 'l1';
const CARD_ID = 'c1';

const TIME_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'Time Board',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{
      id: LIST_ID,
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Time Card',
        description: '',
        labels: [],
        dueDate: '',
        checklist: [],
        comments: [],
        initialEstimate: 8,
        remainingHoursLog: [],
        spentHoursLog: [],
      }],
    }],
  }],
};

test('AC1+AC3+AC6: log spent time updates summary and card face badge', async ({ page }) => {
  await loadGuestBoard(page, TIME_STATE);
  await page.locator('.card').click();
  await expect(page.locator('#cardModal')).toHaveClass(/active/);

  await expect(page.locator('#tsSummaryEst')).toHaveText('8h');
  await page.locator('#shNewHours').fill('3');
  await page.locator('#shAddEntryBtn').click();
  await expect(page.locator('.toast.success')).toContainText('Time logged');

  await expect(page.locator('#tsSummarySpent')).toHaveText('3h');
  await page.locator('#rhHistoryToggle').click();
  await expect(page.locator('#shLogList')).toContainText('+3h');

  await page.locator('#cancelCardBtn').click();
  await expect(page.locator('.card-meta-item')).toContainText('3 / 8h');

  const persisted = await getPersistedState(page);
  const card = persisted.boards[0].lists[0].cards[0];
  expect(card.spentHoursLog).toHaveLength(1);
  expect(card.spentHoursLog[0].spentHours).toBe(3);
  expect(card.spentHoursLog[0].userId).toBeTruthy();
});

test('AC5: author can delete own spent time entry', async ({ page }) => {
  const stateWithSpent = {
    ...TIME_STATE,
    boards: [{
      ...TIME_STATE.boards[0],
      lists: [{
        ...TIME_STATE.boards[0].lists[0],
        cards: [{
          ...TIME_STATE.boards[0].lists[0].cards[0],
          spentHoursLog: [{
            id: 'sh1',
            spentHours: 2,
            timestamp: '2026-06-10T10:00:00.000Z',
            userId: 'u1',
            note: 'Setup',
          }],
        }],
      }],
    }],
  };

  await loadGuestBoard(page, stateWithSpent);
  await page.locator('.card').click();
  await page.locator('#rhHistoryToggle').click();
  await expect(page.locator('#shLogList')).toContainText('+2h');

  await page.locator('#shLogList .sh-delete-btn').click();
  await expect(page.locator('#tsSummarySpent')).toHaveText('0h');

  const persisted = await getPersistedState(page);
  expect(persisted.boards[0].lists[0].cards[0].spentHoursLog).toHaveLength(0);
});