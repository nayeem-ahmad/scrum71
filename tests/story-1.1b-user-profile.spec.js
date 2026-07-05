// @ts-check
const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

const DEFAULT_BOARD_STATE = {
  currentBoardId: 'b1',
  currentProjectId: 'p1',
  editingCard: null,
  projects: [{
    id: 'p1',
    name: 'Sync Project',
    description: '',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com' },
    ownerId: 'u1',
    members: [],
    memberEmails: ['test@test.com'],
    sprintIds: ['b1'],
    backlog: [],
    updatedAt: new Date().toISOString()
  }],
  boards: [{
    id: 'b1',
    name: 'Sync Board',
    projectId: 'p1',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    owner: { id: 'u1', name: 'Tester', email: 'test@test.com', photoURL: null },
    ownerId: 'u1',
    members: [],
    memberEmails: ['test@test.com'],
    lists: [{ id: 'l1', title: 'To Do', cards: [] }],
    history: [],
    updatedAt: new Date().toISOString()
  }]
};

test.describe('User Profile Modal E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**gstatic.com/firebasejs/**', route => route.abort());
    await page.route('**firebaseapp.com/**', route => route.abort());

    // Inject mock Firebase and Firestore profile data
    await page.addInitScript((stateJson) => {
      // Seed localStorage
      localStorage.setItem('flowboard-state', stateJson);

      window.lastSavedProfile = null;
      window.lastAuthUpdates = null;

      window.mockDb = {
        collection: (colName) => ({
          doc: (docId) => ({
            get: async () => ({
              exists: docId === 'u1',
              data: () => ({
                mobile: '+15555555555',
                details: 'Software Architect & Designer'
              })
            }),
            set: async (data, options) => {
              window.lastSavedProfile = data;
            }
          }),
          where: () => ({
            get: async () => ({
              forEach: () => {}
            })
          })
        }),
        enablePersistence: async () => {}
      };

      const firestoreMock = () => window.mockDb;
      firestoreMock.FieldValue = {
        serverTimestamp: () => new Date().toISOString()
      };

      window.firebase = {
        initializeApp: () => {},
        auth: () => ({
          onAuthStateChanged: (cb) => {
            setTimeout(() => {
              cb({
                uid: 'u1',
                email: 'test@test.com',
                displayName: 'Original Tester',
                photoURL: 'https://example.com/original-avatar.png',
                updateProfile: async (updates) => {
                  window.lastAuthUpdates = updates;
                }
              });
            }, 50);
          },
          currentUser: {
            uid: 'u1',
            email: 'test@test.com',
            displayName: 'Original Tester',
            photoURL: 'https://example.com/original-avatar.png',
            updateProfile: async (updates) => {
              window.lastAuthUpdates = updates;
            }
          }
        }),
        firestore: firestoreMock
      };
    }, JSON.stringify(DEFAULT_BOARD_STATE));
  });

  test('should open user menu and display correct auth user info', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.user-avatar', { timeout: 12000 });

    // Open user menu
    await page.locator('.user-avatar').click();
    await expect(page.locator('#userMenu')).toHaveClass(/active/);

    // Verify displayed user details
    await expect(page.locator('#userMenuName')).toHaveText('Original Tester');
    await expect(page.locator('#userMenuEmail')).toHaveText('test@test.com');
  });

  test('should open profile modal and populate fields from Firestore', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.user-avatar', { timeout: 12000 });

    // Open profile modal
    await page.locator('.user-avatar').click();
    await page.locator('#profileBtn').click();
    await expect(page.locator('#profileModal')).toHaveClass(/active/);

    // Verify fields populated
    await expect(page.locator('#profileName')).toHaveValue('Original Tester');
    await expect(page.locator('#profilePhotoURL')).toHaveValue('https://example.com/original-avatar.png');
    await expect(page.locator('#profileMobile')).toHaveValue('+15555555555');
    await expect(page.locator('#profileDetails')).toHaveValue('Software Architect & Designer');
  });

  test('should save profile updates and trigger Firebase operations', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.user-avatar', { timeout: 12000 });

    // Open profile modal
    await page.locator('.user-avatar').click();
    await page.locator('#profileBtn').click();
    await expect(page.locator('#profileModal')).toHaveClass(/active/);

    // Edit fields
    await page.locator('#profileName').fill('Updated Tester');
    await page.locator('#profilePhotoURL').fill('https://example.com/new-avatar.png');
    await page.locator('#profileMobile').fill('+19999999999');
    await page.locator('#profileDetails').fill('Lead Dev');

    // Save
    await page.locator('#saveProfileBtn').click();

    // Verify success toast
    await expect(page.locator('.toast.success')).toBeVisible();
    await expect(page.locator('.toast.success')).toContainText('Profile updated successfully');

    // Verify modal closed
    await expect(page.locator('#profileModal')).not.toHaveClass(/active/);

    // Verify page state updates
    const authUpdates = await page.evaluate(() => window.lastAuthUpdates);
    const firestoreUpdates = await page.evaluate(() => window.lastSavedProfile);

    expect(authUpdates.displayName).toBe('Updated Tester');
    expect(authUpdates.photoURL).toBe('https://example.com/new-avatar.png');
    expect(firestoreUpdates.mobile).toBe('+19999999999');
    expect(firestoreUpdates.details).toBe('Lead Dev');
  });

  test('should dismiss profile modal on cancel or close button click', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.user-avatar', { timeout: 12000 });

    // Open modal
    await page.locator('.user-avatar').click();
    await page.locator('#profileBtn').click();
    await expect(page.locator('#profileModal')).toHaveClass(/active/);

    // Cancel using cancel button
    await page.locator('#cancelProfileBtn').click();
    await expect(page.locator('#profileModal')).not.toHaveClass(/active/);

    // Open modal again
    await page.locator('.user-avatar').click();
    await page.locator('#profileBtn').click();
    await expect(page.locator('#profileModal')).toHaveClass(/active/);

    // Cancel using X close button
    await page.locator('#closeProfileModal').click();
    await expect(page.locator('#profileModal')).not.toHaveClass(/active/);
  });
});
