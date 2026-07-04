// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE_URL, loadGuestBoard } = require('./helpers');

const GUEST_STATE = {
  currentBoardId: 'b1',
  currentProjectId: 'p1',
  editingCard: null,
  projects: [{ id: 'p1', name: 'Test Project', description: '', owner: { id: 'u1', name: 'Tester', email: 'test@test.com' }, members: [], sprintIds: ['b1'], backlog: [] }],
  boards: [{
    id: 'b1',
    name: 'Test Board',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    members: [],
    lists: [{ id: 'l1', title: 'To Do', cards: [{ id: 'c1', title: 'Card', description: '', labels: [], dueDate: '', checklist: [], initialEstimate: 0, remainingHours: 0 }] }]
  }]
};

async function waitForAppReady(page) {
  await page.waitForFunction(() => {
    const loading = document.getElementById('loadingScreen');
    return loading && loading.classList.contains('hidden');
  }, null, { timeout: 15000 });
}

// ---------------------------------------------------------------------------
// Guest mode (Firebase blocked) — skips auth, shows board
// ---------------------------------------------------------------------------
test('guest mode: skips auth screen and shows board with header', async ({ page }) => {
  await loadGuestBoard(page, GUEST_STATE);

  await expect(page.locator('#authScreen')).toHaveClass(/hidden/);
  await expect(page.locator('.header')).toBeVisible();
  await expect(page.locator('.logo-text')).toHaveText('Scrum71');
  await expect(page.locator('.user-avatar')).toBeVisible();
  await expect(page.locator('.list')).toBeVisible();
});

// ---------------------------------------------------------------------------
// Firebase configured — auth UI for unauthenticated users
// ---------------------------------------------------------------------------
test('Firebase mode: shows auth screen with login, register, and OAuth buttons', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);

  const firebaseConfigured = await page.evaluate(() => {
    return typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0;
  });

  if (!firebaseConfigured) {
    test.skip(true, 'Firebase SDK not loaded in this environment');
    return;
  }

  const authVisible = await page.locator('#authScreen').evaluate(el => !el.classList.contains('hidden'));
  const headerVisible = await page.locator('.header').evaluate(el => !el.classList.contains('hidden'));

  if (authVisible && !headerVisible) {
    await expect(page.locator('#loginForm')).toBeVisible();
    await expect(page.locator('#loginEmail')).toBeVisible();
    await expect(page.locator('#loginPassword')).toBeVisible();
    await expect(page.locator('#registerForm')).toHaveClass(/hidden/);
    await expect(page.locator('#googleSignIn')).toBeVisible();
    await expect(page.locator('#githubSignIn')).toBeVisible();

    await page.locator('#forgotPasswordLink').click();
    await expect(page.locator('#resetForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#resetEmail')).toBeVisible();

    await page.locator('#backToLoginLink').click();
    await page.locator('.auth-tab[data-tab="register"]').click();
    await expect(page.locator('#registerForm')).not.toHaveClass(/hidden/);
    await expect(page.locator('#registerName')).toBeVisible();
    await expect(page.locator('#registerEmail')).toBeVisible();
    await expect(page.locator('#registerPassword')).toBeVisible();
  } else if (headerVisible) {
    // Already signed in from a prior session — still a valid Firebase auth state
    await expect(page.locator('.header')).toBeVisible();
  } else {
    throw new Error('Neither auth screen nor header visible after init');
  }
});

test('Firebase mode: invalid login shows user-friendly error', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForAppReady(page);

  const authVisible = await page.locator('#authScreen').evaluate(el => !el.classList.contains('hidden'));
  if (!authVisible) {
    test.skip(true, 'User already authenticated');
    return;
  }

  await page.locator('#loginEmail').fill('not-a-valid-user@example.com');
  await page.locator('#loginPassword').fill('wrongpassword123');
  await page.locator('#loginForm button[type="submit"]').click();

  await expect(page.locator('.toast.error')).toBeVisible({ timeout: 8000 });
});