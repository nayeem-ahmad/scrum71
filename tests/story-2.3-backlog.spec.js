// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const PM_STATE = {
  currentBoardId: 'b1',
  currentProjectId: 'p1',
  editingCard: null,
  projects: [
    {
      id: 'p1',
      name: 'Alpha Project',
      description: 'First project',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
      members: [],
      sprintIds: ['b1'],
      backlog: [
        { id: 'bl-old', type: 'story', title: 'Older story', status: 'open', addedAt: '2026-05-01T10:00:00.000Z' },
        { id: 'bl-new', type: 'story', title: 'Newer story', status: 'open', addedAt: '2026-06-10T10:00:00.000Z' },
      ],
    },
  ],
  boards: [{
    id: 'b1',
    name: 'Sprint 1',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
  }],
};

async function openBacklogTab(page) {
  await loadGuestBoard(page, PM_STATE);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="backlog"]').click();
  await expect(page.locator('#pmTabBacklog')).toHaveClass(/active/);
}

test('AC1+AC2: backlog tab shows items and supports quick add', async ({ page }) => {
  await openBacklogTab(page);

  await expect(page.locator('#backlogList .story-group')).toHaveCount(2);
  await page.locator('#backlogInput').fill('Payment integration');
  await page.locator('#addToBacklogBtn').click();

  await expect(page.locator('#backlogList')).toContainText('Payment integration');
});

test('AC3: backlog items can be edited and deleted', async ({ page }) => {
  await openBacklogTab(page);

  await page.locator('.story-title', { hasText: 'Newer story' }).click();
  const editInput = page.locator('.story-group[data-id="bl-new"] .story-title-edit-input');
  await editInput.fill('Renamed story');
  await editInput.press('Enter');
  await expect(page.locator('#backlogList')).toContainText('Renamed story');

  page.once('dialog', dialog => dialog.accept());
  await page.locator('.story-group[data-id="bl-old"] .delete-story-btn').click();
  await expect(page.locator('#backlogList')).not.toContainText('Older story');
});

test('AC4+AC5: backlog shows creation dates and persists to project data', async ({ page }) => {
  await openBacklogTab(page);

  const storyGroups = page.locator('#backlogList .story-group');
  await expect(storyGroups.first()).toContainText('Newer story');
  await expect(storyGroups.first().locator('.backlog-date')).toBeVisible();

  await page.locator('#backlogInput').fill('Persist me');
  await page.locator('#addToBacklogBtn').click();

  const persisted = await getPersistedState(page);
  const project = persisted.projects.find(p => p.id === 'p1');
  expect(project.backlog.some(item => item.title === 'Persist me')).toBe(true);
});

test('AC6: backlog is separate from sprint board cards', async ({ page }) => {
  await openBacklogTab(page);

  await expect(page.locator('#backlogList .story-group')).toHaveCount(2);
  await page.locator('#manageProjectsBtn').click();
  await expect(page.locator('.list .card')).toHaveCount(0);
});