// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const BOARD_ID = 'b-list-hours';
const LIST_A = 'la';
const LIST_B = 'lb';
const CARD_A = 'ca';
const CARD_B = 'cb';

const LIST_HOURS_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'List Hours Board',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [
      {
        id: LIST_A,
        title: 'To Do',
        cards: [{
          id: CARD_A,
          title: 'Task A',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          comments: [],
          initialEstimate: 8,
          remainingHoursLog: [{ id: 'r1', remainingHours: 6, timestamp: '2026-06-10T10:00:00.000Z' }],
          spentHoursLog: [],
        }],
      },
      {
        id: LIST_B,
        title: 'Doing',
        cards: [{
          id: CARD_B,
          title: 'Task B',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          comments: [],
          initialEstimate: 4,
          remainingHoursLog: [{ id: 'r2', remainingHours: 2, timestamp: '2026-06-10T10:00:00.000Z' }],
          spentHoursLog: [],
        }],
      },
    ],
  }],
};

test('AC1+AC2+AC4+AC5: list headers show estimate and remaining badges with tooltips', async ({ page }) => {
  await loadGuestBoard(page, LIST_HOURS_STATE);

  const listA = page.locator(`.list[data-list-id="${LIST_A}"]`);
  await expect(listA.locator('.list-hour-badge.estimate')).toHaveText('8h');
  await expect(listA.locator('.list-hour-badge.remaining')).toHaveText('6h');
  await expect(listA.locator('.list-hour-badge.estimate')).toHaveAttribute('title', /initial estimates/i);
  await expect(listA.locator('.list-hour-badge.remaining')).toHaveAttribute('title', /remaining hours/i);

  const listB = page.locator(`.list[data-list-id="${LIST_B}"]`);
  await expect(listB.locator('.list-hour-badge.estimate')).toHaveText('4h');
  await expect(listB.locator('.list-hour-badge.remaining')).toHaveText('2h');
});

test('AC3: zero-hour lists hide hour badges', async ({ page }) => {
  const zeroState = {
    ...LIST_HOURS_STATE,
    boards: [{
      ...LIST_HOURS_STATE.boards[0],
      lists: [{
        id: 'lz',
        title: 'Empty Hours',
        cards: [{
          id: 'cz',
          title: 'No Hours',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          comments: [],
          initialEstimate: 0,
          remainingHoursLog: [],
          spentHoursLog: [],
        }],
      }],
    }],
  };
  await loadGuestBoard(page, zeroState);
  const listZ = page.locator('.list[data-list-id="lz"]');
  await expect(listZ.locator('.list-hour-badge')).toHaveCount(0);
  await expect(listZ.locator('.list-count')).toHaveText('1');
});

test('AC4: list remaining badge updates when card remaining hours change', async ({ page }) => {
  await loadGuestBoard(page, LIST_HOURS_STATE);
  await page.locator(`.card[data-card-id="${CARD_A}"]`).click();
  await page.locator('#rhNewHours').fill('3');
  await page.locator('#rhAddEntryBtn').click();

  await page.locator('#cancelCardBtn').click();
  const listA = page.locator(`.list[data-list-id="${LIST_A}"]`);
  await expect(listA.locator('.list-hour-badge.remaining')).toHaveText('3h');
});