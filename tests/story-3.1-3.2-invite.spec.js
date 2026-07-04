// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE_URL, setupGuestMode, loadGuestBoard, getPersistedState } = require('./helpers');

const PROJECT_ID = 'p-invite';
const BOARD_ID = 'b-invite';
const INVITE_TOKEN = 'valid-invite-token-abc';

const INVITE_STATE = {
  currentBoardId: BOARD_ID,
  currentProjectId: PROJECT_ID,
  editingCard: null,
  projects: [{
    id: PROJECT_ID,
    name: 'Invite Project',
    description: '',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    sprintIds: [BOARD_ID],
    backlog: [],
  }],
  boards: [{
    id: BOARD_ID,
    name: 'Sprint Invite',
    projectId: PROJECT_ID,
    inviteToken: INVITE_TOKEN,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'owner1', name: 'Pat Owner', email: 'owner@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
  }],
};

test('AC2+AC3: project info shows invite link with token and board id', async ({ page }) => {
  await loadGuestBoard(page, INVITE_STATE);
  await page.locator('#projectInfoBtn').click();
  await expect(page.locator('#projectInfoModal')).toHaveClass(/active/);

  const link = await page.locator('#inviteLinkInput').inputValue();
  expect(link).toContain(`invite=${INVITE_TOKEN}`);
  expect(link).toContain(`board=${BOARD_ID}`);

  await page.locator('#copyInviteLinkBtn').click();
  await expect(page.locator('.toast.success')).toContainText('Copied');
});

test('AC1+AC2+AC3+AC6: valid invite URL joins user and adds them to project team', async ({ page }) => {
  await setupGuestMode(page, INVITE_STATE);
  const joinUrl = `${BASE_URL}/?invite=${INVITE_TOKEN}&board=${BOARD_ID}&joinAs=newjoiner@test.com`;
  await page.goto(joinUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.board-container', { timeout: 12000 });

  await expect(page.locator('.toast.success')).toContainText('Joined successfully');
  await expect(page.locator('#currentBoardName')).toHaveText('Sprint Invite');

  const persisted = await getPersistedState(page);
  const project = persisted.projects.find(p => p.id === PROJECT_ID);
  expect(project.members.some(m => m.email === 'newjoiner@test.com')).toBe(true);

  await page.locator('#projectInfoBtn').click();
  await expect(page.locator('#teamMembersList')).toContainText('newjoiner@test.com');
});

test('AC4: invalid invite token shows error toast', async ({ page }) => {
  await setupGuestMode(page, INVITE_STATE);
  await page.goto(`${BASE_URL}/?invite=bad-token&board=${BOARD_ID}&joinAs=new@test.com`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.board-container', { timeout: 12000 });
  await expect(page.locator('.toast.error')).toContainText('Invalid or expired invite link');
});

test('AC5: already-member user sees warning when using invite link', async ({ page }) => {
  const stateWithMember = {
    ...INVITE_STATE,
    projects: [{
      ...INVITE_STATE.projects[0],
      members: [{
        id: 'mem-existing',
        name: 'Existing',
        email: 'existing@test.com',
        role: 'member',
        addedAt: '2026-06-01T00:00:00.000Z',
      }],
    }],
  };

  await setupGuestMode(page, stateWithMember);
  await page.goto(`${BASE_URL}/?invite=${INVITE_TOKEN}&board=${BOARD_ID}&joinAs=existing@test.com`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.board-container', { timeout: 12000 });
  await expect(page.locator('.toast.warning')).toContainText('already a member');
});

test('AC4: regenerate invite link is hidden for regular members', async ({ page }) => {
  const memberViewState = {
    ...INVITE_STATE,
    projects: [{
      ...INVITE_STATE.projects[0],
      members: [{
        id: 'mem1',
        name: 'Sam',
        email: 'member@test.com',
        role: 'member',
        addedAt: '2026-06-01T00:00:00.000Z',
      }],
    }],
  };

  await page.route('**gstatic.com/firebasejs/**', route => route.abort());
  await page.route('**firebaseapp.com/**', route => route.abort());
  await page.addInitScript((stateJson) => {
    localStorage.setItem('flowboard-state', stateJson);
    localStorage.setItem('flowboard-guest-identity', JSON.stringify({
      email: 'member@test.com',
      name: 'Sam',
      photoURL: null,
    }));
  }, JSON.stringify(memberViewState));
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.board-container', { timeout: 12000 });
  await page.locator('#projectInfoBtn').click();
  await expect(page.locator('#regenerateLinkBtn')).toBeHidden();
});