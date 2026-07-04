// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const BOARD_ID = 'b-attach';
const LIST_ID = 'l1';
const CARD_ID = 'c1';

const ATTACH_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'Attach Board',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{
      id: LIST_ID,
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Attach Card',
        description: '',
        labels: [],
        dueDate: '',
        checklist: [],
        comments: [],
        initialEstimate: 0,
        remainingHoursLog: [],
        spentHoursLog: [],
        attachments: [],
      }],
    }],
  }],
};

test('AC1+AC2+AC4+AC5+AC6: upload, list, and delete attachment in guest mode', async ({ page }) => {
  await loadGuestBoard(page, ATTACH_STATE);
  await page.locator('.card').click();
  await expect(page.locator('#attachmentsSection')).toBeVisible();

  const filePath = path.join(__dirname, 'fixtures', 'sample.txt');
  await page.locator('#attachmentFileInput').setInputFiles(filePath);
  await expect(page.locator('.toast.success')).toContainText('File attached');
  await expect(page.locator('#attachmentsList')).toContainText('sample.txt');
  await expect(page.locator('.card-meta-item[title="Attachments"]')).toContainText('1');

  await page.locator('.attachment-delete-btn').click();
  await expect(page.locator('#attachmentsList')).toContainText('No attachments yet');

  const persisted = await getPersistedState(page);
  const card = persisted.boards[0].lists[0].cards[0];
  expect(card.attachments).toHaveLength(0);
});

const IMAGE_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('AC3: image attachment opens lightbox preview', async ({ page }) => {
  const imageState = {
    ...ATTACH_STATE,
    boards: [{
      ...ATTACH_STATE.boards[0],
      lists: [{
        ...ATTACH_STATE.boards[0].lists[0],
        cards: [{
          ...ATTACH_STATE.boards[0].lists[0].cards[0],
          attachments: [{
            id: 'img1',
            name: 'pixel.png',
            url: IMAGE_DATA_URL,
            type: 'image/png',
            addedAt: '2026-06-11T10:00:00.000Z',
          }],
        }],
      }],
    }],
  };

  await loadGuestBoard(page, imageState);
  await page.locator('.card').click();
  await page.locator('.attachment-thumb-btn').click();
  await expect(page.locator('#attachmentLightbox')).not.toHaveClass(/hidden/);
  await expect(page.locator('#attachmentLightboxImg')).toHaveAttribute('src', IMAGE_DATA_URL);
  await page.keyboard.press('Escape');
  await expect(page.locator('#attachmentLightbox')).toHaveClass(/hidden/);
});