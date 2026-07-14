// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const TEST_BOARD_STATE = {
  currentBoardId: 'b1',
  currentProjectId: 'p1',
  editingCard: null,
  projects: [{
    id: 'p1',
    name: 'Sort Project',
    description: '',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
    members: [],
    sprintIds: ['b1'],
    backlog: []
  }],
  boards: [{
    id: 'b1',
    name: 'Sort Board',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{
      id: 'l1',
      title: 'To Do',
      cards: [
        {
          id: 'c1',
          title: 'C Card',
          description: '',
          dueDate: '2026-01-10',
          initialEstimate: 4,
          checklist: [],
          createdAt: '2026-01-01T10:00:00.000Z'
        },
        {
          id: 'c2',
          title: 'A Card',
          description: '',
          dueDate: '2026-01-08',
          initialEstimate: 16,
          checklist: [
            { id: 'ch1', text: 'Step 1', completed: true },
            { id: 'ch2', text: 'Step 2', completed: false }
          ],
          createdAt: '2026-01-02T10:00:00.000Z'
        },
        {
          id: 'c3',
          title: 'B Card',
          description: '',
          dueDate: '',
          initialEstimate: 8,
          checklist: [
            { id: 'ch3', text: 'Step A', completed: false }
          ],
          createdAt: '2026-01-03T10:00:00.000Z'
        }
      ]
    }]
  }]
};

test.describe('Column Card Sorting', () => {
  test('should display sorting header and options in list menu', async ({ page }) => {
    await loadGuestBoard(page, TEST_BOARD_STATE);

    // Open list menu
    await page.locator('.list-menu-btn').first().click();

    // Verify sort options exist
    await expect(page.locator('.list-menu-header')).toContainText('Sort Cards By');
    await expect(page.locator('.list-menu-item.sort-due-date')).toBeVisible();
    await expect(page.locator('.list-menu-item.sort-assignee')).toBeVisible();
    await expect(page.locator('.list-menu-item.sort-create-date')).toBeVisible();
    await expect(page.locator('.list-menu-item.sort-title')).toBeVisible();
    await expect(page.locator('.list-menu-item.sort-estimate')).toBeVisible();
    await expect(page.locator('.list-menu-item.sort-checklist')).toBeVisible();
  });

  test('should sort cards by Title alphabetically (A-Z)', async ({ page }) => {
    await loadGuestBoard(page, TEST_BOARD_STATE);

    // Open menu and click sort by Title
    await page.locator('.list-menu-btn').first().click();
    await page.locator('.list-menu-item.sort-title').click();

    // Verify card rendering order (A Card -> B Card -> C Card)
    const cards = page.locator('.card-title-text');
    await expect(cards.nth(0)).toHaveText('A Card');
    await expect(cards.nth(1)).toHaveText('B Card');
    await expect(cards.nth(2)).toHaveText('C Card');

    // Verify local storage updates
    const persisted = await getPersistedState(page);
    const persistedTitles = persisted.boards[0].lists[0].cards.map(c => c.title);
    expect(persistedTitles).toEqual(['A Card', 'B Card', 'C Card']);
  });

  test('should sort cards by Estimate descending', async ({ page }) => {
    await loadGuestBoard(page, TEST_BOARD_STATE);

    // Open menu and click sort by Estimate
    await page.locator('.list-menu-btn').first().click();
    await page.locator('.list-menu-item.sort-estimate').click();

    // Verify card rendering order (A Card (16h) -> B Card (8h) -> C Card (4h))
    const cards = page.locator('.card-title-text');
    await expect(cards.nth(0)).toHaveText('A Card');
    await expect(cards.nth(1)).toHaveText('B Card');
    await expect(cards.nth(2)).toHaveText('C Card');

    // Verify local storage updates
    const persisted = await getPersistedState(page);
    const persistedEstimates = persisted.boards[0].lists[0].cards.map(c => c.initialEstimate);
    expect(persistedEstimates).toEqual([16, 8, 4]);
  });

  test('should sort cards by Due Date ascending', async ({ page }) => {
    await loadGuestBoard(page, TEST_BOARD_STATE);

    // Open menu and click sort by Due Date
    await page.locator('.list-menu-btn').first().click();
    await page.locator('.list-menu-item.sort-due-date').click();

    // Verify card rendering order (A Card (Jan 8) -> C Card (Jan 10) -> B Card (No due date))
    const cards = page.locator('.card-title-text');
    await expect(cards.nth(0)).toHaveText('A Card');
    await expect(cards.nth(1)).toHaveText('C Card');
    await expect(cards.nth(2)).toHaveText('B Card');

    // Verify local storage updates
    const persisted = await getPersistedState(page);
    const persistedDates = persisted.boards[0].lists[0].cards.map(c => c.title);
    expect(persistedDates).toEqual(['A Card', 'C Card', 'B Card']);
  });

  test('should sort cards by Creation Date descending (newest first)', async ({ page }) => {
    await loadGuestBoard(page, TEST_BOARD_STATE);

    // Open menu and click sort by Creation Date
    await page.locator('.list-menu-btn').first().click();
    await page.locator('.list-menu-item.sort-create-date').click();

    // Verify card rendering order (B Card (Jan 3) -> A Card (Jan 2) -> C Card (Jan 1))
    const cards = page.locator('.card-title-text');
    await expect(cards.nth(0)).toHaveText('B Card');
    await expect(cards.nth(1)).toHaveText('A Card');
    await expect(cards.nth(2)).toHaveText('C Card');

    // Verify local storage updates
    const persisted = await getPersistedState(page);
    const persistedDates = persisted.boards[0].lists[0].cards.map(c => c.title);
    expect(persistedDates).toEqual(['B Card', 'A Card', 'C Card']);
  });

  test('should sort cards by Checklist Progress descending', async ({ page }) => {
    await loadGuestBoard(page, TEST_BOARD_STATE);

    // Open menu and click sort by Checklist Progress
    await page.locator('.list-menu-btn').first().click();
    await page.locator('.list-menu-item.sort-checklist').click();

    // Verify card rendering order:
    // 1st: A Card (50% progress - 1/2 done)
    // 2nd: B Card (0% progress - 0/1 done)
    // 3rd: C Card (No checklist)
    const cards = page.locator('.card-title-text');
    await expect(cards.nth(0)).toHaveText('A Card');
    await expect(cards.nth(1)).toHaveText('B Card');
    await expect(cards.nth(2)).toHaveText('C Card');

    // Verify local storage updates
    const persisted = await getPersistedState(page);
    const persistedDates = persisted.boards[0].lists[0].cards.map(c => c.title);
    expect(persistedDates).toEqual(['A Card', 'B Card', 'C Card']);
  });
});
