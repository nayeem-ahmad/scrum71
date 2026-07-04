// @ts-check
const { expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:7890';

/**
 * Block Firebase CDN scripts so isFirebaseConfigured stays false (guest mode),
 * then seed localStorage with a test board so the board renders immediately.
 */
async function setupGuestMode(page, testState) {
  await page.route('**gstatic.com/firebasejs/**', route => route.abort());
  await page.route('**firebaseapp.com/**', route => route.abort());

  await page.addInitScript((stateJson) => {
    localStorage.setItem('flowboard-state', stateJson);
  }, JSON.stringify(testState));
}

/**
 * Load the app in guest mode and wait for the board to render.
 */
async function loadGuestBoard(page, testState) {
  await setupGuestMode(page, testState);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.board-container', { timeout: 12000 });
  const hasBoard = await page.locator('.list').count() > 0;
  const hasEmpty = await page.locator('.board-container .empty-state').count() > 0;
  if (!hasBoard && !hasEmpty) {
    throw new Error('Board container loaded but neither lists nor empty state rendered');
  }
}

/**
 * Read persisted flowboard state from localStorage.
 */
async function getPersistedState(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('flowboard-state');
    return raw ? JSON.parse(raw) : null;
  });
}

/**
 * Wait until localStorage contains a card with the given title in the target list id.
 */
async function waitForCardInPersistedList(page, listId, cardTitle, timeout = 5000) {
  await page.waitForFunction(
    ({ targetListId, title }) => {
      const raw = localStorage.getItem('flowboard-state');
      if (!raw) return false;
      const state = JSON.parse(raw);
      const board = state.boards?.find(b => b.id === state.currentBoardId);
      const list = board?.lists?.find(l => l.id === targetListId);
      return list?.cards?.some(c => c.title === title) ?? false;
    },
    { targetListId: listId, title: cardTitle },
    { timeout }
  );
}

/**
 * Wait for the card modal to close after an async save.
 */
async function waitForCardModalClosed(page, timeout = 5000) {
  await expect(page.locator('#cardModal.active')).toHaveCount(0, { timeout });
}

module.exports = {
  BASE_URL,
  setupGuestMode,
  loadGuestBoard,
  getPersistedState,
  waitForCardInPersistedList,
  waitForCardModalClosed,
};