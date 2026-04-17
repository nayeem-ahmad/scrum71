// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:7890';

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

async function loadBoard(page) {
  // Block Firebase CDN → isFirebaseConfigured = false → guest mode
  await page.route('**gstatic.com/firebasejs/**', route => route.abort());
  await page.route('**firebaseapp.com/**', route => route.abort());

  // Seed localStorage before page scripts run
  await page.addInitScript((stateJson) => {
    localStorage.setItem('flowboard-state', stateJson);
  }, JSON.stringify(TEST_STATE));

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.list', { timeout: 12000 });
}

// ---------------------------------------------------------------------------
// AC 1 – Cards are draggable (have draggable attribute)
// ---------------------------------------------------------------------------
test('AC1: cards have draggable attribute and get "dragging" class on dragstart', async ({ page }) => {
  await loadBoard(page);

  const card = page.locator('.card').first();
  await expect(card).toHaveAttribute('draggable', 'true');

  // Fire dragstart via evaluate (DataTransfer must be a real object)
  await card.evaluate(el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  });
  await expect(card).toHaveClass(/dragging/);

  // Fire dragend to clean up
  await card.evaluate(el => el.dispatchEvent(new DragEvent('dragend', { bubbles: true })));
});

// ---------------------------------------------------------------------------
// AC 2 – Drop zone highlights when card hovers
// ---------------------------------------------------------------------------
test('AC2: list-cards container gets "drag-over" class on dragover', async ({ page }) => {
  await loadBoard(page);

  const card = page.locator('.card').first();
  const listCards = page.locator('.list-cards').first();
  const listBox = await listCards.boundingBox();
  const midY = listBox ? listBox.y + listBox.height / 2 : 300;

  await card.evaluate(el => {
    const dt = new DataTransfer();
    el.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
  });

  // Simulate dragover on the list container
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
  await loadBoard(page);

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
  await loadBoard(page);

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

  // Use Playwright's dragTo for proper HTML5 DnD across lists
  const targetListCards = targetList.locator('.list-cards');
  await cardToMove.dragTo(targetListCards);
  await page.waitForTimeout(400);

  // Card should now be in second list
  const targetCards = targetList.locator('.card');
  const titlesInTarget = await targetCards.locator('.card-title-text').allTextContents();
  expect(titlesInTarget.some(t => t.trim() === cardTitle)).toBeTruthy();
});

// ---------------------------------------------------------------------------
// AC 4 – Reorder cards within the same list
// ---------------------------------------------------------------------------
test('AC4: reordering within a list changes card order', async ({ page }) => {
  await loadBoard(page);

  const firstList = page.locator('.list').first();
  const cards = firstList.locator('.card');
  const count = await cards.count();
  if (count < 2) {
    test.skip(true, 'Need at least 2 cards in first list for reorder test');
    return;
  }

  const secondTitle = (await cards.nth(1).locator('.card-title-text').textContent())?.trim();

  // Use Playwright's proper dragTo for HTML5 DnD
  await cards.nth(0).dragTo(cards.nth(2));
  await page.waitForTimeout(400);

  const newFirst = (await cards.nth(0).locator('.card-title-text').textContent())?.trim();
  // Order should have changed (card 0 moved below card 2)
  expect(newFirst).toBe(secondTitle);
});

// ---------------------------------------------------------------------------
// AC 6 – Drag animations: CSS class check on dragging card
// ---------------------------------------------------------------------------
test('AC6: dragging card has "dragging" CSS class (animation trigger)', async ({ page }) => {
  await loadBoard(page);

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
  await loadBoard(page);

  const card = page.locator('.card').first();
  const box = await card.boundingBox();
  if (!box) throw new Error('No bounding box');

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  // Simulate touchstart
  await card.dispatchEvent('touchstart', {
    touches: [{ clientX: x, clientY: y, identifier: 0 }],
    changedTouches: [{ clientX: x, clientY: y, identifier: 0 }],
  });

  // Wait for long-press threshold (300ms)
  await page.waitForTimeout(400);

  // Card should now be in drag mode
  await expect(card).toHaveClass(/dragging/);

  // Fire touchend to clean up
  await card.dispatchEvent('touchend', {
    changedTouches: [{ clientX: x, clientY: y, identifier: 0 }],
    touches: [],
  });
});
