// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState, waitForCardModalClosed } = require('./helpers');

const PROJECT_ID = 'p1';
const BOARD_ID = 'b1';
const LIST_ID = 'l1';
const CARD_ID = 'c1';

const ASSIGNEE_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Assignee Project',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com' },
    members: [
      { id: 'mem1', name: 'Alice Dev', email: 'alice@test.com', role: 'member' },
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
    members: [
      { id: 'board-only', name: 'Board Only', email: 'boardonly@test.com', role: 'member' },
    ],
    lists: [{
      id: LIST_ID,
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Assign me',
        description: '',
        labels: [],
        dueDate: '',
        checklist: [],
        comments: [],
        assigneeId: null,
        initialEstimate: 0,
        remainingHoursLog: [],
      }],
    }],
  }],
};

async function openCardModal(page) {
  await loadGuestBoard(page, ASSIGNEE_STATE);
  await page.locator('.card').first().click();
  await page.waitForSelector('#cardModal.active', { timeout: 5000 });
}

test('AC1+AC2: assignee dropdown lists project team members only', async ({ page }) => {
  await openCardModal(page);

  await expect(page.locator('#cardAssignee')).toBeVisible();
  const options = page.locator('#cardAssignee option');
  await expect(options).toContainText(['Unassigned', 'Pat Owner', 'Alice Dev']);
  await expect(options).not.toContainText(['Board Only']);
});

test('AC3+AC4+AC5: selecting assignee shows preview and avatar on card face', async ({ page }) => {
  await openCardModal(page);

  await page.locator('#cardAssignee').selectOption('mem1');
  await expect(page.locator('#cardAssigneePreview')).toContainText('Alice Dev');

  await page.locator('#saveCardBtn').click();
  await waitForCardModalClosed(page);

  await expect(page.locator('.card .card-assignee')).toContainText('A');

  const persisted = await getPersistedState(page);
  const card = persisted.boards[0].lists[0].cards.find(c => c.id === CARD_ID);
  expect(card.assigneeId).toBe('mem1');
});

test('AC5+AC6: assignee can be cleared to unassigned', async ({ page }) => {
  const assigned = {
    ...ASSIGNEE_STATE,
    boards: ASSIGNEE_STATE.boards.map(b => ({
      ...b,
      lists: b.lists.map(l => ({
        ...l,
        cards: l.cards.map(c => ({ ...c, assigneeId: 'mem1' })),
      })),
    })),
  };

  await openCardModal(page);
  await page.locator('#cardAssignee').selectOption('');
  await expect(page.locator('#cardAssigneePreview')).toContainText('No assignee');

  await page.locator('#saveCardBtn').click();
  await waitForCardModalClosed(page);

  await expect(page.locator('.card .card-assignee')).toHaveCount(0);
  const persisted = await getPersistedState(page);
  const card = persisted.boards[0].lists[0].cards.find(c => c.id === CARD_ID);
  expect(card.assigneeId).toBeNull();
});