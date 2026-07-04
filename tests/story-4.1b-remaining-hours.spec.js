// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const BOARD_ID = 'b-rh';
const LIST_ID = 'l1';
const CARD_ID = 'c1';

const REMAINING_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'Remaining Sprint',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    lists: [{
      id: LIST_ID,
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Remaining Card',
        description: '',
        labels: [],
        dueDate: '',
        checklist: [],
        comments: [],
        initialEstimate: 10,
        remainingHoursLog: [],
        spentHoursLog: [],
      }],
    }],
  }],
};

test('AC1+AC3+AC9: add remaining entry updates badge, list, and burndown panel', async ({ page }) => {
  await loadGuestBoard(page, REMAINING_STATE);
  await page.locator('.card').click();

  await expect(page.locator('#timeTrackingBadge')).toHaveText('');
  await page.locator('#rhNewHours').fill('6');
  await page.locator('#rhAddEntryBtn').click();
  await expect(page.locator('.toast.success')).toContainText('Entry added');

  await expect(page.locator('#timeTrackingBadge')).toHaveText('6h');
  await expect(page.locator('#tsSummaryRemaining')).toHaveText('6h');
  await expect(page.locator('#totalRemainingValue')).toHaveText('6 h');

  await page.locator('#rhHistoryToggle').click();
  await expect(page.locator('#rhLogList')).toContainText('6 h');
  await expect(page.locator('#cardRemainingChart')).toBeVisible();
});

test('AC6+AC7+AC8: edit and delete remaining hours entry refreshes chart', async ({ page }) => {
  const stateWithEntry = {
    ...REMAINING_STATE,
    boards: [{
      ...REMAINING_STATE.boards[0],
      lists: [{
        ...REMAINING_STATE.boards[0].lists[0],
        cards: [{
          ...REMAINING_STATE.boards[0].lists[0].cards[0],
          remainingHoursLog: [{
            id: 'rh1',
            remainingHours: 8,
            timestamp: '2026-06-10T10:00:00.000Z',
          }],
        }],
      }],
    }],
  };

  await loadGuestBoard(page, stateWithEntry);
  await page.locator('.card').click();
  await page.locator('#rhHistoryToggle').click();

  await page.locator('#rhLogList .rh-edit-btn').click();
  await page.locator('#rhLogList .rh-edit-hours').fill('5');
  await page.locator('#rhLogList .rh-save-edit-btn').click();
  await expect(page.locator('#timeTrackingBadge')).toHaveText('5h');

  await page.locator('#rhLogList .rh-delete-btn').click();
  await expect(page.locator('#timeTrackingBadge')).toHaveText('');
  await expect(page.locator('#totalRemainingValue')).toHaveText('0 h');

  const persisted = await getPersistedState(page);
  expect(persisted.boards[0].lists[0].cards[0].remainingHoursLog).toHaveLength(0);
});