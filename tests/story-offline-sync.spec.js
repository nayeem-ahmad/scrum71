// @ts-check
const { test, expect } = require('@playwright/test');
const { setupGuestMode, loadGuestBoard } = require('./helpers');

const BASE_URL = 'http://localhost:7890';

const todayStr = new Date().toISOString().slice(0, 10);

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
    history: [{ date: todayStr, remaining: 0, byAssignee: {} }],
    updatedAt: new Date().toISOString()
  }]
};

test.describe('Offline & Sync Reconciliation', () => {

  test.beforeEach(({ page }) => {
    page.on('console', msg => {
      console.log(`[PAGE CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`[PAGE UNCAUGHT ERROR] ${err.message}`);
    });
  });

  test('should display offline warning toast when browser goes offline', async ({ page }) => {
    await loadGuestBoard(page, DEFAULT_BOARD_STATE);

    // Trigger offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    const toast = page.locator('.toast.warning');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/working offline/i);
  });

  test('should display online sync toast when browser goes back online', async ({ page }) => {
    await loadGuestBoard(page, DEFAULT_BOARD_STATE);

    // Trigger online event (simulate guest user going online, doesn't sync without auth user)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });

    const toast = page.locator('.toast.info');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(/back online/i);
  });

  test('should reconcile and sync local changes to cloud if local is newer', async ({ page }) => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const rightNow = new Date().toISOString();

    // Inject mock firebase before loading
    await page.addInitScript(({ oneHourAgoDate, today }) => {
      window.lastSaved = { projects: {}, boards: {}, users: {} };
      
      const serverProject = {
        id: 'p1',
        name: 'Older Server Project Name',
        updatedAt: oneHourAgoDate,
        memberEmails: ['test@test.com'],
        ownerId: 'u1'
      };
      const serverBoard = {
        id: 'b1',
        name: 'Older Server Board Name',
        updatedAt: oneHourAgoDate,
        memberEmails: ['test@test.com'],
        ownerId: 'u1',
        lists: [{ id: 'l1', title: 'To Do', cards: [] }],
        history: [{ date: today, remaining: 0, byAssignee: {} }]
      };

      window.mockDb = {
        collection: (colName) => ({
          doc: (docId) => ({
            get: async () => ({
              exists: docId === 'u1',
              data: () => ({ currentBoardId: 'b1', currentProjectId: 'p1' })
            }),
            set: async (data, options) => {
              window.lastSaved[colName][docId] = data;
            }
          }),
          where: (field, op, value) => ({
            get: async () => {
              const docs = [];
              if (colName === 'projects') {
                docs.push({ id: 'p1', data: () => serverProject });
              } else if (colName === 'boards') {
                docs.push({ id: 'b1', data: () => serverBoard });
              }
              return {
                forEach: (cb) => docs.forEach(cb)
              };
            }
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
            // Immediately simulate logged in user
            setTimeout(() => {
              cb({ uid: 'u1', email: 'test@test.com', displayName: 'Tester' });
            }, 50);
          },
          currentUser: { uid: 'u1', email: 'test@test.com' }
        }),
        firestore: firestoreMock
      };
    }, { oneHourAgoDate: oneHourAgo, today: todayStr });

    // Local state is newer (current time)
    const localState = {
      currentBoardId: 'b1',
      currentProjectId: 'p1',
      editingCard: null,
      projects: [{
        id: 'p1',
        name: 'Newer Local Project Name',
        updatedAt: rightNow,
        memberEmails: ['test@test.com'],
        ownerId: 'u1'
      }],
      boards: [{
        id: 'b1',
        name: 'Newer Local Board Name',
        updatedAt: rightNow,
        memberEmails: ['test@test.com'],
        ownerId: 'u1',
        lists: [{ id: 'l1', title: 'To Do', cards: [] }],
        history: [{ date: todayStr, remaining: 0, byAssignee: {} }]
      }]
    };

    // Load page with newer localState
    await setupGuestMode(page, localState);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.list, .board-container .empty-state').first()).toBeVisible({ timeout: 12000 });

    // Check localStorage content to verify it contains the newer local board name
    const state = await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('flowboard-state'));
      return store;
    });

    expect(state.projects[0].name).toBe('Newer Local Project Name');
    expect(state.boards[0].name).toBe('Newer Local Board Name');

    // Check what was saved to mock database
    const saved = await page.evaluate(() => window.lastSaved);
    expect(saved.projects['p1'].name).toBe('Newer Local Project Name');
    expect(saved.boards['b1'].name).toBe('Newer Local Board Name');
  });

  test('should reconcile and adopt remote changes if server is newer', async ({ page }) => {
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const rightNow = new Date().toISOString();

    // Inject mock firebase before loading
    await page.addInitScript(({ rightNowDate, today }) => {
      window.lastSaved = { projects: {}, boards: {}, users: {} };
      
      const serverProject = {
        id: 'p1',
        name: 'Newer Server Project Name',
        updatedAt: rightNowDate,
        memberEmails: ['test@test.com'],
        ownerId: 'u1'
      };
      const serverBoard = {
        id: 'b1',
        name: 'Newer Server Board Name',
        updatedAt: rightNowDate,
        memberEmails: ['test@test.com'],
        ownerId: 'u1',
        lists: [{ id: 'l1', title: 'To Do', cards: [] }],
        history: [{ date: today, remaining: 0, byAssignee: {} }]
      };

      window.mockDb = {
        collection: (colName) => ({
          doc: (docId) => ({
            get: async () => ({
              exists: docId === 'u1',
              data: () => ({ currentBoardId: 'b1', currentProjectId: 'p1' })
            }),
            set: async (data, options) => {
              window.lastSaved[colName][docId] = data;
            }
          }),
          where: (field, op, value) => ({
            get: async () => {
              const docs = [];
              if (colName === 'projects') {
                docs.push({ id: 'p1', data: () => serverProject });
              } else if (colName === 'boards') {
                docs.push({ id: 'b1', data: () => serverBoard });
              }
              return {
                forEach: (cb) => docs.forEach(cb)
              };
            }
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
            // Immediately simulate logged in user
            setTimeout(() => {
              cb({ uid: 'u1', email: 'test@test.com', displayName: 'Tester' });
            }, 50);
          },
          currentUser: { uid: 'u1', email: 'test@test.com' }
        }),
        firestore: firestoreMock
      };
    }, { rightNowDate: rightNow, today: todayStr });

    // Local state is older (1 hour ago)
    const localState = {
      currentBoardId: 'b1',
      currentProjectId: 'p1',
      editingCard: null,
      projects: [{
        id: 'p1',
        name: 'Older Local Project Name',
        updatedAt: oneHourAgo,
        memberEmails: ['test@test.com'],
        ownerId: 'u1'
      }],
      boards: [{
        id: 'b1',
        name: 'Older Local Board Name',
        updatedAt: oneHourAgo,
        memberEmails: ['test@test.com'],
        ownerId: 'u1',
        lists: [{ id: 'l1', title: 'To Do', cards: [] }],
        history: [{ date: todayStr, remaining: 0, byAssignee: {} }]
      }]
    };

    // Load page with older localState
    await setupGuestMode(page, localState);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.list, .board-container .empty-state').first()).toBeVisible({ timeout: 12000 });

    // Verify state adopted the newer server names
    const state = await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('flowboard-state'));
      return store;
    });

    expect(state.projects[0].name).toBe('Newer Server Project Name');
    expect(state.boards[0].name).toBe('Newer Server Board Name');

    // Verify that NO write back (upload) was triggered since server was newer
    const saved = await page.evaluate(() => window.lastSaved);
    expect(Object.keys(saved.projects).length).toBe(0);
    expect(Object.keys(saved.boards).length).toBe(0);
  });
});
