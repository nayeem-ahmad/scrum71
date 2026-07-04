// @ts-check
const { test, expect } = require('@playwright/test');
const { setupGuestMode, BASE_URL } = require('./helpers');

const BOARD_ID = 'share-board-1';
const LIST_ID = 'share-list-1';
const CARD_ID = 'share-card-1';

const SHARE_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'Share Board',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{
      id: LIST_ID,
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Deep Link Card',
        description: 'Shared task',
        labels: [],
        dueDate: '',
        checklist: [],
        comments: [],
        initialEstimate: 0,
        remainingHoursLog: [],
      }],
    }],
  }],
};

test('AC1: card modal shows Copy Link action', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await setupGuestMode(page, SHARE_STATE);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.board-container', { timeout: 12000 });

  await page.locator('.card').first().click();
  await expect(page.locator('#copyCardLinkBtn')).toBeVisible();
  await page.locator('#copyCardLinkBtn').click();
  await expect(page.locator('.toast.success')).toContainText('Link copied');
});

test('AC2+AC3: visiting board+card URL opens card modal', async ({ page }) => {
  await setupGuestMode(page, SHARE_STATE);
  await page.goto(`${BASE_URL}/?board=${BOARD_ID}&card=${CARD_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#cardModal.active', { timeout: 12000 });

  await expect(page.locator('#cardTitle')).toHaveValue('Deep Link Card');
  await expect(page.locator('.card')).toHaveCount(1);
});

test('AC6: invalid card URL shows not-found toast', async ({ page }) => {
  await setupGuestMode(page, SHARE_STATE);
  await page.goto(`${BASE_URL}/?board=${BOARD_ID}&card=missing-card`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.board-container', { timeout: 12000 });

  await expect(page.locator('.toast.error')).toContainText('Card not found');
  await expect(page.locator('#cardModal.active')).toHaveCount(0);
});

test('AC5: unknown board URL shows access denied toast', async ({ page }) => {
  await setupGuestMode(page, SHARE_STATE);
  await page.goto(`${BASE_URL}/?board=unknown-board&card=${CARD_ID}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.board-container', { timeout: 12000 });

  await expect(page.locator('.toast.error')).toContainText('Board not found');
});