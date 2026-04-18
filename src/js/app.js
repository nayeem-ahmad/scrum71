import { initAuth } from './auth.js';
import { renderBoard } from './board.js';
import { state, saveState, getOrCreateInviteToken, generateInviteToken, getCurrentBoard } from './store.js';
import { showToast, generateUniqueProjectName, generateId, getEffectiveRemainingHours } from './utils.js';
import './project.js'; // Import project logic/listeners

console.log('App initialization...');

// Initialize Auth
initAuth();

// ================================
// EVENT LISTENERS
// ================================

// Project Selector
document.getElementById('projectSelectorBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('projectSelector').classList.toggle('active');
    document.getElementById('boardSelector').classList.remove('active');
    renderHeaderProjectList();
});

document.getElementById('boardSelectorBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('boardSelector').classList.toggle('active');
    document.getElementById('projectSelector').classList.remove('active');
    renderHeaderBoardList();
});

document.addEventListener('click', (e) => {
    const ps = document.getElementById('projectSelector');
    const bs = document.getElementById('boardSelector');
    if (ps && !ps.contains(e.target)) ps.classList.remove('active');
    if (bs && !bs.contains(e.target)) bs.classList.remove('active');
});

const renderHeaderProjectList = () => {
    const list = document.getElementById('projectList');
    if (!list) return;
    list.innerHTML = state.projects.map(p => `
        <button class="board-list-item ${p.id === state.currentProjectId ? 'active' : ''}" data-id="${p.id}">
            <div class="board-color-dot" style="background: var(--accent-primary)"></div>
            <span class="board-item-name">${p.name}</span>
        </button>
    `).join('');

    list.querySelectorAll('.board-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.id !== state.currentProjectId) {
                state.currentProjectId = btn.dataset.id;
                // Switch to first board of project
                const boards = state.boards.filter(b => b.projectId === state.currentProjectId);
                state.currentBoardId = boards.length ? boards[0].id : null;
                saveState();
                renderBoard();
            }
            document.getElementById('projectSelector').classList.remove('active');
        });
    });
};

const renderHeaderBoardList = () => {
    const list = document.getElementById('boardList');
    if (!list) return;
    const boards = state.boards.filter(b => b.projectId === state.currentProjectId);

    if (!boards.length) {
        list.innerHTML = '<div style="padding:1rem">No boards</div>';
        return;
    }

    list.innerHTML = boards.map(b => `
        <button class="board-list-item ${b.id === state.currentBoardId ? 'active' : ''}" data-id="${b.id}">
             <div class="board-color-dot" style="background: ${b.background}"></div>
             <span class="board-item-name">${b.name}</span>
        </button>
    `).join('');

    list.querySelectorAll('.board-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentBoardId = btn.dataset.id;
            saveState();
            renderBoard();
            document.getElementById('boardSelector').classList.remove('active');
        });
    });
};

// Theme Toggle
export const initTheme = () => {
    const saved = localStorage.getItem('flowboard-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
};

document.getElementById('themeToggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('flowboard-theme', isDark ? 'light' : 'dark');
});

// ================================
// CARD MODAL
// ================================
let editingCardContext = null;

const getEditingCard = () => {
    if (!editingCardContext) return null;
    const board = getCurrentBoard();
    if (!board) return null;
    const list = board.lists.find(l => l.id === editingCardContext.listId);
    if (!list) return null;
    return list.cards.find(c => c.id === editingCardContext.cardId);
};

const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
};

const renderChecklist = (card) => {
    const container = document.getElementById('checklist');
    if (!container) return;
    if (!card.checklist) card.checklist = [];

    container.innerHTML = card.checklist.map(item => `
        <div class="checklist-item ${item.completed ? 'completed' : ''}" data-item-id="${item.id}">
            <input type="checkbox" class="checklist-checkbox" ${item.completed ? 'checked' : ''}>
            <span class="checklist-text"></span>
            <button class="checklist-delete" title="Remove">
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.checklist-item').forEach(el => {
        const id = el.dataset.itemId;
        const item = card.checklist.find(i => i.id === id);
        if (!item) return;
        el.querySelector('.checklist-text').textContent = item.text;
        el.querySelector('.checklist-checkbox').addEventListener('change', (e) => {
            item.completed = e.target.checked;
            el.classList.toggle('completed', e.target.checked);
        });
        el.querySelector('.checklist-delete').addEventListener('click', () => {
            card.checklist = card.checklist.filter(i => i.id !== id);
            renderChecklist(card);
        });
    });
};

const renderAssigneeOptions = (card) => {
    const select = document.getElementById('cardAssignee');
    if (!select) return;
    const board = getCurrentBoard();
    const members = [];
    if (board?.owner) members.push(board.owner);
    (board?.members || []).forEach(m => members.push(m));

    select.innerHTML = '<option value="">Unassigned</option>' +
        members.map(m => {
            const label = m.name || m.email || 'Member';
            return `<option value="${escapeHtml(m.id)}">${escapeHtml(label)}</option>`;
        }).join('');

    select.value = card.assigneeId || '';
};

const openCardModal = ({ cardId, listId }) => {
    editingCardContext = { cardId, listId };
    const card = getEditingCard();
    if (!card) {
        editingCardContext = null;
        return;
    }

    document.getElementById('cardTitle').value = card.title || '';
    document.getElementById('cardDescription').value = card.description || '';
    document.getElementById('cardDueDate').value = card.dueDate || '';
    document.getElementById('cardInitialEstimate').value = card.initialEstimate ?? '';

    document.querySelectorAll('#labelPicker .label-option').forEach(btn => {
        btn.classList.toggle('selected', (card.labels || []).includes(btn.dataset.label));
    });

    renderChecklist(card);
    renderAssigneeOptions(card);
    renderRemainingHoursTab(card);

    document.getElementById('cardModal').classList.add('active');
};

const closeCardModal = () => {
    editingCardContext = null;
    document.getElementById('cardModal').classList.remove('active');
};

const saveCardChanges = () => {
    const card = getEditingCard();
    if (!card) return;

    const title = document.getElementById('cardTitle').value.trim();
    if (!title) {
        showToast('Title cannot be empty', 'error');
        document.getElementById('cardTitle').focus();
        return;
    }

    card.title = title;
    card.description = document.getElementById('cardDescription').value;
    card.dueDate = document.getElementById('cardDueDate').value || '';

    const estVal = document.getElementById('cardInitialEstimate').value;
    card.initialEstimate = estVal === '' ? 0 : Number(estVal) || 0;

    card.labels = [...document.querySelectorAll('#labelPicker .label-option.selected')]
        .map(btn => btn.dataset.label);

    const assigneeId = document.getElementById('cardAssignee').value;
    card.assigneeId = assigneeId || null;

    card.updatedAt = new Date().toISOString();

    saveState();
    renderBoard();
    closeCardModal();
    showToast('Card saved', 'success');
};

const duplicateCard = () => {
    const card = getEditingCard();
    if (!card || !editingCardContext) return;
    const board = getCurrentBoard();
    const list = board?.lists.find(l => l.id === editingCardContext.listId);
    if (!list) return;

    const clone = JSON.parse(JSON.stringify(card));
    clone.id = generateId();
    clone.title = `${card.title} (copy)`;
    if (Array.isArray(clone.checklist)) {
        clone.checklist.forEach(item => { item.id = generateId(); });
    }
    clone.createdAt = new Date().toISOString();
    clone.updatedAt = clone.createdAt;

    const idx = list.cards.findIndex(c => c.id === card.id);
    list.cards.splice(idx + 1, 0, clone);

    saveState();
    renderBoard();
    closeCardModal();
    showToast('Card duplicated', 'success');
};

const deleteCard = () => {
    if (!editingCardContext) return;
    if (!confirm('Delete this card? This cannot be undone.')) return;

    const board = getCurrentBoard();
    const list = board?.lists.find(l => l.id === editingCardContext.listId);
    if (!list) return;

    list.cards = list.cards.filter(c => c.id !== editingCardContext.cardId);

    saveState();
    renderBoard();
    closeCardModal();
    showToast('Card deleted', 'success');
};

window.addEventListener('openCardModal', (e) => openCardModal(e.detail));

// ================================
// REMAINING HOURS LOG
// ================================

let cardRemainingChart = null;

const renderTimeSummaryBar = (card) => {
    const est = Number(card.initialEstimate) || 0;
    const rem = getEffectiveRemainingHours(card);
    const totalSpent = (card.spentHoursLog || []).reduce((sum, e) => sum + (Number(e.spentHours) || 0), 0);

    const estEl = document.getElementById('tsSummaryEst');
    const spentEl = document.getElementById('tsSummarySpent');
    const remEl = document.getElementById('tsSummaryRemaining');
    if (estEl) estEl.textContent = est > 0 ? `${est}h` : '—';
    if (spentEl) spentEl.textContent = `${totalSpent}h`;
    if (remEl) remEl.textContent = rem > 0 ? `${rem}h` : '—';
};

const renderRemainingHoursTab = (card) => {
    if (!card.remainingHoursLog) card.remainingHoursLog = [];
    if (!card.spentHoursLog) card.spentHoursLog = [];

    // Always collapse history panel when modal opens
    const panel = document.getElementById('rhHistoryPanel');
    const label = document.getElementById('rhHistoryToggleLabel');
    const toggle = document.getElementById('rhHistoryToggle');
    if (panel) panel.classList.add('hidden');
    if (label) label.textContent = 'Show history';
    if (toggle) toggle.classList.remove('open');

    // Set default timestamps to now
    const now = new Date().toISOString().slice(0, 16);
    const tsInput = document.getElementById('rhNewTimestamp');
    if (tsInput) tsInput.value = now;
    const shTsInput = document.getElementById('shNewTimestamp');
    if (shTsInput) shTsInput.value = now;

    renderTimeSummaryBar(card);
};

document.getElementById('rhHistoryToggle')?.addEventListener('click', () => {
    const card = getEditingCard();
    if (!card) return;
    const panel = document.getElementById('rhHistoryPanel');
    const label = document.getElementById('rhHistoryToggleLabel');
    const toggle = document.getElementById('rhHistoryToggle');
    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        panel.classList.remove('hidden');
        if (label) label.textContent = 'Hide history';
        if (toggle) toggle.classList.add('open');
        renderRhLogList(card);
        renderCardRemainingChart(card);
        renderShLogList(card);
    } else {
        panel.classList.add('hidden');
        if (label) label.textContent = 'Show history';
        if (toggle) toggle.classList.remove('open');
    }
});

const renderRhLogList = (card) => {
    const container = document.getElementById('rhLogList');
    if (!container) return;
    const log = [...(card.remainingHoursLog || [])];
    log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!log.length) {
        container.innerHTML = '<div class="rh-empty">No entries yet. Add a remaining hours update below.</div>';
        return;
    }

    container.innerHTML = log.map(entry => {
        const dt = new Date(entry.timestamp);
        const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        return `
        <div class="rh-entry" data-entry-id="${escapeHtml(entry.id)}">
            <div class="rh-entry-view">
                <span class="rh-entry-hours">${entry.remainingHours} h</span>
                <span class="rh-entry-date">${dateStr} ${timeStr}</span>
                <div class="rh-entry-actions">
                    <button class="rh-edit-btn" title="Edit">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                    <button class="rh-delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
            <div class="rh-entry-edit hidden">
                <input type="number" class="form-input rh-edit-hours" value="${entry.remainingHours}" min="0" step="0.5">
                <input type="datetime-local" class="form-input rh-edit-timestamp" value="${entry.timestamp.slice(0,16)}">
                <div class="rh-edit-actions">
                    <button class="btn btn-sm btn-primary rh-save-edit-btn">Save</button>
                    <button class="btn btn-sm btn-secondary rh-cancel-edit-btn">Cancel</button>
                </div>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.rh-entry').forEach(el => {
        const entryId = el.dataset.entryId;

        el.querySelector('.rh-delete-btn').addEventListener('click', () => {
            card.remainingHoursLog = card.remainingHoursLog.filter(e => e.id !== entryId);
            saveState();
            renderBoard();
            renderRhLogList(card);
            renderCardRemainingChart(card);
        });

        el.querySelector('.rh-edit-btn').addEventListener('click', () => {
            el.querySelector('.rh-entry-view').classList.add('hidden');
            el.querySelector('.rh-entry-edit').classList.remove('hidden');
        });

        el.querySelector('.rh-cancel-edit-btn').addEventListener('click', () => {
            el.querySelector('.rh-entry-view').classList.remove('hidden');
            el.querySelector('.rh-entry-edit').classList.add('hidden');
        });

        el.querySelector('.rh-save-edit-btn').addEventListener('click', () => {
            const newHours = parseFloat(el.querySelector('.rh-edit-hours').value);
            const newTs = el.querySelector('.rh-edit-timestamp').value;
            if (isNaN(newHours) || newHours < 0 || !newTs) {
                showToast('Enter valid hours and timestamp', 'error');
                return;
            }
            const entry = card.remainingHoursLog.find(e => e.id === entryId);
            if (entry) {
                entry.remainingHours = newHours;
                entry.timestamp = new Date(newTs).toISOString();
            }
            saveState();
            renderBoard();
            renderRhLogList(card);
            renderCardRemainingChart(card);
        });
    });
};

const renderCardRemainingChart = (card) => {
    const ctx = document.getElementById('cardRemainingChart');
    if (!ctx) return;
    if (typeof Chart === 'undefined') return;

    if (cardRemainingChart) {
        cardRemainingChart.destroy();
        cardRemainingChart = null;
    }

    const log = [...(card.remainingHoursLog || [])];
    if (!log.length) {
        ctx.style.display = 'none';
        return;
    }
    ctx.style.display = '';

    log.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const labels = log.map(e => {
        const d = new Date(e.timestamp);
        return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    });
    const data = log.map(e => e.remainingHours);

    cardRemainingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Remaining Hours',
                data,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
};

document.getElementById('rhAddEntryBtn')?.addEventListener('click', () => {
    const card = getEditingCard();
    if (!card) return;
    const hoursVal = document.getElementById('rhNewHours').value;
    const tsVal = document.getElementById('rhNewTimestamp').value;
    if (hoursVal === '' || !tsVal) {
        showToast('Enter hours and timestamp', 'error');
        return;
    }
    const hours = parseFloat(hoursVal);
    if (isNaN(hours) || hours < 0) {
        showToast('Enter a valid hours value', 'error');
        return;
    }
    if (!card.remainingHoursLog) card.remainingHoursLog = [];
    card.remainingHoursLog.push({
        id: generateId(),
        remainingHours: hours,
        timestamp: new Date(tsVal).toISOString()
    });
    document.getElementById('rhNewHours').value = '';
    document.getElementById('rhNewTimestamp').value = new Date().toISOString().slice(0, 16);
    saveState();
    renderBoard();
    renderRhLogList(card);
    renderCardRemainingChart(card);
    renderTimeSummaryBar(card);
    showToast('Entry added', 'success');
});

// ================================
// SPENT HOURS LOG
// ================================
const renderShLogList = (card) => {
    const container = document.getElementById('shLogList');
    const header = document.getElementById('shSectionHeader');
    if (!container) return;

    const log = [...(card.spentHoursLog || [])];
    log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (!log.length) {
        if (header) header.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    if (header) header.style.display = 'flex';

    container.innerHTML = log.map(entry => {
        const dt = new Date(entry.timestamp);
        const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const noteHtml = entry.note ? `<span class="rh-entry-note">${escapeHtml(entry.note)}</span>` : '';
        return `
        <div class="rh-entry sh-entry" data-entry-id="${escapeHtml(entry.id)}">
            <div class="rh-entry-view">
                <span class="rh-entry-hours sh-hours">+${entry.spentHours}h</span>
                <span class="rh-entry-date">${dateStr} ${timeStr}</span>
                ${noteHtml}
                <div class="rh-entry-actions">
                    <button class="rh-delete-btn sh-delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.sh-delete-btn').forEach(btn => {
        const entryId = btn.closest('.sh-entry')?.dataset.entryId;
        btn.addEventListener('click', () => {
            card.spentHoursLog = (card.spentHoursLog || []).filter(e => e.id !== entryId);
            saveState();
            renderBoard();
            renderShLogList(card);
            renderTimeSummaryBar(card);
        });
    });
};

document.getElementById('shAddEntryBtn')?.addEventListener('click', () => {
    const card = getEditingCard();
    if (!card) return;
    const hoursVal = document.getElementById('shNewHours').value;
    const tsVal = document.getElementById('shNewTimestamp').value;
    const note = document.getElementById('shNewNote').value.trim();
    if (hoursVal === '' || !tsVal) {
        showToast('Enter hours and timestamp', 'error');
        return;
    }
    const hours = parseFloat(hoursVal);
    if (isNaN(hours) || hours <= 0) {
        showToast('Enter a valid hours value (> 0)', 'error');
        return;
    }
    if (!card.spentHoursLog) card.spentHoursLog = [];
    card.spentHoursLog.push({
        id: generateId(),
        spentHours: hours,
        timestamp: new Date(tsVal).toISOString(),
        note: note || null
    });
    document.getElementById('shNewHours').value = '';
    document.getElementById('shNewNote').value = '';
    document.getElementById('shNewTimestamp').value = new Date().toISOString().slice(0, 16);
    saveState();
    renderBoard();
    renderTimeSummaryBar(card);
    // If history panel open, refresh it
    if (!document.getElementById('rhHistoryPanel')?.classList.contains('hidden')) {
        renderShLogList(card);
    }
    showToast('Time logged!', 'success');
});

document.getElementById('closeCardModal')?.addEventListener('click', closeCardModal);
document.getElementById('cancelCardBtn')?.addEventListener('click', closeCardModal);
document.getElementById('saveCardBtn')?.addEventListener('click', saveCardChanges);
document.getElementById('duplicateCardBtn')?.addEventListener('click', duplicateCard);
document.getElementById('deleteCardBtn')?.addEventListener('click', deleteCard);

document.querySelectorAll('#labelPicker .label-option').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
});

document.getElementById('addChecklistItemBtn')?.addEventListener('click', () => {
    const input = document.getElementById('newChecklistItem');
    const text = input.value.trim();
    if (!text) return;
    const card = getEditingCard();
    if (!card) return;
    if (!card.checklist) card.checklist = [];
    card.checklist.push({ id: generateId(), text, completed: false });
    input.value = '';
    renderChecklist(card);
});

document.getElementById('newChecklistItem')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('addChecklistItemBtn').click();
    }
});

document.getElementById('cardModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'cardModal') closeCardModal();
});

window.addEventListener('newUserNoBoards', () => {
    const modal = document.getElementById('boardModal');
    if (modal) {
        modal.classList.add('active');
        const input = document.getElementById('boardName');
        if (input) input.value = generateUniqueProjectName();
    }
});

// Board Creation
const openBoardModal = (presetProjectId = null) => {
    const today = new Date().toISOString().split('T')[0];
    const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
    const nameInput = document.getElementById('boardName');
    const goalInput = document.getElementById('boardGoal');
    const startInput = document.getElementById('boardStartDate');
    const endInput = document.getElementById('boardEndDate');
    if (nameInput) nameInput.value = '';
    if (goalInput) goalInput.value = '';
    if (startInput) startInput.value = today;
    if (endInput) endInput.value = twoWeeks;
    const modal = document.getElementById('boardModal');
    if (modal) {
        modal.dataset.presetProjectId = presetProjectId || state.currentProjectId || '';
        modal.classList.add('active');
    }
};

document.getElementById('createBoardBtn')?.addEventListener('click', () => {
    openBoardModal();
    document.getElementById('boardSelector').classList.remove('active');
});

window.addEventListener('openBoardModal', (e) => openBoardModal(e.detail?.projectId));

document.getElementById('saveBoardBtn')?.addEventListener('click', () => {
    const name = document.getElementById('boardName')?.value.trim();
    if (!name) { showToast('Enter a board name', 'error'); return; }

    const modal = document.getElementById('boardModal');
    const projectId = modal?.dataset.presetProjectId || state.currentProjectId || null;
    const goal = document.getElementById('boardGoal')?.value.trim() || '';
    const startDate = document.getElementById('boardStartDate')?.value || '';
    const endDate = document.getElementById('boardEndDate')?.value || '';
    const background = document.querySelector('#boardModal .color-option.selected')?.dataset.color
        || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    const user = state.projects.find(p => p.id === projectId)?.owner
        || { id: generateId(), name: 'You', email: 'you@example.com', photoURL: null };

    const board = {
        id: generateId(),
        name,
        background,
        goal,
        startDate,
        endDate,
        projectId,
        owner: user,
        members: [],
        lists: [
            { id: generateId(), title: 'To Do', cards: [] },
            { id: generateId(), title: 'In Progress', cards: [] },
            { id: generateId(), title: 'Done', cards: [] },
        ],
        history: [],
        createdAt: new Date().toISOString(),
    };

    state.boards.push(board);
    state.currentBoardId = board.id;

    // Associate board with project
    if (projectId) {
        const project = state.projects.find(p => p.id === projectId);
        if (project) {
            if (!project.sprintIds) project.sprintIds = [];
            project.sprintIds.push(board.id);
            if (!project.owner) project.owner = user;
            // Ensure board owner is in project members
            const emails = [project.owner?.email, ...(project.members || []).map(m => m.email)].filter(Boolean);
            if (!emails.includes(user.email)) {
                project.members = project.members || [];
                project.members.push({ ...user, role: 'member', addedAt: new Date().toISOString() });
            }
        }
    }

    saveState();
    renderBoard();
    document.getElementById('boardModal').classList.remove('active');
    showToast(`Sprint "${name}" created`, 'success');
});

document.getElementById('cancelBoardBtn')?.addEventListener('click', () => {
    document.getElementById('boardModal').classList.remove('active');
});

// Color picker in board modal
document.querySelectorAll('#boardModal .color-option').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#boardModal .color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
    });
});

// Sprint edit modal (opened from sprint info bar)
document.getElementById('editSprintPropsBtn')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    if (!board) return;
    document.getElementById('sprintEditName').value = board.name || '';
    document.getElementById('sprintEditGoal').value = board.goal || '';
    document.getElementById('sprintEditStart').value = board.startDate || '';
    document.getElementById('sprintEditEnd').value = board.endDate || '';
    document.getElementById('sprintEditModal').classList.add('active');
});

document.getElementById('saveSprintEditBtn')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    if (!board) return;
    board.name = document.getElementById('sprintEditName').value.trim() || board.name;
    board.goal = document.getElementById('sprintEditGoal').value.trim();
    board.startDate = document.getElementById('sprintEditStart').value;
    board.endDate = document.getElementById('sprintEditEnd').value;
    saveState();
    renderBoard();
    document.getElementById('sprintEditModal').classList.remove('active');
    showToast('Sprint updated', 'success');
});

document.getElementById('cancelSprintEditBtn')?.addEventListener('click', () => {
    document.getElementById('sprintEditModal').classList.remove('active');
});

// Close modals
document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target === el) {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
    });
});
