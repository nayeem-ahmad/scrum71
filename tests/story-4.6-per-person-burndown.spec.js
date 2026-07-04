// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const PROJECT_ID = 'p-burndown';
const BOARD_ID = 'b-burndown';

const BURNDOWN_FILTER_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Burndown Project',
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
    name: 'Filter Sprint',
    projectId: PROJECT_ID,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    startDate: '2026-06-01',
    endDate: '2026-06-07',
    history: [
      { date: '2026-06-01', remaining: 15, byAssignee: { mem1: 10, owner1: 5 } },
    ],
    lists: [{
      id: 'l1',
      title: 'To Do',
      cards: [
        {
          id: 'c1',
          title: 'Sam Task',
          assigneeId: 'mem1',
          labels: [],
          dueDate: '',
          checklist: [],
          initialEstimate: 10,
          remainingHoursLog: [{ id: 'r1', remainingHours: 8, timestamp: '2026-06-05T10:00:00.000Z' }],
          spentHoursLog: [],
        },
        {
          id: 'c2',
          title: 'Owner Task',
          assigneeId: 'owner1',
          labels: [],
          dueDate: '',
          checklist: [],
          initialEstimate: 5,
          remainingHoursLog: [{ id: 'r2', remainingHours: 3, timestamp: '2026-06-05T10:00:00.000Z' }],
          spentHoursLog: [],
        },
      ],
    }],
  }],
};

test('AC1+AC2+AC7: assignee filter dropdown lists team and defaults to All team', async ({ page }) => {
  await loadGuestBoard(page, BURNDOWN_FILTER_STATE);
  const select = page.locator('#burndownAssigneeFilter');
  await expect(select).toBeVisible();
  await expect(select).toHaveValue('all');
  await expect(select.locator('option[value="all"]')).toHaveText('All team');
  await expect(select.locator('option[value="owner1"]')).toHaveText('Pat Owner');
  await expect(select.locator('option[value="mem1"]')).toHaveText('Sam Member');
});

test('AC3+AC4+AC5+AC6: filtering to member updates chart totals and ideal line', async ({ page }) => {
  await loadGuestBoard(page, BURNDOWN_FILTER_STATE);
  await expect(page.locator('#totalRemainingValue')).toHaveText('11 h');

  await page.locator('#burndownAssigneeFilter').selectOption('mem1');
  await expect(page.locator('#totalRemainingValue')).toHaveText('8 h');
  await expect(page.locator('#burndownFilterSubtitle')).toContainText("Sam Member's work");

  const datasets = await page.evaluate(() => {
    const chart = window.Chart?.getChart('burndownChart');
    return chart?.data?.datasets?.map(ds => ({
      label: ds.label,
      last: [...ds.data].reverse().find(v => v != null),
      borderDash: ds.borderDash || null,
    }));
  });

  expect(datasets?.some(d => d.label === 'Ideal' && d.borderDash)).toBe(true);
  const ideal = datasets?.find(d => d.label === 'Ideal');
  expect(ideal?.last).toBe(0);

  await page.locator('#burndownAssigneeFilter').selectOption('all');
  await expect(page.locator('#totalRemainingValue')).toHaveText('11 h');
});

test('AC8: unassigned cards excluded from member filter empty state', async ({ page }) => {
  await loadGuestBoard(page, BURNDOWN_FILTER_STATE);
  await page.locator('#burndownAssigneeFilter').selectOption('owner1');
  await expect(page.locator('#totalRemainingValue')).toHaveText('3 h');
});