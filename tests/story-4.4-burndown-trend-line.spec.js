// @ts-check
const { test, expect } = require('@playwright/test');
const { loadGuestBoard } = require('./helpers');

const BOARD_ID = 'b-trend';

const TREND_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: null,
  editingCard: null,
  projects: [],
  boards: [{
    id: BOARD_ID,
    name: 'Trend Sprint',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    startDate: '2026-06-01',
    endDate: '2026-06-07',
    history: [
      { date: '2026-06-01', remaining: 20 },
      { date: '2026-06-03', remaining: 14 },
    ],
    lists: [{
      id: 'l1',
      title: 'In Progress',
      cards: [
        {
          id: 'c1',
          title: 'Feature',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          initialEstimate: 12,
          remainingHoursLog: [{ id: 'r1', remainingHours: 10, timestamp: '2026-06-05T10:00:00.000Z' }],
          spentHoursLog: [],
        },
        {
          id: 'c2',
          title: 'Bugfix',
          description: '',
          labels: [],
          dueDate: '',
          checklist: [],
          initialEstimate: 8,
          remainingHoursLog: [{ id: 'r2', remainingHours: 4, timestamp: '2026-06-05T10:00:00.000Z' }],
          spentHoursLog: [],
        },
      ],
    }],
  }],
};

test('AC1+AC2+AC3+AC4: chart includes Actual and Ideal datasets with distinct styling', async ({ page }) => {
  await loadGuestBoard(page, TREND_STATE);
  await expect(page.locator('#burndownChart')).toBeVisible();

  const datasets = await page.evaluate(() => {
    const chart = window.Chart?.getChart('burndownChart');
    if (!chart) return null;
    return chart.data.datasets.map(ds => ({
      label: ds.label,
      borderDash: ds.borderDash || null,
      first: ds.data.find(v => v != null),
      last: [...ds.data].reverse().find(v => v != null),
    }));
  });

  expect(datasets).not.toBeNull();
  expect(datasets).toHaveLength(2);

  const actual = datasets.find(d => d.label === 'Actual');
  const ideal = datasets.find(d => d.label === 'Ideal');

  expect(actual).toBeDefined();
  expect(ideal).toBeDefined();
  expect(ideal.borderDash).toEqual([6, 4]);
  expect(ideal.first).toBe(20);
  expect(ideal.last).toBe(0);
});