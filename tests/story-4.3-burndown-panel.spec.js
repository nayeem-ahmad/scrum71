// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const BOARD_WITH_DATES = {
  currentBoardId: 'b-dates',
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: 'b-dates',
    name: 'Dated Sprint',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
  }],
};

const BOARD_NO_DATES = {
  currentBoardId: 'b-nodates',
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: 'b-nodates',
    name: 'Undated Board',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
  }],
};

test('AC1: burndown panel appears when sprint has start and end dates', async ({ page }) => {
  await loadGuestBoard(page, BOARD_WITH_DATES);
  await expect(page.locator('#burndownPanel')).not.toHaveClass(/hidden/);
  await expect(page.locator('#burndownChart')).toBeVisible();
});

test('panel hidden when sprint has no dates', async ({ page }) => {
  await loadGuestBoard(page, BOARD_NO_DATES);
  await expect(page.locator('#burndownPanel')).toHaveClass(/hidden/);
});

test('AC7: collapse toggle hides chart container', async ({ page }) => {
  await loadGuestBoard(page, BOARD_WITH_DATES);
  await page.locator('.burndown-toggle').click();
  await expect(page.locator('#burndownPanel')).toHaveClass(/collapsed/);
});

test('AC8: burndown panel can be dragged to a new position', async ({ page }) => {
  await loadGuestBoard(page, BOARD_WITH_DATES);
  const panel = page.locator('#burndownPanel');
  const before = await panel.evaluate(el => ({
    left: el.style.left,
    top: el.style.top,
  }));

  const header = page.locator('#burndownHeader');
  const box = await header.boundingBox();
  if (!box) throw new Error('No header bounding box');

  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x - 120, box.y - 80, { steps: 8 });
  await page.mouse.up();

  const after = await panel.evaluate(el => ({
    left: el.style.left,
    top: el.style.top,
  }));

  expect(after.left).not.toBe(before.left);
  expect(after.top).not.toBe(before.top);
});