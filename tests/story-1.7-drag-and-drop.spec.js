// @ts-check
const { test, expect } = require('@playwright/test');
const {
  loadGuestBoard,
  getPersistedState,
  waitForCardInPersistedList,
} = require('./helpers');

// Seed state: 2 lists, 3 cards in list 1, 1 card in list 2
const TEST_STATE = {
  currentBoardId: 'b1',
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [
    {
      id: 'b1',
      name: 'DnD Test Board',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [
        {
          id: 'l1',
          title: 'Column One',
          cards: [
            { id: 'c1', title: 'Card One', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 },
            { id: 'c2', title: 'Card Two', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 },
            { id: 'c3', title: 'Card Three', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 },
          ]
        },
        {
          id: 'l2',
          title: 'Column Two',
          cards: [
            { id: 'c4', title: 'Card Four', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 },
          ]
        }
      ]
    }
  ]
};

// ---------------------------------------------------------------------------
// AC 1 – Cards are draggable (have draggable attribute)
// ---------------------------------------------------------------------------
test('AC1: cards have draggable attribute and get "dragging" class on dragstart', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const card = page.locator('.card').first();
  await expect(card).toHaveAttribute('draggable', 'true');

  await card.evaluate(el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  });
  await expect(card).toHaveClass(/dragging/);

  await card.evaluate(el => el.dispatchEvent(new DragEvent('dragend', { bubbles: true })));
});

// ---------------------------------------------------------------------------
// AC 2 – Drop zone highlights when card hovers
// ---------------------------------------------------------------------------
test('AC2: list-cards container gets "drag-over" class on dragover', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const card = page.locator('.card').first();
  const listCards = page.locator('.list-cards').first();
  const listBox = await listCards.boundingBox();
  const midY = listBox ? listBox.y + listBox.height / 2 : 300;

  await card.evaluate(el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  });

  await listCards.evaluate((el, y) => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, clientY: y }));
  }, midY);

  await expect(listCards).toHaveClass(/drag-over/);

  await card.evaluate(el => el.dispatchEvent(new DragEvent('dragend', { bubbles: true })));
});

// ---------------------------------------------------------------------------
// AC 3 – Insertion placeholder appears between cards
// ---------------------------------------------------------------------------
test('AC3: card-placeholder element appears during drag hover', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const card = page.locator('.card').first();
  const listCards = page.locator('.list-cards').first();
  const listBox = await listCards.boundingBox();
  const midY = listBox ? listBox.y + listBox.height / 2 : 300;

  await card.evaluate(el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  });
  await listCards.evaluate((el, y) => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true, clientY: y }));
  }, midY);

  await expect(page.locator('.card-placeholder')).toBeVisible();

  await card.evaluate(el => el.dispatchEvent(new DragEvent('dragend', { bubbles: true })));
});

// ---------------------------------------------------------------------------
// AC 4 & 5 – Moving a card via mouse drag persists order/list change
// ---------------------------------------------------------------------------
test('AC4+AC5: dragging card to second list moves it and preserves after save', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const lists = page.locator('.list');
  const listCount = await lists.count();
  if (listCount < 2) {
    test.skip(true, 'Need at least 2 lists for drag-across-list test');
    return;
  }

  const sourceList = lists.nth(0);
  const targetList = lists.nth(1);

  const sourceCards = sourceList.locator('.card');
  const sourceCount = await sourceCards.count();
  if (sourceCount === 0) {
    test.skip(true, 'No cards in first list');
    return;
  }

  const cardToMove = sourceCards.first();
  const cardTitle = (await cardToMove.locator('.card-title-text').textContent())?.trim();

  const targetListCards = targetList.locator('.list-cards');
  await cardToMove.dragTo(targetListCards);

  await expect(targetList.locator('.card').filter({ hasText: cardTitle })).toBeVisible({ timeout: 5000 });
  await waitForCardInPersistedList(page, 'l2', cardTitle);

  const persisted = await getPersistedState(page);
  const board = persisted.boards.find(b => b.id === 'b1');
  const list2 = board.lists.find(l => l.id === 'l2');
  expect(list2.cards.some(c => c.title === cardTitle)).toBeTruthy();
  expect(board.lists.find(l => l.id === 'l1').cards.some(c => c.title === cardTitle)).toBeFalsy();
});

// ---------------------------------------------------------------------------
// AC 4 – Reorder cards within the same list
// ---------------------------------------------------------------------------
test('AC4: reordering within a list changes card order', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const firstList = page.locator('.list').first();
  const cards = firstList.locator('.card');
  const count = await cards.count();
  if (count < 2) {
    test.skip(true, 'Need at least 2 cards in first list for reorder test');
    return;
  }

  const firstTitle = (await cards.nth(0).locator('.card-title-text').textContent())?.trim();
  const secondTitle = (await cards.nth(1).locator('.card-title-text').textContent())?.trim();

  await cards.nth(0).dragTo(cards.nth(2));

  await expect(cards.nth(0)).not.toHaveText(firstTitle, { timeout: 5000 });
  const newFirst = (await cards.nth(0).locator('.card-title-text').textContent())?.trim();
  expect(newFirst).toBe(secondTitle);

  const persisted = await getPersistedState(page);
  const list1 = persisted.boards[0].lists.find(l => l.id === 'l1');
  expect(list1.cards[0].title).toBe(secondTitle);
});

// ---------------------------------------------------------------------------
// AC 6 – Drag animations: CSS class check on dragging card
// ---------------------------------------------------------------------------
test('AC6: dragging card has "dragging" CSS class (animation trigger)', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const card = page.locator('.card').first();

  await card.evaluate(el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  });

  await expect(card).toHaveClass(/dragging/);

  await card.evaluate(el => el.dispatchEvent(new DragEvent('dragend', { bubbles: true })));
});

// ---------------------------------------------------------------------------
// AC 7 – Touch support: touchstart + long press activates drag mode
// ---------------------------------------------------------------------------
test('AC7: long touch press on card activates touch drag mode', async ({ page }) => {
  await loadGuestBoard(page, TEST_STATE);

  const card = page.locator('.card').first();
  const box = await card.boundingBox();
  if (!box) throw new Error('No bounding box');

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await card.dispatchEvent('touchstart', {
    touches: [{ clientX: x, clientY: y, identifier: 0 }],
    changedTouches: [{ clientX: x, clientY: y, identifier: 0 }],
  });

  await page.waitForTimeout(400);

  await expect(card).toHaveClass(/dragging/);

  await card.dispatchEvent('touchend', {
    changedTouches: [{ clientX: x, clientY: y, identifier: 0 }],
    touches: [],
  });
});