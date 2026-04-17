// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:7890';

// Minimal board state for localStorage
const TEST_BOARD_ID = 'test-board-1';
const TEST_LIST_ID = 'test-list-1';
const TEST_CARD_ID = 'test-card-1';
const TEST_CARD2_ID = 'test-card-2';

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
            { id: TEST_CARD_ID, title: 'Test Card Alpha', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 },
            { id: TEST_CARD2_ID, title: 'Test Card Beta', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 }
          ]
        }
      ]
    }
  ]
};

/**
 * Block Firebase CDN scripts so isFirebaseConfigured stays false (guest mode),
 * then seed localStorage with a test board so the board renders immediately.
 */
async function setupGuestMode(page) {
  // Block Firebase CDN → typeof firebase === 'undefined' → isFirebaseConfigured = false
  await page.route('**gstatic.com/firebasejs/**', route => route.abort());
  await page.route('**firebaseapp.com/**', route => route.abort());

  // Seed localStorage before any page script runs
  await page.addInitScript((stateJson) => {
    localStorage.setItem('flowboard-state', stateJson);
  }, JSON.stringify(TEST_STATE));
}

/**
 * Helper: open the first card modal on the board.
 */
async function openFirstCardModal(page) {
  await setupGuestMode(page);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Wait for board to render (guest mode → no auth)
  await page.waitForSelector('.list', { timeout: 12000 });

  // Click the first card
  const firstCard = page.locator('.card').first();
  await firstCard.click();

  // Wait for modal
  await page.waitForSelector('#cardModal.active', { timeout: 5000 });
}

// ---------------------------------------------------------------------------
// AC 1 & 2 – Label picker visible, multiple labels selectable
// ---------------------------------------------------------------------------
test('AC1+AC2: label picker is shown and multiple labels can be toggled', async ({ page }) => {
  await openFirstCardModal(page);

  const picker = page.locator('#labelPicker');
  await expect(picker).toBeVisible();

  const options = picker.locator('.label-option');
  const optCount = await options.count();
  expect(optCount).toBeGreaterThan(1);

  // Select first two labels
  const first = options.nth(0);
  const second = options.nth(1);
  await first.click();
  await second.click();

  await expect(first).toHaveClass(/selected/);
  await expect(second).toHaveClass(/selected/);
});

// ---------------------------------------------------------------------------
// AC 3 – Selected labels render as colored bars on the card tile
// ---------------------------------------------------------------------------
test('AC3: selected labels appear as colored bars on the card after saving', async ({ page }) => {
  await openFirstCardModal(page);

  // Clear all labels first
  const allOptions = page.locator('#labelPicker .label-option');
  const count = await allOptions.count();
  for (let i = 0; i < count; i++) {
    const opt = allOptions.nth(i);
    if (await opt.evaluate(el => el.classList.contains('selected'))) {
      await opt.click();
    }
  }

  // Select "High Priority" label
  const highPriority = page.locator('#labelPicker .label-option[data-label="priority-high"]');
  await highPriority.click();
  await expect(highPriority).toHaveClass(/selected/);

  // Save
  await page.locator('#saveCardBtn').click();

  // Label bar should appear on the card
  const labelBar = page.locator('.card .card-label').first();
  await expect(labelBar).toBeVisible();
  // Should have red background matching LABEL_COLORS['priority-high'] = #ef4444
  const bg = await labelBar.evaluate(el => getComputedStyle(el).backgroundColor);
  // #ef4444 => rgb(239, 68, 68)
  expect(bg).toContain('239');
});

// ---------------------------------------------------------------------------
// AC 4 & 5 – Due date picker and date displays on card
// ---------------------------------------------------------------------------
test('AC4+AC5: due date can be set and displays on card tile', async ({ page }) => {
  await openFirstCardModal(page);

  const dateInput = page.locator('#cardDueDate');
  await expect(dateInput).toBeVisible();

  // Set due date 10 days from now (not overdue, not "soon")
  const future = new Date();
  future.setDate(future.getDate() + 10);
  const isoDate = future.toISOString().split('T')[0]; // YYYY-MM-DD
  await dateInput.fill(isoDate);

  await page.locator('#saveCardBtn').click();

  // Due date chip should appear on card
  const dueDateChip = page.locator('.card .card-meta-item').filter({ hasText: /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i }).first();
  await expect(dueDateChip).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC 6 – Overdue dates are highlighted red
// ---------------------------------------------------------------------------
test('AC6: overdue due date gets "overdue" class (red styling)', async ({ page }) => {
  await openFirstCardModal(page);

  const dateInput = page.locator('#cardDueDate');
  // Set date 5 days in the past
  const past = new Date();
  past.setDate(past.getDate() - 5);
  await dateInput.fill(past.toISOString().split('T')[0]);

  await page.locator('#saveCardBtn').click();

  const overdueChip = page.locator('.card .card-meta-item.overdue').first();
  await expect(overdueChip).toBeVisible();
});

// ---------------------------------------------------------------------------
// AC 7 – Dates within 2 days get "soon" warning color
// ---------------------------------------------------------------------------
test('AC7: due date within 2 days gets "soon" warning class', async ({ page }) => {
  await openFirstCardModal(page);

  const dateInput = page.locator('#cardDueDate');
  // Set date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  await dateInput.fill(tomorrow.toISOString().split('T')[0]);

  await page.locator('#saveCardBtn').click();

  const soonChip = page.locator('.card .card-meta-item.soon').first();
  await expect(soonChip).toBeVisible();
});

// ---------------------------------------------------------------------------
// Persistence – re-open modal and verify saved labels/date still present
// ---------------------------------------------------------------------------
test('Persistence: labels and due date persist after reopening modal', async ({ page }) => {
  await openFirstCardModal(page);

  // Set a label
  const bugLabel = page.locator('#labelPicker .label-option[data-label="bug"]');
  if (!(await bugLabel.evaluate(el => el.classList.contains('selected')))) {
    await bugLabel.click();
  }
  await expect(bugLabel).toHaveClass(/selected/);

  // Set a future due date
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const isoDate = future.toISOString().split('T')[0];
  await page.locator('#cardDueDate').fill(isoDate);

  await page.locator('#saveCardBtn').click();

  // Reopen the same card
  await page.locator('.card').first().click();
  await page.waitForSelector('#cardModal.active');

  await expect(page.locator('#labelPicker .label-option[data-label="bug"]')).toHaveClass(/selected/);
  await expect(page.locator('#cardDueDate')).toHaveValue(isoDate);
});
