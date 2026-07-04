// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const PROJECT_ID = 'p-display';
const BOARD_ID = 'b-display';
const CARD_ID = 'c-display';

const DISPLAY_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Display Project',
    description: '',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [
      { id: 'mem1', name: 'Sam Member', email: 'member@test.com', role: 'member', addedAt: '2026-06-01T00:00:00.000Z' },
    ],
    sprintIds: [BOARD_ID],
    backlog: [],
  }],
  boards: [{
    id: BOARD_ID,
    name: 'Display Sprint',
    projectId: PROJECT_ID,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    lists: [{
      id: 'l1',
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Rich Card',
        description: 'Details',
        labels: ['priority-high', 'feature'],
        dueDate: '2020-01-01',
        checklist: [
          { id: 'ck1', text: 'One', completed: true },
          { id: 'ck2', text: 'Two', completed: false },
        ],
        comments: [
          { id: 'cm1', authorId: 'owner1', author: 'Pat', content: 'Note', createdAt: '2026-06-01T12:00:00.000Z' },
        ],
        assigneeId: 'mem1',
        initialEstimate: 8,
        remainingHoursLog: [{ id: 'r1', remainingHours: 5, timestamp: '2026-06-10T10:00:00.000Z' }],
        spentHoursLog: [{ id: 's1', spentHours: 2, timestamp: '2026-06-10T11:00:00.000Z', userId: 'owner1' }],
        attachments: [
          { id: 'a1', name: 'spec.pdf', url: 'https://example.com/spec.pdf', type: 'application/pdf', addedAt: '2026-06-01T00:00:00.000Z' },
        ],
      }],
    }],
  }],
};

test('AC1–AC7: card face shows labels, due date, checklist, time, assignee, comments, attachments', async ({ page }) => {
  await loadGuestBoard(page, DISPLAY_STATE);
  const card = page.locator(`.card[data-card-id="${CARD_ID}"]`);

  await expect(card.locator('.card-label')).toHaveCount(2);
  await expect(card.locator('.card-meta-item.overdue')).toContainText('Jan');
  await expect(card.locator('.card-meta-item[title="Checklist"]')).toContainText('1/2');
  await expect(card.locator('.card-meta-item.time-remaining')).toContainText('5h');
  await expect(card.locator('.card-meta-item.time-spent')).toContainText('2 / 8h');
  await expect(card.locator('.card-meta-item[title="Comments"]')).toContainText('1');
  await expect(card.locator('.card-assignee')).toHaveText('S');
  await expect(card.locator('.card-meta-item[title="Attachments"]')).toContainText('1');
});