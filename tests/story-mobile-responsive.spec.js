// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const PROJECT_A = 'p-alpha';
const PROJECT_B = 'p-beta';
const BOARD_ONE = 'b-one';
const BOARD_TWO = 'b-two';
const BOARD_BETA = 'b-beta';
const CARD_ID = 'c1';

const MOBILE_STATE = {
  currentBoardId: BOARD_ONE,
  currentProjectId: PROJECT_A,
  editingCard: null,
  projects: [
    {
      id: PROJECT_A,
      name: 'Alpha Project',
      description: '',
      owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
      members: [],
      sprintIds: [BOARD_ONE, BOARD_TWO],
      backlog: [],
      labels: [],
    },
    {
      id: PROJECT_B,
      name: 'Beta Project',
      description: '',
      owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
      members: [],
      sprintIds: [BOARD_BETA],
      backlog: [],
      labels: [],
    },
  ],
  boards: [
    {
      id: BOARD_ONE,
      name: 'Sprint One',
      projectId: PROJECT_A,
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
      members: [],
      lists: [{
        id: 'l1',
        title: 'To Do',
        cards: [{
          id: CARD_ID,
          title: 'Mobile Card',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          comments: [],
          initialEstimate: 4,
          remainingHoursLog: [{ id: 'r1', remainingHours: 3, timestamp: '2026-06-10T10:00:00.000Z' }],
          spentHoursLog: [],
          attachments: [],
        }],
      }],
    },
    {
      id: BOARD_TWO,
      name: 'Sprint Two',
      projectId: PROJECT_A,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l2', title: 'Doing', cards: [] }],
    },
    {
      id: BOARD_BETA,
      name: 'Beta Board',
      projectId: PROJECT_B,
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l3', title: 'Backlog', cards: [] }],
    },
  ],
};

test.use({ viewport: { width: 390, height: 844 } });

test('mobile nav: menu opens and header selectors are hidden', async ({ page }) => {
  await loadGuestBoard(page, MOBILE_STATE);
  await expect(page.locator('#mobileNavBtn')).toBeVisible();
  await expect(page.locator('.header-center')).toBeHidden();
  await page.locator('#mobileNavBtn').click();
  await expect(page.locator('#mobileNavOverlay')).toHaveClass(/active/);
  await expect(page.locator('#mobileNavProjectName')).toHaveText('Alpha Project');
  await expect(page.locator('#mobileNavBoardName')).toHaveText('Sprint One');
});

test('mobile nav: switch board from drawer', async ({ page }) => {
  await loadGuestBoard(page, MOBILE_STATE);
  await page.locator('#mobileNavBtn').click();
  await page.locator('#mobileBoardList .board-list-item').filter({ hasText: 'Sprint Two' }).click();
  await expect(page.locator('#mobileNavOverlay')).not.toHaveClass(/active/);
  await expect(page.locator('#currentBoardName')).toHaveText('Sprint Two');
  await expect(page.locator('.list[data-list-id="l2"]')).toBeVisible();
});

test('mobile nav: open project management and return to board', async ({ page }) => {
  await loadGuestBoard(page, MOBILE_STATE);
  await page.locator('#mobileNavBtn').click();
  await page.locator('#mobileManageProjectsBtn').click();
  await expect(page.locator('#projectManagementScreen')).not.toHaveClass(/hidden/);
  await expect(page.locator('#boardContainer')).toHaveClass(/hidden/);
  await page.locator('#pmBackToBoardBtn').click();
  await expect(page.locator('#projectManagementScreen')).toHaveClass(/hidden/);
  await expect(page.locator('#boardContainer')).not.toHaveClass(/hidden/);
});

test('PM mobile: sidebar drawer opens and selects project', async ({ page }) => {
  await loadGuestBoard(page, MOBILE_STATE);
  await page.locator('#mobileNavBtn').click();
  await page.locator('#mobileManageProjectsBtn').click();
  await page.locator('#pmSidebarToggle').click();
  await expect(page.locator('#pmSidebar')).toHaveClass(/open/);
  await page.locator('.pm-project-item').filter({ hasText: 'Beta Project' }).click();
  await expect(page.locator('#pmSidebar')).not.toHaveClass(/open/);
  await expect(page.locator('#pmProjectName')).toHaveText('Beta Project');
});

test('mobile: card modal uses single-column layout', async ({ page }) => {
  await loadGuestBoard(page, MOBILE_STATE);
  await page.locator('.card').click();
  await expect(page.locator('#cardModal')).toHaveClass(/active/);
  const columns = await page.locator('.card-modal-body').evaluate(el => getComputedStyle(el).gridTemplateColumns);
  expect(columns.split(' ').filter(Boolean).length).toBe(1);
  await expect(page.locator('.card-sidebar')).toBeVisible();
});

test('mobile: burndown panel spans full width as bottom sheet', async ({ page }) => {
  await loadGuestBoard(page, MOBILE_STATE);
  const panel = page.locator('#burndownPanel');
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  expect(box).toBeTruthy();
  expect(box.width).toBeGreaterThan(viewport.width * 0.95);
  expect(box.y + box.height).toBeGreaterThan(viewport.height * 0.85);
});