import { state, getCurrentBoard, getActiveProject, saveState, getCurrentUser, getOrCreateInviteToken, generateInviteToken, createProject, updateProject, deleteProject, deleteCard } from './store.js';
import { generateId, showToast, formatSprintDuration, getProjectTeamMembers, TEAM_ROLES, DEFAULT_PROJECT_LABELS, getProjectLabels } from './utils.js';
import { renderBoard, updateBurndownPanelVisibility } from './board.js';
import { db, isFirebaseConfigured } from './config.js';

// ================================
// INVITE LOGIC
// ================================
const resolveJoinIdentity = () => {
    const currentUser = getCurrentUser();
    if (currentUser?.email) {
        return {
            email: currentUser.email.toLowerCase(),
            name: currentUser.displayName || currentUser.email.split('@')[0],
            photoURL: currentUser.photoURL || null
        };
    }

    const urlParams = new URLSearchParams(window.location.search);
    const joinAs = urlParams.get('joinAs')?.trim().toLowerCase();
    if (joinAs) {
        return { email: joinAs, name: joinAs.split('@')[0], photoURL: null };
    }

    const raw = localStorage.getItem('flowboard-guest-identity');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.email) return parsed;
        } catch { /* ignore */ }
    }

    return { email: 'guest@local', name: 'Guest', photoURL: null };
};

/** @returns {'owner' | 'member' | 'added'} */
const addMemberToEntity = (entity, identity) => {
    const userEmail = identity.email.toLowerCase();
    if (entity.owner?.email?.toLowerCase() === userEmail) return 'owner';
    if (entity.members?.some(m => m.email?.toLowerCase() === userEmail)) return 'member';

    if (!entity.members) entity.members = [];
    entity.members.push({
        id: generateId(),
        name: identity.name || '',
        email: identity.email,
        photoURL: identity.photoURL || null,
        role: TEAM_ROLES.MEMBER,
        addedAt: new Date().toISOString()
    });
    if ('memberEmails' in entity || entity.owner) {
        entity.memberEmails = [entity.owner?.email, ...(entity.members.map(m => m.email))].filter(Boolean);
    }
    return 'added';
};

const finishInviteJoin = (boardId, projectId) => {
    state.currentBoardId = boardId;
    if (projectId) state.currentProjectId = projectId;
    renderBoard();
    showToast('Joined successfully!', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
};

const isAlreadyProjectMember = (project, identity) => {
    if (!project) return false;
    const email = identity.email.toLowerCase();
    if (project.owner?.email?.toLowerCase() === email) return true;
    return (project.members || []).some(m => m.email?.toLowerCase() === email);
};

const handleLocalInviteLink = (inviteToken, boardId) => {
    const board = state.boards.find(b => b.id === boardId);
    if (!board) {
        showToast('Board not found', 'error');
        return;
    }
    if (board.inviteToken !== inviteToken) {
        showToast('Invalid or expired invite link', 'error');
        return;
    }

    const identity = resolveJoinIdentity();
    const project = board.projectId
        ? state.projects.find(p => p.id === board.projectId)
        : null;

    if (isAlreadyProjectMember(project, identity)) {
        showToast('You are already a member of this project', 'warning');
        finishInviteJoin(boardId, board.projectId);
        return;
    }

    let joinedAny = false;

    if (addMemberToEntity(board, identity) === 'added') joinedAny = true;

    if (project) {
        if (addMemberToEntity(project, identity) === 'added') joinedAny = true;

        state.boards
            .filter(b => b.projectId === project.id && b.id !== board.id)
            .forEach(otherBoard => {
                if (addMemberToEntity(otherBoard, identity) === 'added') joinedAny = true;
            });
    }

    if (joinedAny) {
        saveState();
        finishInviteJoin(boardId, board.projectId);
        return;
    }

    showToast('Unable to join project', 'error');
};

export const handleInviteLink = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteToken = urlParams.get('invite');
    const boardId = urlParams.get('board');

    if (!inviteToken || !boardId) return;

    if (!isFirebaseConfigured || !getCurrentUser()) {
        handleLocalInviteLink(inviteToken, boardId);
        return;
    }

    try {
        const identity = resolveJoinIdentity();

        const doc = await db.collection('boards').doc(boardId).get();
        if (!doc.exists) {
            showToast('Board not found', 'error');
            return;
        }

        const board = doc.data();
        if (board.inviteToken !== inviteToken) {
            showToast('Invalid or expired invite link', 'error');
            return;
        }

        let project = null;
        if (board.projectId) {
            const pDoc = await db.collection('projects').doc(board.projectId).get();
            if (pDoc.exists) project = pDoc.data();
        }

        if (isAlreadyProjectMember(project, identity)) {
            showToast('You are already a member of this project', 'warning');
            finishInviteJoin(boardId, board.projectId);
            return;
        }

        let joinedAny = false;

        if (addMemberToEntity(board, identity) === 'added') {
            joinedAny = true;
            await db.collection('boards').doc(board.id).set(board, { merge: true });
        }

        if (project) {
            if (addMemberToEntity(project, identity) === 'added') {
                joinedAny = true;
                await db.collection('projects').doc(project.id).set(project, { merge: true });
            }

            const boardsSnap = await db.collection('boards').where('projectId', '==', board.projectId).get();
            const batch = db.batch();
            boardsSnap.forEach(bDoc => {
                if (bDoc.id === board.id) return;
                const bData = bDoc.data();
                if (addMemberToEntity(bData, identity) === 'added') {
                    joinedAny = true;
                    batch.set(bDoc.ref, bData, { merge: true });
                }
            });
            await batch.commit();
        }

        if (joinedAny) {
            await saveState();
            finishInviteJoin(boardId, board.projectId);
            return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
        console.error('Error joining:', error);
        showToast('Failed to join project', 'error');
    }
};

window.addEventListener('checkInviteLink', handleInviteLink);

// ================================
// PROJECT INFO MODAL
// ================================
const projectInfoModal = document.getElementById('projectInfoModal');

const renderMemberRoleBadge = (role) => {
    if (role === TEAM_ROLES.OWNER) return '<span class="role-badge owner">owner</span>';
    if (role === TEAM_ROLES.ADMIN) return '<span class="role-badge admin">admin</span>';
    return '<span class="role-badge member">member</span>';
};

const getCurrentActorEmail = () => {
    const user = getCurrentUser();
    if (user?.email) return user.email.toLowerCase();
    const raw = localStorage.getItem('flowboard-guest-identity');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.email) return parsed.email.toLowerCase();
        } catch { /* ignore */ }
    }
    const project = getActiveProject();
    return project?.owner?.email?.toLowerCase() || null;
};

const canManageProjectTeam = (project) => {
    if (!project) return false;
    const email = getCurrentActorEmail();
    if (!email) return true;
    if (project.owner?.email?.toLowerCase() === email) return true;
    const member = (project.members || []).find(m => m.email?.toLowerCase() === email);
    return member?.role === TEAM_ROLES.ADMIN;
};

const canRemoveTeamMember = (project, member) => {
    if (!project || !member || member.role === TEAM_ROLES.OWNER) return false;
    return canManageProjectTeam(project);
};

const clearAssigneeFromProjectCards = (project, memberId) => {
    const boardIds = new Set([
        ...(project.sprintIds || []),
        ...state.boards.filter(b => b.projectId === project.id).map(b => b.id),
    ]);
    for (const boardId of boardIds) {
        const board = state.boards.find(b => b.id === boardId);
        if (!board) continue;
        for (const list of board.lists || []) {
            for (const card of list.cards || []) {
                if (card.assigneeId === memberId) card.assigneeId = null;
            }
        }
    }
};

const persistProjectTeam = async (project) => {
    if (!project?.id) return;
    try {
        await updateProject(project.id, { members: project.members || [] });
    } catch (error) {
        console.error('Error saving project team:', error);
        showToast('Failed to save team changes', 'error');
        throw error;
    }
};

export const openProjectInfoModal = () => {
    const board = getCurrentBoard();
    const project = getActiveProject();
    if (!board || !projectInfoModal) return;

    document.getElementById('projectColorPreview').style.background = board.background;
    document.getElementById('projectName').textContent = project?.name || board.name;

    const listCount = board.lists?.length || 0;
    const cardCount = board.lists?.reduce((sum, list) => sum + (list.cards?.length || 0), 0) || 0;
    document.getElementById('projectStats').textContent = `${listCount} list${listCount !== 1 ? 's' : ''} • ${cardCount} card${cardCount !== 1 ? 's' : ''}`;

    const owner = project?.owner || board.owner || { name: 'You', email: 'you@example.com' };
    const ownerAvatarEl = document.getElementById('projectOwnerAvatar');
    const ownerNameEl = document.getElementById('projectOwnerName');

    if (owner.photoURL) {
        ownerAvatarEl.innerHTML = `<img src="${esc(owner.photoURL)}" alt="${esc(owner.name)}">`;
    } else {
        ownerAvatarEl.textContent = (owner.name || 'U').charAt(0).toUpperCase();
    }
    ownerNameEl.textContent = owner.name || 'Owner';

    renderTeamMembers(project);
    updateInviteLinkInput();
    const regenBtn = document.getElementById('regenerateLinkBtn');
    if (regenBtn) regenBtn.style.display = canManageProjectTeam(project) ? '' : 'none';
    projectInfoModal.classList.add('active');
};

const renderTeamMembers = (project) => {
    if (!project) return;

    const allMembers = getProjectTeamMembers(project);
    const list = document.getElementById('teamMembersList');
    const count = document.getElementById('teamCount');
    const canManage = canManageProjectTeam(project);
    if (count) count.textContent = String(allMembers.length);

    if (!allMembers.length) {
        list.innerHTML = '<div class="team-empty-state"><p>No team members yet.</p></div>';
        return;
    }

    list.innerHTML = allMembers.map(m => `
        <div class="team-member-item" data-id="${esc(m.id)}">
             <div class="member-avatar">${m.photoURL ? `<img src="${esc(m.photoURL)}" alt="${esc(m.name || 'U')}">` : esc((m.name || m.email || 'U').charAt(0).toUpperCase())}</div>
             <div class="member-info">
                 <div class="member-name">${esc(m.name || 'User')} ${renderMemberRoleBadge(m.role)}</div>
                 <div class="member-email">${esc(m.email || '')}</div>
             </div>
             ${canRemoveTeamMember(project, m) ? `
             <button class="member-action-btn danger remove-member-btn" data-id="${esc(m.id)}" title="Remove member">
                 <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
             </button>` : ''}
        </div>
    `).join('');

    list.querySelectorAll('.remove-member-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const mid = btn.dataset.id;
            const member = (project.members || []).find(m => m.id === mid);
            if (!member || !confirm(`Remove ${member.name || member.email} from the project?`)) return;
            project.members = (project.members || []).filter(m => m.id !== mid);
            clearAssigneeFromProjectCards(project, mid);
            try {
                await persistProjectTeam(project);
                renderTeamMembers(project);
                renderBoard();
                showToast('Member removed', 'success');
            } catch {
                project.members.push(member);
            }
        });
    });
};

const updateInviteLinkInput = () => {
    const board = getCurrentBoard();
    if (!board) return;
    const token = getOrCreateInviteToken();
    const input = document.getElementById('inviteLinkInput');
    if (input && token) {
        input.value = `${window.location.origin}${window.location.pathname}?invite=${token}&board=${board.id}`;
    }
};

// Listeners for Project Info Modal
document.getElementById('projectInfoBtn')?.addEventListener('click', openProjectInfoModal);
document.getElementById('closeProjectInfoModal')?.addEventListener('click', () => projectInfoModal.classList.remove('active'));
document.getElementById('closeProjectInfoBtn')?.addEventListener('click', () => projectInfoModal.classList.remove('active'));

document.getElementById('copyInviteLinkBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('inviteLinkInput');
    try {
        await navigator.clipboard.writeText(input.value);
        showToast('Copied!', 'success');
    } catch (e) {
        input.select();
        document.execCommand('copy');
        showToast('Copied!', 'success');
    }
});

document.getElementById('regenerateLinkBtn')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    const project = getActiveProject();
    if (!board || !canManageProjectTeam(project)) {
        showToast('Only owners and admins can regenerate invite links', 'warning');
        return;
    }
    if (confirm('Regenerate link? Old one will fail.')) {
        board.inviteToken = generateInviteToken();
        saveState();
        updateInviteLinkInput();
        showToast('New link generated', 'success');
    }
});


// ================================
// PROJECT MANAGEMENT SCREEN
// ================================
const projectManagementScreen = document.getElementById('projectManagementScreen');
const boardContainer = document.getElementById('boardContainer');
const manageProjectsBtn = document.getElementById('manageProjectsBtn');
const pmSidebar = document.getElementById('pmSidebar');
const pmSidebarBackdrop = document.getElementById('pmSidebarBackdrop');

const isMobileLayout = () => window.matchMedia('(max-width: 768px)').matches;

export const closePmSidebar = () => {
    pmSidebar?.classList.remove('open');
    pmSidebarBackdrop?.classList.remove('active');
    pmSidebarBackdrop?.setAttribute('aria-hidden', 'true');
};

const openPmSidebar = () => {
    pmSidebar?.classList.add('open');
    pmSidebarBackdrop?.classList.add('active');
    pmSidebarBackdrop?.setAttribute('aria-hidden', 'false');
};

document.getElementById('pmSidebarToggle')?.addEventListener('click', openPmSidebar);
pmSidebarBackdrop?.addEventListener('click', closePmSidebar);

document.getElementById('pmBackToBoardBtn')?.addEventListener('click', () => {
    if (projectManagementScreen && !projectManagementScreen.classList.contains('hidden')) {
        manageProjectsBtn?.click();
    }
});

if (manageProjectsBtn) {
    manageProjectsBtn.addEventListener('click', () => {
        const isHidden = projectManagementScreen.classList.contains('hidden');
        if (isHidden) {
            projectManagementScreen.classList.remove('hidden');
            boardContainer.classList.add('hidden');
            manageProjectsBtn.classList.add('active');
            updateBurndownPanelVisibility(getCurrentBoard());
            renderProjectManagement();
        } else {
            projectManagementScreen.classList.add('hidden');
            boardContainer.classList.remove('hidden');
            manageProjectsBtn.classList.remove('active');
            closePmSidebar();
            renderBoard();
        }
    });
}

// Escape HTML helper for project.js
const esc = (str) => { const d = document.createElement('div'); d.textContent = str == null ? '' : String(str); return d.innerHTML; };

const formatBacklogDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getBacklogItemDate = (item) => item.addedAt || item.createdAt || '';

const persistProjectBacklog = async (project) => {
    if (!project?.id) return;
    try {
        await updateProject(project.id, { backlog: project.backlog || [] });
    } catch (error) {
        console.error('Error saving backlog:', error);
        showToast('Failed to save backlog', 'error');
        throw error;
    }
};

// --------------------------------
// Backlog item → sprint (sprint picker logic)
// --------------------------------
let _pendingBacklogTaskId = null;

const findCardListInSprint = (sprint, cardId) => {
    if (!sprint?.lists || !cardId) return null;
    for (const list of sprint.lists) {
        if ((list.cards || []).some(c => c.id === cardId)) return list;
    }
    return null;
};

const createCardFromBacklogItem = (task, taskId) => ({
    id: generateId(),
    title: task.title,
    description: task.description || '',
    labels: [],
    checklist: [],
    comments: [],
    remainingHoursLog: [],
    spentHoursLog: [],
    attachments: [],
    initialEstimate: 0,
    assigneeId: null,
    linkedStoryId: (task.type === 'task' && task.linkedStoryId) ? task.linkedStoryId : null,
    linkedTaskId: taskId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
});

export const unlinkBacklogFromCard = async (card, board) => {
    if (!card?.linkedTaskId || !board?.projectId) return;
    const project = state.projects.find(p => p.id === board.projectId);
    if (!project) return;
    const task = (project.backlog || []).find(t => t.id === card.linkedTaskId);
    if (!task || task.status !== 'in-sprint') return;
    task.status = 'open';
    delete task.sprintId;
    delete task.cardId;
    await updateProject(project.id, { backlog: project.backlog });
};

const moveBacklogItemToSprint = async (project, taskId, targetSprintId) => {
    const taskIdx = project.backlog.findIndex(t => t.id === taskId);
    if (taskIdx === -1) return;
    const task = project.backlog[taskIdx];
    if (task.status === 'in-sprint') {
        showToast('Already in a sprint. Remove it first to reassign.', 'warning');
        return;
    }
    const sprint = state.boards.find(b => b.id === targetSprintId);
    if (!sprint) { showToast('Sprint not found', 'error'); return; }
    if (sprint.projectId && sprint.projectId !== project.id) {
        showToast('Sprint does not belong to this project', 'error');
        return;
    }
    if (!sprint.lists.length) sprint.lists.push({ id: generateId(), title: 'To Do', cards: [] });
    const newCard = createCardFromBacklogItem(task, taskId);
    sprint.lists[0].cards.push(newCard);
    task.status = 'in-sprint';
    task.sprintId = sprint.id;
    task.cardId = newCard.id;
    await persistProjectBacklog(project);
    renderBacklog(project);
    if (state.currentBoardId === sprint.id) renderBoard();
    showToast(`Added to "${sprint.name}"`, 'success');
};

const removeBacklogItemFromSprint = async (project, taskId) => {
    const task = (project.backlog || []).find(t => t.id === taskId);
    if (!task || task.status !== 'in-sprint') return;

    const sprintId = task.sprintId;
    const sprint = state.boards.find(b => b.id === sprintId);

    if (sprint && task.cardId) {
        const list = findCardListInSprint(sprint, task.cardId);
        if (list) {
            try {
                await deleteCard(sprint.id, list.id, task.cardId);
                list.cards = (list.cards || []).filter(c => c.id !== task.cardId);
            } catch (error) {
                console.error('Error removing sprint card:', error);
                showToast('Failed to remove card from sprint', 'error');
                return;
            }
        }
    }

    task.status = 'open';
    delete task.sprintId;
    delete task.cardId;
    await persistProjectBacklog(project);
    renderBacklog(project);
    if (state.currentBoardId === sprintId) renderBoard();
    showToast('Removed from sprint (still in backlog)', 'success');
};

// Sprint picker modal listeners
document.getElementById('closeSprintPickerModal')?.addEventListener('click', () => {
    document.getElementById('sprintPickerModal').classList.remove('active');
    _pendingBacklogTaskId = null;
});

document.getElementById('sprintPickerModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'sprintPickerModal') {
        document.getElementById('sprintPickerModal').classList.remove('active');
        _pendingBacklogTaskId = null;
    }
});

// --------------------------------
// renderProjectManagement + renderProjectDetails
// --------------------------------
export const renderProjectManagement = () => {
    const listEl = document.getElementById('pmProjectList');
    if (!listEl) return;

    listEl.innerHTML = state.projects.map(p => `
        <li class="pm-project-item ${p.id === state.currentProjectId ? 'active' : ''}" data-id="${p.id}">
            <span class="project-name">${esc(p.name)}</span>
        </li>
    `).join('');

    if (!state.projects.length) {
        listEl.innerHTML = '<li style="padding:0.75rem;color:var(--text-tertiary);font-size:0.875rem">No projects yet</li>';
    }

    listEl.querySelectorAll('.pm-project-item').forEach(item => {
        item.addEventListener('click', () => {
            state.currentProjectId = item.dataset.id;
            const boards = state.boards.filter(b => b.projectId === state.currentProjectId);
            state.currentBoardId = boards.length ? boards[0].id : null;
            saveState();
            renderProjectManagement();
            renderBoard();
            if (isMobileLayout()) closePmSidebar();
        });
    });

    if (state.currentProjectId) renderProjectDetails();
    else {
        document.getElementById('pmNoProjectSelected')?.classList.remove('hidden');
        document.getElementById('pmProjectDetails')?.classList.add('hidden');
    }
};

const isProjectOwner = (project) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        // Fallback: check if owner id matches the 'You' placeholder used in local/sample data
        return project.owner?.email === 'you@example.com' || !project.owner;
    }
    return project.owner?.email === currentUser.email || project.owner?.id === currentUser.uid;
};

const renderProjectDetails = () => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;

    document.getElementById('pmNoProjectSelected')?.classList.add('hidden');
    document.getElementById('pmProjectDetails')?.classList.remove('hidden');
    document.getElementById('pmProjectName').textContent = project.name;
    const descEl = document.getElementById('pmProjectDesc');
    if (descEl) descEl.textContent = project.description || '';

    // Ensure edit form and delete confirm are hidden
    document.getElementById('pmEditProjectForm')?.classList.add('hidden');
    document.getElementById('editProjectBtn')?.classList.remove('hidden');
    document.getElementById('pmDeleteConfirm')?.classList.add('hidden');

    // Show delete button only for owner
    const deleteBtn = document.getElementById('deleteProjectBtn');
    if (deleteBtn) {
        if (isProjectOwner(project)) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }
    }

    const activeTab = document.querySelector('.pm-tab.active')?.dataset.tab || 'backlog';
    renderProjectTab(activeTab);
};

// Tabs
document.querySelectorAll('.pm-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.pm-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pm-tab-pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        const pane = document.getElementById(`pmTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        if (pane) pane.classList.add('active');
        renderProjectTab(tabName);
    });
});

const renderProjectTab = (tabName) => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;
    if (tabName === 'sprints') renderSprints(project);
    else if (tabName === 'backlog') renderBacklog(project);
    else if (tabName === 'team') renderTeam(project);
    else if (tabName === 'labels') renderLabels(project);
};

const persistProjectLabels = async (project) => {
    if (!project?.id) return;
    try {
        await updateProject(project.id, { labels: project.labels || [] });
    } catch (error) {
        console.error('Error saving labels:', error);
        showToast('Failed to save labels', 'error');
        throw error;
    }
};

const renderLabels = (project) => {
    const listEl = document.getElementById('pmLabelsList');
    if (!listEl) return;

    if (!project.labels?.length) {
        project.labels = DEFAULT_PROJECT_LABELS.map(l => ({ ...l }));
    }

    const canManage = canManageProjectTeam(project);
    listEl.innerHTML = getProjectLabels(project).map(label => `
        <div class="pm-label-item" data-id="${esc(label.id)}">
            <div class="pm-label-view">
                <span class="pm-label-swatch" style="background:${esc(label.color)}" title="${esc(label.name)}"></span>
                <span class="pm-label-name">${esc(label.name)}</span>
                <span class="pm-label-id">${esc(label.id)}</span>
                ${canManage ? `
                    <button type="button" class="btn btn-sm btn-secondary pm-label-edit" data-id="${esc(label.id)}" title="Edit label">Edit</button>
                    <button type="button" class="btn btn-sm btn-secondary pm-label-delete" data-id="${esc(label.id)}" title="Delete label">Delete</button>
                ` : ''}
            </div>
            <div class="pm-label-edit-form hidden">
                <input type="text" class="pm-label-edit-name" value="${esc(label.name)}" maxlength="40" aria-label="Label name">
                <input type="color" class="pm-label-edit-color" value="${esc(label.color)}" aria-label="Label color">
                <button type="button" class="btn btn-sm btn-primary pm-label-save-edit">Save</button>
                <button type="button" class="btn btn-sm btn-secondary pm-label-cancel-edit">Cancel</button>
            </div>
        </div>
    `).join('') || '<div class="pm-empty-hint">No labels configured.</div>';

    listEl.querySelectorAll('.pm-label-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.pm-label-item');
            if (!item) return;
            item.querySelector('.pm-label-view')?.classList.add('hidden');
            item.querySelector('.pm-label-edit-form')?.classList.remove('hidden');
            item.querySelector('.pm-label-edit-name')?.focus();
        });
    });

    listEl.querySelectorAll('.pm-label-cancel-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.pm-label-item');
            if (!item) return;
            const labelId = item.dataset.id;
            const label = project.labels.find(l => l.id === labelId);
            if (label) {
                item.querySelector('.pm-label-edit-name').value = label.name;
                item.querySelector('.pm-label-edit-color').value = label.color;
            }
            item.querySelector('.pm-label-edit-form')?.classList.add('hidden');
            item.querySelector('.pm-label-view')?.classList.remove('hidden');
        });
    });

    listEl.querySelectorAll('.pm-label-save-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
            const item = btn.closest('.pm-label-item');
            if (!item) return;
            const labelId = item.dataset.id;
            const label = project.labels.find(l => l.id === labelId);
            if (!label) return;

            const name = item.querySelector('.pm-label-edit-name')?.value.trim();
            const color = item.querySelector('.pm-label-edit-color')?.value || label.color;
            if (!name) {
                showToast('Enter a label name', 'error');
                return;
            }

            const prev = { name: label.name, color: label.color };
            label.name = name;
            label.color = color;
            try {
                await persistProjectLabels(project);
                renderLabels(project);
                showToast('Label updated', 'success');
            } catch {
                label.name = prev.name;
                label.color = prev.color;
            }
        });
    });

    listEl.querySelectorAll('.pm-label-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const labelId = btn.dataset.id;
            const label = project.labels.find(l => l.id === labelId);
            if (!label || !confirm(`Delete label "${label.name}"?`)) return;
            project.labels = project.labels.filter(l => l.id !== labelId);
            try {
                await persistProjectLabels(project);
                renderLabels(project);
                showToast('Label deleted', 'success');
            } catch {
                project.labels.push(label);
            }
        });
    });
};

document.getElementById('pmAddLabelBtn')?.addEventListener('click', () => {
    document.getElementById('pmAddLabelForm')?.classList.remove('hidden');
    document.getElementById('pmLabelNameInput')?.focus();
});

document.getElementById('pmCancelLabelBtn')?.addEventListener('click', () => {
    document.getElementById('pmAddLabelForm')?.classList.add('hidden');
    document.getElementById('pmLabelNameInput').value = '';
});

document.getElementById('pmSaveLabelBtn')?.addEventListener('click', async () => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;
    if (!canManageProjectTeam(project)) {
        showToast('Only owners and admins can manage labels', 'warning');
        return;
    }
    const name = document.getElementById('pmLabelNameInput')?.value.trim();
    const color = document.getElementById('pmLabelColorInput')?.value || '#6366f1';
    if (!name) {
        showToast('Enter a label name', 'error');
        return;
    }
    if (!project.labels) project.labels = [];
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || generateId();
    if (project.labels.some(l => l.id === id)) {
        showToast('A label with that id already exists', 'warning');
        return;
    }
    project.labels.push({ id, name, color });
    try {
        await persistProjectLabels(project);
        renderLabels(project);
        document.getElementById('pmAddLabelForm')?.classList.add('hidden');
        document.getElementById('pmLabelNameInput').value = '';
        showToast('Label added', 'success');
    } catch {
        project.labels.pop();
    }
});

// --------------------------------
// Sprints tab
// --------------------------------
const renderSprints = (project) => {
    const listEl = document.getElementById('pmSprintList');
    if (!listEl) return;
    const sprints = state.boards.filter(b => b.projectId === project.id);

    if (!sprints.length) {
        listEl.innerHTML = '<div class="pm-empty-hint">No sprints yet. Create one with the button above.</div>';
        return;
    }

    const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    listEl.innerHTML = sprints.map(s => {
        const cardCount = (s.lists || []).reduce((acc, l) => acc + (l.cards || []).length, 0);
        const isActive = s.id === state.currentBoardId;
        const duration = formatSprintDuration(s.startDate, s.endDate);
        const durationSuffix = duration ? ` · ${duration}` : '';
        const dates = (s.startDate || s.endDate)
            ? `<div class="pm-sprint-dates">${fmt(s.startDate)}${s.endDate ? ' – ' + fmt(s.endDate) : ''}${durationSuffix}</div>`
            : '';
        const goal = s.goal ? `<div class="pm-sprint-goal">${esc(s.goal)}</div>` : '';
        return `
            <div class="pm-sprint-item ${isActive ? 'active-sprint' : ''}" data-id="${s.id}" style="cursor:pointer">
                <div class="pm-sprint-color-strip" style="background:${s.background || 'var(--accent-primary)'}"></div>
                <div class="pm-sprint-info">
                    <div class="pm-sprint-title">${esc(s.name)}${isActive ? ' <span class="badge-active">active</span>' : ''}</div>
                    ${goal}
                    ${dates}
                    <div class="pm-sprint-stats">${cardCount} card${cardCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="pm-sprint-actions">
                    <button class="btn btn-sm btn-secondary edit-sprint-btn" data-id="${s.id}" title="Edit sprint">Edit</button>
                </div>
            </div>
        `;
    }).join('');

    listEl.querySelectorAll('.pm-sprint-item').forEach(el => {
        // Click on item body (not edit btn) → switch to that sprint
        el.addEventListener('click', (e) => {
            if (e.target.closest('.edit-sprint-btn')) return;
            state.currentBoardId = el.dataset.id;
            saveState();
            renderBoard();
            projectManagementScreen.classList.add('hidden');
            boardContainer.classList.remove('hidden');
            manageProjectsBtn?.classList.remove('active');
            updateBurndownPanelVisibility(getCurrentBoard());
        });
    });

    listEl.querySelectorAll('.edit-sprint-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sprint = state.boards.find(b => b.id === btn.dataset.id);
            if (!sprint) return;
            document.getElementById('sprintEditName').value = sprint.name || '';
            document.getElementById('sprintEditGoal').value = sprint.goal || '';
            document.getElementById('sprintEditStart').value = sprint.startDate || '';
            document.getElementById('sprintEditEnd').value = sprint.endDate || '';
            const duration = formatSprintDuration(sprint.startDate, sprint.endDate);
            const hint = document.getElementById('sprintEditDuration');
            if (hint) hint.textContent = duration ? `Sprint duration: ${duration}` : '';
            const modal = document.getElementById('sprintEditModal');
            if (modal) { modal.dataset.sprintId = sprint.id; modal.classList.add('active'); }
        });
    });
};

// Sprint edit save is handled in app.js (with Firestore persistence)

document.getElementById('cancelSprintEditBtn')?.addEventListener('click', () => {
    document.getElementById('sprintEditModal')?.classList.remove('active');
});
document.getElementById('closeSprintEditModal')?.addEventListener('click', () => {
    document.getElementById('sprintEditModal')?.classList.remove('active');
});

// Create sprint from PM screen
document.getElementById('pmCreateSprintBtn')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('openBoardModal', { detail: { projectId: state.currentProjectId } }));
    // After board modal closes, re-render sprints (handled by save button toast chain)
});

// --------------------------------
// Backlog tab — story/task hierarchy
// --------------------------------

const addTaskToStory = (project, storyId, input) => {
    const val = input.value.trim();
    if (!val) return;
    if (!project.backlog) project.backlog = [];
    project.backlog.push({
        id: generateId(),
        type: 'task',
        title: val,
        linkedStoryId: storyId,
        status: 'open',
        addedAt: new Date().toISOString()
    });
    persistProjectBacklog(project);
    renderBacklog(project);
};

const openSprintPickerFor = (project, taskId) => {
    const task = (project.backlog || []).find(t => t.id === taskId);
    if (task?.status === 'in-sprint') {
        showToast('Already in a sprint. Remove it first to reassign.', 'warning');
        return;
    }
    const sprints = state.boards.filter(b => b.projectId === project.id);
    if (!sprints.length) { showToast('No sprints. Create a sprint first.', 'warning'); return; }
    if (sprints.length === 1) {
        moveBacklogItemToSprint(project, taskId, sprints[0].id);
        return;
    }
    _pendingBacklogTaskId = taskId;
    const pickerList = document.getElementById('sprintPickerList');
    if (pickerList) {
        pickerList.innerHTML = sprints.map(s => `
            <button class="sprint-picker-item" data-sprint-id="${s.id}">
                <div class="sprint-picker-color" style="background:${s.background || 'var(--accent-primary)'}"></div>
                <span>${esc(s.name)}</span>
            </button>
        `).join('');
        pickerList.querySelectorAll('.sprint-picker-item').forEach(item => {
            item.addEventListener('click', () => {
                moveBacklogItemToSprint(project, _pendingBacklogTaskId, item.dataset.sprintId);
                document.getElementById('sprintPickerModal').classList.remove('active');
                _pendingBacklogTaskId = null;
            });
        });
    }
    document.getElementById('sprintPickerModal').classList.add('active');
};

const renderBacklog = (project) => {
    const listEl = document.getElementById('backlogList');
    if (!listEl) return;
    const items = project.backlog || [];

    const stories = items
        .filter(i => i.type === 'story')
        .sort((a, b) => new Date(getBacklogItemDate(b)) - new Date(getBacklogItemDate(a)));
    const tasks = items.filter(i => i.type === 'task');
    const legacyItems = items.filter(i => !i.type);

    const tasksByStory = {};
    const orphanTasks = [...legacyItems];
    tasks.forEach(task => {
        if (task.linkedStoryId) {
            if (!tasksByStory[task.linkedStoryId]) tasksByStory[task.linkedStoryId] = [];
            tasksByStory[task.linkedStoryId].push(task);
        } else {
            orphanTasks.push(task);
        }
    });

    if (!stories.length && !orphanTasks.length) {
        listEl.innerHTML = '<div class="pm-empty-hint">No backlog items. Add a story above.</div>';
        return;
    }

    const renderTaskHtml = (task) => {
        const sprint = task.sprintId ? state.boards.find(b => b.id === task.sprintId) : null;
        const inSprint = task.status === 'in-sprint';
        const badge = sprint
            ? `<span class="backlog-sprint-badge" title="In sprint: ${esc(sprint.name)}">In ${esc(sprint.name)}</span>`
            : '';
        const dateStr = formatBacklogDate(getBacklogItemDate(task));
        const dateHtml = dateStr ? `<span class="backlog-date" title="Created ${esc(dateStr)}">${esc(dateStr)}</span>` : '';
        const sprintActionBtn = inSprint
            ? `<button class="btn-icon remove-sprint-btn" data-id="${esc(task.id)}" title="Remove from sprint (keeps in backlog)">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M9 14l-4-4M5 10l4-4M5 10h11a4 4 0 014 4v0a4 4 0 01-4 4H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </button>`
            : `<button class="btn-icon move-sprint-btn" data-id="${esc(task.id)}" title="Add to Sprint">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </button>`;
        return `
        <div class="backlog-task ${inSprint ? 'in-sprint' : ''}" data-id="${esc(task.id)}">
            <span class="task-icon">
                <svg viewBox="0 0 24 24" fill="none" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <div class="task-title-wrap">
                <span class="task-title">${esc(task.title)}</span>
                <input type="text" class="form-input task-title-edit-input hidden" value="${esc(task.title)}">
                ${dateHtml}
                ${badge}
            </div>
            <div class="task-actions">
                ${sprintActionBtn}
                <button class="btn-icon danger delete-task-btn" data-id="${esc(task.id)}" title="Delete Task">
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
            </div>
        </div>`;
    };

    const renderStoryHtml = (story, storyTasks) => {
        const total = storyTasks.length;
        const done = storyTasks.filter(t => t.status === 'in-sprint').length;
        const allDone = total > 0 && done === total;
        const isCollapsed = !!story.collapsed;
        const progressText = total > 0
            ? `${done}/${total} in sprint`
            : 'No tasks yet';
        const storyDate = formatBacklogDate(getBacklogItemDate(story));
        const storyDateHtml = storyDate ? `<span class="backlog-date" title="Created ${esc(storyDate)}">${esc(storyDate)}</span>` : '';
        return `
        <div class="story-group" data-id="${esc(story.id)}">
            <div class="story-header">
                <button class="story-collapse-btn ${isCollapsed ? 'collapsed' : ''}" data-id="${esc(story.id)}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
                <span class="story-type-icon">
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="10 9 9 9 8 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
                <div class="story-title-wrap">
                    <span class="story-title">${esc(story.title)}</span>
                    <input type="text" class="form-input story-title-edit-input hidden" value="${esc(story.title)}">
                    ${storyDateHtml}
                </div>
                <span class="story-progress ${allDone ? 'all-done' : ''}">${progressText}</span>
                <div class="story-actions">
                    <button class="btn-icon danger delete-story-btn" data-id="${esc(story.id)}" title="Delete Story">
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
            <div class="story-tasks ${isCollapsed ? 'collapsed' : ''}">
                ${storyTasks.map(renderTaskHtml).join('')}
                <div class="story-add-task-row">
                    <input type="text" class="story-add-task-input" placeholder="Add a task..." data-story-id="${esc(story.id)}">
                    <button class="btn btn-sm btn-secondary story-add-task-btn" data-story-id="${esc(story.id)}">+ Task</button>
                </div>
            </div>
        </div>`;
    };

    let html = stories.map(story => renderStoryHtml(story, tasksByStory[story.id] || [])).join('');

    if (orphanTasks.length) {
        html += `<div class="orphan-tasks-section">
            <div class="orphan-tasks-header">Other items</div>
            ${orphanTasks.map(renderTaskHtml).join('')}
        </div>`;
    }

    listEl.innerHTML = html;

    // Story collapse toggle
    listEl.querySelectorAll('.story-collapse-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const story = (project.backlog || []).find(s => s.id === btn.dataset.id);
            if (story) {
                story.collapsed = !story.collapsed;
                persistProjectBacklog(project);
                renderBacklog(project);
            }
        });
    });

    // Story title inline edit
    listEl.querySelectorAll('.story-title').forEach(span => {
        span.addEventListener('click', () => {
            const input = span.nextElementSibling;
            span.classList.add('hidden');
            input.classList.remove('hidden');
            input.focus();
            input.select();
        });
    });

    listEl.querySelectorAll('.story-title-edit-input').forEach(input => {
        const commit = () => {
            const storyId = input.closest('.story-group')?.dataset.id;
            const newTitle = input.value.trim();
            if (newTitle && storyId) {
                const story = (project.backlog || []).find(s => s.id === storyId);
                if (story) {
                    story.title = newTitle;
                    persistProjectBacklog(project);
                    input.previousElementSibling.textContent = newTitle;
                }
            }
            input.classList.add('hidden');
            input.previousElementSibling.classList.remove('hidden');
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                const story = (project.backlog || []).find(s => s.id === input.closest('.story-group')?.dataset.id);
                if (story) input.value = story.title;
                input.blur();
            }
        });
    });

    // Delete story (and its tasks)
    listEl.querySelectorAll('.delete-story-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const storyId = btn.dataset.id;
            const story = (project.backlog || []).find(s => s.id === storyId);
            if (!story) return;
            const storyTasks = (project.backlog || []).filter(t => t.type === 'task' && t.linkedStoryId === storyId);
            const msg = storyTasks.length
                ? `Delete story "${story.title}" and its ${storyTasks.length} task(s)? This cannot be undone.`
                : `Delete story "${story.title}"?`;
            if (!confirm(msg)) return;
            project.backlog = (project.backlog || []).filter(i => i.id !== storyId && !(i.type === 'task' && i.linkedStoryId === storyId));
            persistProjectBacklog(project);
            renderBacklog(project);
        });
    });

    // Add task to story
    listEl.querySelectorAll('.story-add-task-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            addTaskToStory(project, btn.dataset.storyId, btn.previousElementSibling);
        });
    });

    listEl.querySelectorAll('.story-add-task-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addTaskToStory(project, input.dataset.storyId, input); }
        });
    });

    // Task title inline edit
    listEl.querySelectorAll('.task-title').forEach(span => {
        span.addEventListener('click', () => {
            const input = span.nextElementSibling;
            span.classList.add('hidden');
            input.classList.remove('hidden');
            input.focus();
            input.select();
        });
    });

    listEl.querySelectorAll('.task-title-edit-input').forEach(input => {
        const commit = () => {
            const taskId = input.closest('.backlog-task')?.dataset.id;
            const newTitle = input.value.trim();
            if (newTitle && taskId) {
                const task = (project.backlog || []).find(t => t.id === taskId);
                if (task) {
                    task.title = newTitle;
                    persistProjectBacklog(project);
                    input.previousElementSibling.textContent = newTitle;
                }
            }
            input.classList.add('hidden');
            input.previousElementSibling.classList.remove('hidden');
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') {
                const task = (project.backlog || []).find(t => t.id === input.closest('.backlog-task')?.dataset.id);
                if (task) input.value = task.title;
                input.blur();
            }
        });
    });

    // Delete task
    listEl.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const taskId = btn.dataset.id;
            const task = (project.backlog || []).find(t => t.id === taskId);
            if (!task || !confirm(`Delete task "${task.title}"?`)) return;
            project.backlog = (project.backlog || []).filter(t => t.id !== taskId);
            persistProjectBacklog(project);
            renderBacklog(project);
        });
    });

    // Move task to sprint
    listEl.querySelectorAll('.move-sprint-btn').forEach(btn => {
        btn.addEventListener('click', () => openSprintPickerFor(project, btn.dataset.id));
    });

    // Remove task from sprint (keeps backlog item)
    listEl.querySelectorAll('.remove-sprint-btn').forEach(btn => {
        btn.addEventListener('click', () => removeBacklogItemFromSprint(project, btn.dataset.id));
    });
};

// Add Story to Backlog
const addToBacklog = () => {
    const input = document.getElementById('backlogInput');
    const val = input?.value.trim();
    if (val && state.currentProjectId) {
        const project = state.projects.find(p => p.id === state.currentProjectId);
        if (!project.backlog) project.backlog = [];
        project.backlog.push({ id: generateId(), type: 'story', title: val, status: 'open', addedAt: new Date().toISOString() });
        persistProjectBacklog(project);
        renderBacklog(project);
        input.value = '';
    }
};

document.getElementById('addToBacklogBtn')?.addEventListener('click', addToBacklog);
document.getElementById('backlogInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addToBacklog(); }
});

// --------------------------------
// Team tab
// --------------------------------
const renderTeam = (project) => {
    const listEl = document.getElementById('pmTeamList');
    if (!listEl) return;
    const allMembers = getProjectTeamMembers(project);
    const canManage = canManageProjectTeam(project);
    const countEl = document.getElementById('pmTeamCount');
    if (countEl) countEl.textContent = String(allMembers.length);

    if (!allMembers.length) {
        listEl.innerHTML = '<div class="pm-empty-hint">No team members yet.</div>';
    } else {
        listEl.innerHTML = allMembers.map(m => `
            <div class="pm-team-member" data-id="${esc(m.id)}">
                <div class="pm-team-info">
                    <div class="user-avatar">${m.photoURL ? `<img src="${esc(m.photoURL)}" alt="${esc(m.name || 'U')}">` : esc((m.name || m.email || 'U').charAt(0).toUpperCase())}</div>
                    <div>
                        <div class="member-name">${esc(m.name || 'User')} ${renderMemberRoleBadge(m.role)}</div>
                        <div class="member-email">${esc(m.email || '')}</div>
                    </div>
                </div>
                <div class="pm-member-actions">
                    ${canManage && m.role !== TEAM_ROLES.OWNER ? `
                        <button class="btn btn-sm btn-secondary promote-btn" data-id="${esc(m.id)}" data-role="${esc(m.role)}" title="${m.role === TEAM_ROLES.ADMIN ? 'Demote to member' : 'Promote to admin'}">
                            ${m.role === TEAM_ROLES.ADMIN ? 'Demote' : 'Make Admin'}
                        </button>
                        <button class="btn-icon danger remove-member-btn" data-id="${esc(m.id)}" title="Remove">
                            <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const member = (project.members || []).find(m => m.id === btn.dataset.id);
                if (!member || !confirm(`Remove ${member.name || member.email} from the project?`)) return;
                project.members = (project.members || []).filter(m => m.id !== btn.dataset.id);
                clearAssigneeFromProjectCards(project, member.id);
                try {
                    await persistProjectTeam(project);
                    renderTeam(project);
                    renderBoard();
                    showToast('Member removed', 'success');
                } catch {
                    project.members.push(member);
                }
            });
        });

        listEl.querySelectorAll('.promote-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const member = project.members?.find(m => m.id === btn.dataset.id);
                if (!member) return;
                const prevRole = member.role;
                member.role = member.role === TEAM_ROLES.ADMIN ? TEAM_ROLES.MEMBER : TEAM_ROLES.ADMIN;
                try {
                    await persistProjectTeam(project);
                    renderTeam(project);
                    showToast(`${member.name || member.email} is now ${member.role}`, 'success');
                } catch {
                    member.role = prevRole;
                }
            });
        });
    }

    // Invite link section at bottom of team tab
    const inviteSection = document.getElementById('pmInviteSection');
    if (!inviteSection) return;

    // Get invite link from the first sprint of this project
    const firstSprintId = (project.sprintIds || [])[0];
    const sprint = firstSprintId ? state.boards.find(b => b.id === firstSprintId) : null;
    if (sprint) {
        if (!sprint.inviteToken) {
            sprint.inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            saveState();
        }
        const link = `${window.location.origin}${window.location.pathname}?invite=${sprint.inviteToken}&board=${sprint.id}`;
        inviteSection.innerHTML = `
            <div class="pm-invite-row">
                <input type="text" class="form-input" id="pmInviteLinkInput" value="${esc(link)}" readonly>
                <button class="btn btn-secondary btn-sm" id="pmCopyInviteBtn" title="Copy invite link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    Copy
                </button>
                ${canManageProjectTeam(project) ? '<button class="btn btn-secondary btn-sm" id="pmRegenInviteBtn" title="Generate new link">↺ New</button>' : ''}
            </div>
        `;
        inviteSection.classList.remove('hidden');

        document.getElementById('pmCopyInviteBtn')?.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(link);
            } catch {
                document.getElementById('pmInviteLinkInput')?.select();
                document.execCommand('copy');
            }
            showToast('Invite link copied!', 'success');
        });

        document.getElementById('pmRegenInviteBtn')?.addEventListener('click', () => {
            if (!canManageProjectTeam(project)) {
                showToast('Only owners and admins can regenerate invite links', 'warning');
                return;
            }
            if (confirm('Generate a new invite link? The old one will stop working.')) {
                sprint.inviteToken = generateInviteToken();
                saveState();
                renderTeam(project);
                showToast('New invite link generated', 'success');
            }
        });
    } else {
        inviteSection.classList.add('hidden');
    }
};

// Add Project Member — inline form (no prompt())
document.getElementById('pmAddMemberBtn')?.addEventListener('click', () => {
    const form = document.getElementById('pmAddMemberForm');
    const input = document.getElementById('pmMemberEmailInput');
    form?.classList.remove('hidden');
    input?.focus();
});

document.getElementById('pmCancelMemberBtn')?.addEventListener('click', () => {
    document.getElementById('pmAddMemberForm')?.classList.add('hidden');
    document.getElementById('pmMemberEmailInput').value = '';
});

const doAddMember = () => {
    const input = document.getElementById('pmMemberEmailInput');
    const trimmed = input?.value.trim().toLowerCase();
    if (!trimmed || !state.currentProjectId) return;
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;
    if (!project.members) project.members = [];
    const allEmails = [project.owner?.email, ...(project.members.map(m => m.email))].filter(Boolean);
    if (allEmails.includes(trimmed)) { showToast('Already a member', 'warning'); return; }
    project.members.push({ id: generateId(), email: trimmed, name: trimmed.split('@')[0], role: TEAM_ROLES.MEMBER, addedAt: new Date().toISOString() });
    persistProjectTeam(project).then(() => renderTeam(project));
    document.getElementById('pmAddMemberForm')?.classList.add('hidden');
    input.value = '';
    showToast(`${trimmed} added`, 'success');
};

document.getElementById('pmSaveMemberBtn')?.addEventListener('click', doAddMember);
document.getElementById('pmMemberEmailInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAddMember();
    if (e.key === 'Escape') {
        document.getElementById('pmAddMemberForm')?.classList.add('hidden');
        e.target.value = '';
    }
});

// --------------------------------
// Delete project (owner only)
// --------------------------------
document.getElementById('deleteProjectBtn')?.addEventListener('click', () => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project || !isProjectOwner(project)) return;
    // Show inline confirmation
    document.getElementById('pmDeleteProjectName').textContent = project.name;
    document.getElementById('pmDeleteConfirm').classList.remove('hidden');
    document.getElementById('deleteProjectBtn').classList.add('hidden');
    document.getElementById('editProjectBtn').classList.add('hidden');
});

document.getElementById('pmCancelDeleteBtn')?.addEventListener('click', () => {
    document.getElementById('pmDeleteConfirm').classList.add('hidden');
    document.getElementById('deleteProjectBtn').classList.remove('hidden');
    document.getElementById('editProjectBtn').classList.remove('hidden');
});

document.getElementById('pmConfirmDeleteBtn')?.addEventListener('click', async () => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project || !isProjectOwner(project)) return;

    const projectName = project.name;

    try {
        await deleteProject(project.id);
        renderBoard();
        renderProjectManagement();
        showToast(`"${projectName}" deleted`, 'success');
    } catch (error) {
        console.error('Error deleting project:', error);
        showToast('Failed to delete project', 'error');
    }
});

// --------------------------------
// Edit project name/description (inline)
// --------------------------------
document.getElementById('editProjectBtn')?.addEventListener('click', () => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;
    document.getElementById('pmEditProjectName').value = project.name || '';
    document.getElementById('pmEditProjectDesc').value = project.description || '';
    document.getElementById('pmEditProjectForm').classList.remove('hidden');
    document.getElementById('editProjectBtn').classList.add('hidden');
    document.getElementById('pmEditProjectName').focus();
});

document.getElementById('pmSaveEditProjectBtn')?.addEventListener('click', async () => {
    const project = state.projects.find(p => p.id === state.currentProjectId);
    if (!project) return;
    const name = document.getElementById('pmEditProjectName').value.trim();
    if (!name) { showToast('Project name cannot be empty', 'error'); return; }

    try {
        await updateProject(project.id, {
            name,
            description: document.getElementById('pmEditProjectDesc').value.trim()
        });
        renderProjectManagement();
        showToast('Project updated', 'success');
    } catch (error) {
        console.error('Error updating project:', error);
        showToast('Failed to update project', 'error');
    }
});

document.getElementById('pmCancelEditProjectBtn')?.addEventListener('click', () => {
    document.getElementById('pmEditProjectForm').classList.add('hidden');
    document.getElementById('editProjectBtn').classList.remove('hidden');
});

// --------------------------------
// Add new project (inline form in sidebar)
// --------------------------------
document.getElementById('addProjectBtn')?.addEventListener('click', () => {
    const form = document.getElementById('pmAddProjectForm');
    if (form) {
        form.classList.toggle('hidden');
        if (!form.classList.contains('hidden')) document.getElementById('pmNewProjectName')?.focus();
    }
});

document.getElementById('pmSaveProjectBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('pmNewProjectName')?.value.trim();
    if (!name) { showToast('Enter a project name', 'error'); return; }
    const desc = document.getElementById('pmNewProjectDesc')?.value.trim() || '';

    try {
        await createProject({ name, description: desc });
        state.currentBoardId = null;
        if (document.getElementById('pmNewProjectName')) document.getElementById('pmNewProjectName').value = '';
        if (document.getElementById('pmNewProjectDesc')) document.getElementById('pmNewProjectDesc').value = '';
        document.getElementById('pmAddProjectForm')?.classList.add('hidden');
        renderProjectManagement();
        renderBoard();
        showToast(`Project "${name}" created`, 'success');
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Failed to create project', 'error');
    }
});

document.getElementById('pmCancelProjectBtn')?.addEventListener('click', () => {
    document.getElementById('pmAddProjectForm')?.classList.add('hidden');
});
