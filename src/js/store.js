import { auth, db, isFirebaseConfigured } from './config.js';
import { generateId, showToast, getEffectiveRemainingHours } from './utils.js';

// ================================
// DATA STORE
// ================================
export let state = {
    boards: [],
    projects: [],
    currentBoardId: null,
    currentProjectId: null,
    editingCard: null
};

// We will manage currentUser via a setter/getter or just update it
let _currentUser = null;
export const getCurrentUser = () => _currentUser;
export const setCurrentUser = (user) => { _currentUser = user; };

export const getCurrentBoard = () => state.boards.find(b => b.id === state.currentBoardId);

// ================================
// SAMPLE DATA
// ================================
export const initializeSampleData = () => {
    const sampleBoard = {
        id: generateId(),
        name: 'My Project Board',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        owner: {
            id: 'owner-1',
            name: 'You',
            email: 'you@example.com',
            photoURL: null
        },
        members: [
            {
                id: 'member-1',
                name: 'Sarah Chen',
                email: 'sarah.chen@example.com',
                photoURL: null,
                role: 'member',
                addedAt: new Date().toISOString()
            },
            {
                id: 'member-2',
                name: 'Alex Johnson',
                email: 'alex.j@example.com',
                photoURL: null,
                role: 'member',
                addedAt: new Date().toISOString()
            }
        ],
        lists: [
            {
                id: generateId(),
                title: 'To Do',
                cards: [
                    { id: generateId(), title: 'Research competitor products', description: 'Analyze top 5 competitors', labels: ['priority-high'], dueDate: '2026-01-10', checklist: [{ id: generateId(), text: 'Find competitors', completed: true }, { id: generateId(), text: 'Analyze features', completed: false }], initialEstimate: 8, remainingHoursLog: [{ id: generateId(), remainingHours: 5, timestamp: '2026-01-03T10:00:00.000Z' }] },
                    { id: generateId(), title: 'Design homepage mockup', description: 'Create wireframes and high-fidelity designs', labels: ['feature'], dueDate: '', checklist: [], initialEstimate: 16, remainingHoursLog: [{ id: generateId(), remainingHours: 16, timestamp: '2026-01-03T10:00:00.000Z' }] },
                    { id: generateId(), title: 'Set up development environment', description: '', labels: ['improvement'], dueDate: '2026-01-08', checklist: [], initialEstimate: 4, remainingHoursLog: [{ id: generateId(), remainingHours: 2, timestamp: '2026-01-03T10:00:00.000Z' }] }
                ]
            },
            {
                id: generateId(),
                title: 'In Progress',
                cards: [
                    { id: generateId(), title: 'Implement user authentication', description: 'OAuth2 and email/password login', labels: ['feature', 'priority-medium'], dueDate: '2026-01-15', checklist: [{ id: generateId(), text: 'Set up OAuth', completed: true }, { id: generateId(), text: 'Email verification', completed: false }], initialEstimate: 24, remainingHoursLog: [{ id: generateId(), remainingHours: 12, timestamp: '2026-01-03T10:00:00.000Z' }] },
                    { id: generateId(), title: 'Create database schema', description: 'PostgreSQL with proper indexing', labels: ['priority-high'], dueDate: '', checklist: [], initialEstimate: 8, remainingHoursLog: [{ id: generateId(), remainingHours: 6, timestamp: '2026-01-03T10:00:00.000Z' }] }
                ]
            },
            {
                id: generateId(),
                title: 'Review',
                cards: [
                    { id: generateId(), title: 'API documentation', description: 'Swagger/OpenAPI specs', labels: ['improvement'], dueDate: '2026-01-07', checklist: [], initialEstimate: 6, remainingHoursLog: [{ id: generateId(), remainingHours: 3, timestamp: '2026-01-03T10:00:00.000Z' }] }
                ]
            },
            {
                id: generateId(),
                title: 'Done',
                cards: [
                    { id: generateId(), title: 'Project setup', description: 'Initial configuration complete', labels: ['priority-low'], dueDate: '', checklist: [], initialEstimate: 2, remainingHoursLog: [] },
                    { id: generateId(), title: 'Team kickoff meeting', description: 'Introductions and project overview', labels: [], dueDate: '', checklist: [], initialEstimate: 1, remainingHoursLog: [] }
                ]
            }
        ],
        history: [
            { date: '2026-01-01', remaining: 42 },
            { date: '2026-01-02', remaining: 38 },
            { date: '2026-01-03', remaining: 32 },
            { date: '2026-01-04', remaining: 29 }
        ]
    };

    const sampleProject = {
        id: generateId(),
        name: 'Main Project',
        description: 'Main development project',
        owner: sampleBoard.owner,
        members: [...sampleBoard.members],
        backlog: [
            { id: generateId(), title: 'Explore microservices architecture', addedAt: new Date().toISOString() }
        ],
        sprintIds: [sampleBoard.id]
    };

    sampleBoard.projectId = sampleProject.id;
    sampleBoard.startDate = new Date().toISOString().split('T')[0];
    sampleBoard.endDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    state.boards = [sampleBoard];
    state.projects = [sampleProject];
    state.currentBoardId = sampleBoard.id;
    state.currentProjectId = sampleProject.id;
};


// ================================
// DATA PERSISTENCE
// ================================
export const saveState = async () => {
    // Always save to localStorage as backup
    localStorage.setItem('flowboard-state', JSON.stringify(state));

    // If Firebase is configured and user is logged in, save to Firestore
    if (isFirebaseConfigured && _currentUser) {
        try {
            // 1. Save preferences to user profile
            await db.collection('users').doc(_currentUser.uid).set({
                currentBoardId: state.currentBoardId,
                currentProjectId: state.currentProjectId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // 2. Save CURRENT board
            const currentBoard = getCurrentBoard();
            if (currentBoard) {
                const memberEmails = [
                    currentBoard.owner?.email,
                    ...(currentBoard.members || []).map(m => m.email)
                ].filter(Boolean);

                await db.collection('boards').doc(currentBoard.id).set({
                    ...currentBoard,
                    memberEmails,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // 3. Save CURRENT project
            const currentProject = state.projects.find(p => p.id === state.currentProjectId);
            if (currentProject) {
                const projectMemberEmails = [
                    currentProject.owner?.email,
                    ...(currentProject.members || []).map(m => m.email)
                ].filter(Boolean);

                await db.collection('projects').doc(currentProject.id).set({
                    ...currentProject,
                    memberEmails: projectMemberEmails,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        } catch (error) {
            console.error('Error saving to Firestore:', error);
            showToast('Failed to sync to cloud', 'warning');
        }
    }
};

export const loadState = async () => {
    if (isFirebaseConfigured && _currentUser) {
        try {
            // 1. Get User Preferences
            const userDoc = await db.collection('users').doc(_currentUser.uid).get();
            let serverCurrentBoardId = null;
            let serverCurrentProjectId = null;
            if (userDoc.exists) {
                serverCurrentBoardId = userDoc.data().currentBoardId;
                serverCurrentProjectId = userDoc.data().currentProjectId;
            }

            // 2. Query projects
            const projectsSnapshot = await db.collection('projects')
                .where('memberEmails', 'array-contains', _currentUser.email)
                .get();

            const projects = [];
            projectsSnapshot.forEach(doc => {
                projects.push(doc.data());
            });
            state.projects = projects;

            // 3. Query boards
            const boardsMap = new Map();

            // 3a. Boards where I am explicitly a member
            const membershipBoardsSnapshot = await db.collection('boards')
                .where('memberEmails', 'array-contains', _currentUser.email)
                .get();

            membershipBoardsSnapshot.forEach(doc => boardsMap.set(doc.id, doc.data()));

            // 3b. Boards that belong to my projects
            const projectIds = projects.map(p => p.id);
            if (projectIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < projectIds.length; i += 10) {
                    chunks.push(projectIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const projectBoardsSnapshot = await db.collection('boards')
                        .where('projectId', 'in', chunk)
                        .get();

                    projectBoardsSnapshot.forEach(doc => {
                        if (!boardsMap.has(doc.id)) {
                            boardsMap.set(doc.id, doc.data());
                        }
                    });
                }
            }

            state.boards = Array.from(boardsMap.values());

            if (state.boards.length > 0) {
                state.currentBoardId = serverCurrentBoardId || state.boards[0].id;
                if (!state.boards.find(b => b.id === state.currentBoardId)) {
                    state.currentBoardId = state.boards[0].id;
                }
            }

            if (projects.length > 0) {
                state.currentProjectId = serverCurrentProjectId || projects[0].id;
                if (!state.projects.find(p => p.id === state.currentProjectId)) {
                    state.currentProjectId = state.projects[0].id;
                }
            } else if (state.boards.length === 0) {
                const urlParams = new URLSearchParams(window.location.search);
                if (!urlParams.has('invite')) {
                    initializeSampleData();
                    saveState();
                }
            }
            return;
        } catch (error) {
            console.error('Error loading from Firestore:', error);
        }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('flowboard-state');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Direct assignment to state properties to maintain reference if possible, 
        // but state is exported as let.
        state.boards = parsed.boards || [];
        state.projects = parsed.projects || [];
        state.currentBoardId = parsed.currentBoardId;
        state.currentProjectId = parsed.currentProjectId;
        state.editingCard = parsed.editingCard;

        if (!state.boards.length) initializeSampleData();
    } else {
        initializeSampleData();
    }
};

// Invite Token Helpers (Store logic)
export const generateInviteToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const getOrCreateInviteToken = () => {
    const board = getCurrentBoard();
    if (!board) return null;

    if (!board.inviteToken) {
        board.inviteToken = generateInviteToken();
        saveState();
    }

    return board.inviteToken;
};

// User Profile Helpers
export const getUserProfile = async (uid) => {
    if (!isFirebaseConfigured) return null;
    try {
        const doc = await db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
};

export const saveUserProfile = async (uid, data) => {
    if (!isFirebaseConfigured) return;
    try {
        await db.collection('users').doc(uid).set({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error saving user profile:', error);
        throw error;
    }
};
