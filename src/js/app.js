import { initAuth } from './auth.js';
import { renderBoard } from './board.js';
import { state, saveState, getOrCreateInviteToken, generateInviteToken, getCurrentBoard } from './store.js';
import { showToast, generateUniqueProjectName, generateId } from './utils.js';
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
    document.getElementById('cardRemainingHours').value = card.remainingHours ?? '';

    document.querySelectorAll('#labelPicker .label-option').forEach(btn => {
        btn.classList.toggle('selected', (card.labels || []).includes(btn.dataset.label));
    });

    renderChecklist(card);
    renderAssigneeOptions(card);

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
    const remVal = document.getElementById('cardRemainingHours').value;
    card.remainingHours = remVal === '' ? 0 : Number(remVal) || 0;

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
document.getElementById('createBoardBtn')?.addEventListener('click', () => {
    document.getElementById('boardModal').classList.add('active');
    document.getElementById('boardSelector').classList.remove('active');
});

// Close modals
document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target === el) {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        }
    });
});
