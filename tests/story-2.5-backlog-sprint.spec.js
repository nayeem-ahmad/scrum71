// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard, getPersistedState } = require('./helpers');

const PROJECT_ID = 'p1';
const BOARD_1 = 'b1';
const BOARD_2 = 'b2';
const OTHER_BOARD = 'b-other';
const STORY_ID = 'story-1';
const TASK_ID = 'task-1';

const PM_STATE = {
  currentBoardId: BOARD_1,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [
    {
      id: PROJECT_ID,
      name: 'Alpha Project',
      description: '',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
      members: [],
      sprintIds: [BOARD_1, BOARD_2],
      backlog: [
        { id: STORY_ID, type: 'story', title: 'User auth', status: 'open', addedAt: '2026-06-01T10:00:00.000Z' },
        { id: TASK_ID, type: 'task', title: 'Build login form', linkedStoryId: STORY_ID, status: 'open', addedAt: '2026-06-02T10:00:00.000Z' },
      ],
    },
    {
      id: 'p2',
      name: 'Beta Project',
      description: '',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
      members: [],
      sprintIds: [OTHER_BOARD],
      backlog: [],
    },
  ],
  boards: [
    {
      id: BOARD_1,
      name: 'Sprint 1',
      projectId: PROJECT_ID,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l1', title: 'To Do', cards: [] }],
    },
    {
      id: BOARD_2,
      name: 'Sprint 2',
      projectId: PROJECT_ID,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l2', title: 'To Do', cards: [] }],
    },
    {
      id: OTHER_BOARD,
      name: 'Other Sprint',
      projectId: 'p2',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
      members: [],
      lists: [{ id: 'l3', title: 'To Do', cards: [] }],
    },
  ],
};

async function openBacklogTab(page) {
  await loadGuestBoard(page, PM_STATE);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="backlog"]').click();
  await expect(page.locator('#pmTabBacklog')).toHaveClass(/active/);
}

test('AC1+AC2+AC3: adding backlog task to sprint creates card and keeps backlog reference', async ({ page }) => {
  await openBacklogTab(page);

  await page.locator(`.backlog-task[data-id="${TASK_ID}"] .move-sprint-btn`).click();
  await expect(page.locator('#sprintPickerModal')).toHaveClass(/active/);
  await page.locator('.sprint-picker-item', { hasText: 'Sprint 2' }).click();

  const taskRow = page.locator(`.backlog-task[data-id="${TASK_ID}"]`);
  await expect(taskRow).toHaveClass(/in-sprint/);
  await expect(taskRow.locator('.backlog-sprint-badge')).toContainText('Sprint 2');

  const persisted = await getPersistedState(page);
  const project = persisted.projects.find(p => p.id === PROJECT_ID);
  const task = project.backlog.find(t => t.id === TASK_ID);
  expect(task.status).toBe('in-sprint');
  expect(task.sprintId).toBe(BOARD_2);
  expect(task.cardId).toBeTruthy();

  const sprint2 = persisted.boards.find(b => b.id === BOARD_2);
  const card = sprint2.lists[0].cards.find(c => c.id === task.cardId);
  expect(card.title).toBe('Build login form');
  expect(card.linkedTaskId).toBe(TASK_ID);
});

test('AC4+AC5: in-sprint items show badge and can be removed without deleting backlog item', async ({ page }) => {
  const withTaskInSprint = {
    ...PM_STATE,
    boards: PM_STATE.boards.map(b => {
      if (b.id !== BOARD_2) return b;
      return {
        ...b,
        lists: [{
          id: 'l2',
          title: 'To Do',
          cards: [{
            id: 'card-1',
            title: 'Build login form',
            description: '',
            labels: [],
            checklist: [],
            comments: [],
            linkedTaskId: TASK_ID,
            linkedStoryId: STORY_ID,
            initialEstimate: 0,
            remainingHoursLog: [],
          }],
        }],
      };
    }),
    projects: PM_STATE.projects.map(p => {
      if (p.id !== PROJECT_ID) return p;
      return {
        ...p,
        backlog: p.backlog.map(item =>
          item.id === TASK_ID
            ? { ...item, status: 'in-sprint', sprintId: BOARD_2, cardId: 'card-1' }
            : item
        ),
      };
    }),
  };

  await loadGuestBoard(page, withTaskInSprint);
  await page.locator('#manageProjectsBtn').click();
  await page.locator('.pm-tab[data-tab="backlog"]').click();

  const taskRow = page.locator(`.backlog-task[data-id="${TASK_ID}"]`);
  await expect(taskRow.locator('.remove-sprint-btn')).toBeVisible();
  await expect(taskRow.locator('.move-sprint-btn')).toHaveCount(0);

  await taskRow.locator('.remove-sprint-btn').click();
  await expect(page.locator('.toast.success')).toContainText('Removed from sprint');

  await expect(taskRow).not.toHaveClass(/in-sprint/);
  await expect(page.locator('#backlogList')).toContainText('Build login form');

  const persisted = await getPersistedState(page);
  const sprint2 = persisted.boards.find(b => b.id === BOARD_2);
  expect(sprint2.lists[0].cards).toHaveLength(0);
  const task = persisted.projects.find(p => p.id === PROJECT_ID).backlog.find(t => t.id === TASK_ID);
  expect(task.status).toBe('open');
  expect(task.sprintId).toBeUndefined();
});

test('AC6: sprint picker lists only sprints for the current project', async ({ page }) => {
  await openBacklogTab(page);

  await page.locator(`.backlog-task[data-id="${TASK_ID}"] .move-sprint-btn`).click();
  await expect(page.locator('#sprintPickerList .sprint-picker-item')).toHaveCount(2);
  await expect(page.locator('#sprintPickerList')).toContainText('Sprint 1');
  await expect(page.locator('#sprintPickerList')).toContainText('Sprint 2');
  await expect(page.locator('#sprintPickerList')).not.toContainText('Other Sprint');
});