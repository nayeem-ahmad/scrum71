// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const PROJECT_ID = 'p-labels';
const BOARD_ID = 'b-labels';
const CARD_ID = 'c1';

const LABELS_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Label Project',
    description: '',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    sprintIds: [BOARD_ID],
    backlog: [],
    labels: [
      { id: 'priority-high', name: 'High Priority', color: '#ef4444' },
      { id: 'bug', name: 'Bug', color: '#dc2626' },
    ],
  }],
  boards: [{
    id: BOARD_ID,
    name: 'Label Sprint',
    projectId: PROJECT_ID,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    lists: [{
      id: 'l1',
      title: 'To Do',
      cards: [{
        id: CARD_ID,
        title: 'Label Card',
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

test('AC1+AC2+AC5: PM labels tab lists project labels', async ({ page }) => {
  await loadGuestBoard(page, LABELS_STATE);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="labels"]').click();
  await expect(page.locator('#pmTabLabels')).toHaveClass(/active/);
  await expect(page.locator('#pmLabelsList')).toContainText('High Priority');
  await expect(page.locator('#pmLabelsList')).toContainText('Bug');
});

test('AC4+AC5+AC6: add label and show in card picker with hover name', async ({ page }) => {
  await loadGuestBoard(page, LABELS_STATE);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="labels"]').click();

  await page.locator('#pmAddLabelBtn').click();
  await page.locator('#pmLabelNameInput').fill('Research');
  await page.locator('#pmLabelColorInput').fill('#ff00aa');
  await page.locator('#pmSaveLabelBtn').click();
  await expect(page.locator('.toast.success')).toContainText('Label added');

  const persisted = await getPersistedState(page);
  const project = persisted.projects.find(p => p.id === PROJECT_ID);
  expect(project.labels.some(l => l.name === 'Research')).toBe(true);

  await page.locator('#manageProjectsBtn').click();
  await page.locator('.card').click();
  const researchLabel = page.locator('#labelPicker .label-option').filter({ hasText: 'Research' });
  await expect(researchLabel).toBeVisible();
  await expect(researchLabel).toHaveAttribute('title', 'Research');
});

test('AC3: edit label name and color inline in PM', async ({ page }) => {
  await loadGuestBoard(page, LABELS_STATE);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="labels"]').click();

  const bugRow = page.locator('.pm-label-item[data-id="bug"]');
  await bugRow.locator('.pm-label-edit').click();
  await bugRow.locator('.pm-label-edit-name').fill('Defect');
  await bugRow.locator('.pm-label-edit-color').fill('#00aa88');
  await bugRow.locator('.pm-label-save-edit').click();
  await expect(page.locator('.toast.success')).toContainText('Label updated');
  await expect(bugRow.locator('.pm-label-name')).toHaveText('Defect');

  const persisted = await getPersistedState(page);
  const project = persisted.projects.find(p => p.id === PROJECT_ID);
  const bug = project.labels.find(l => l.id === 'bug');
  expect(bug.name).toBe('Defect');
  expect(bug.color).toBe('#00aa88');
});