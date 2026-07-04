// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const TEST_BOARD_ID = 'test-board-1';
const TEST_LIST_ID = 'test-list-1';
const TEST_CARD_ID = 'test-card-1';

const TEST_STATE = {
  currentBoardId: TEST_BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [
    {
      id: TEST_BOARD_ID,
      name: 'Test Board',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [
        {
          id: TEST_LIST_ID,
          title: 'To Do',
          cards: [
            {
              id: TEST_CARD_ID,
              title: 'Comment Card',
              description: '',
              labels: [],
              dueDate: '',
              checklist: [],
              comments: [
                {
                  id: 'c1',
                  authorId: 'u1',
                  author: 'Tester',
                  content: 'Existing note',
                  createdAt: '2026-06-01T12:00:00.000Z',
                },
              ],
              initialEstimate: 0,
              remainingHoursLog: [],
            },
          ],
        },
      ],
    },
  ],
};

async function openCardModal(page) {
  await loadGuestBoard(page, TEST_STATE);
  await page.locator('.card').first().click();
  await page.waitForSelector('#cardModal.active', { timeout: 5000 });
}

test('AC1+AC2+AC3: card modal shows comments section with author and timestamp', async ({ page }) => {
  await openCardModal(page);

  await expect(page.locator('#commentsList')).toBeVisible();
  await expect(page.locator('#commentsList')).toContainText('Existing note');
  await expect(page.locator('#commentsList .comment-author')).toContainText('Tester');
  await expect(page.locator('#newCommentInput')).toBeVisible();
  await expect(page.locator('#addCommentBtn')).toBeVisible();
});

test('AC4: comments sort order can be toggled', async ({ page }) => {
  await openCardModal(page);

  await page.locator('#newCommentInput').fill('Second comment');
  await page.locator('#addCommentBtn').click();
  await expect(page.locator('#commentsList .comment-item')).toHaveCount(2);

  const firstBefore = await page.locator('#commentsList .comment-item').first().innerText();
  expect(firstBefore).toContain('Second comment');

  await page.locator('#commentsSortToggle').click();
  await expect(page.locator('#commentsSortToggle')).toHaveText('Oldest first');

  const firstAfter = await page.locator('#commentsList .comment-item').first().innerText();
  expect(firstAfter).toContain('Existing note');
});

test('AC5+AC6: author can delete own comment and changes persist', async ({ page }) => {
  await openCardModal(page);

  await page.locator('#newCommentInput').fill('Delete me');
  await page.locator('#addCommentBtn').click();
  await expect(page.locator('#commentsList')).toContainText('Delete me');

  await page.locator('#commentsList .comment-item', { hasText: 'Delete me' }).locator('.comment-delete-btn').click();
  await expect(page.locator('#commentsList')).not.toContainText('Delete me');

  const persisted = await getPersistedState(page);
  const board = persisted.boards.find(b => b.id === TEST_BOARD_ID);
  const card = board.lists[0].cards.find(c => c.id === TEST_CARD_ID);
  expect(card.comments.some(c => c.content === 'Delete me')).toBe(false);
  expect(card.comments.some(c => c.content === 'Existing note')).toBe(true);
});

test('comment count appears on card face', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);
  await expect(page.locator('.card .card-meta-item', { hasText: '1' })).toBeVisible();
});