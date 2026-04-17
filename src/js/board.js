import { state, getCurrentBoard, saveState, getOrCreateInviteToken, generateInviteToken, getCurrentUser } from './store.js';
import { generateId, showToast, getDragAfterElement } from './utils.js';

// ================================
// BOARD RENDERING
// ================================
const boardElement = document.getElementById('board');
const currentProjectName = document.getElementById('currentProjectName');
const currentBoardName = document.getElementById('currentBoardName');

export const renderBoard = () => {
    updateSelectorTexts();
    const board = getCurrentBoard();

    if (!boardElement) return;

    if (!board) {
        boardElement.innerHTML = '<div class="empty-state">Select a project and board to get started</div>';
        document.documentElement.style.setProperty('--board-bg', '#f3f4f6');
        return;
    }

    document.documentElement.style.setProperty('--board-bg', board.background);
    boardElement.innerHTML = '';

    board.lists.forEach(list => {
        const listEl = createListElement(list);
        boardElement.appendChild(listEl);
    });

    // Add list button
    const addListEl = document.createElement('div');
    addListEl.className = 'add-list';
    addListEl.innerHTML = `
        <button class="add-list-btn">
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            Add another list
        </button>
        <div class="add-list-form">
            <input type="text" class="add-list-input" placeholder="Enter list title...">
            <div class="add-list-actions">
                <button class="btn btn-primary add-list-save">Add List</button>
                <button class="btn-icon add-list-cancel">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </button>
            </div>
        </div>
    `;

    // Attach listeners for add list...
    const addListBtn = addListEl.querySelector('.add-list-btn');
    const addListForm = addListEl.querySelector('.add-list-form');
    const addListInput = addListEl.querySelector('.add-list-input');
    const saveBtn = addListEl.querySelector('.add-list-save');
    const cancelBtn = addListEl.querySelector('.add-list-cancel');

    addListBtn.addEventListener('click', () => {
        addListBtn.style.display = 'none';
        addListForm.classList.add('active');
        addListInput.focus();
    });

    cancelBtn.addEventListener('click', () => {
        addListBtn.style.display = 'flex';
        addListForm.classList.remove('active');
        addListInput.value = '';
    });

    saveBtn.addEventListener('click', () => {
        const title = addListInput.value.trim();
        if (title) {
            board.lists.push({ id: generateId(), title, cards: [] });
            saveState();
            renderBoard();
            showToast('List added!', 'success');
        }
    });

    addListInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    });

    boardElement.appendChild(addListEl);
    initDragAndDrop();
    updateBurndownChart();
};

export const updateSelectorTexts = () => {
    const currentProject = state.projects.find(p => p.id === state.currentProjectId);
    if (currentProjectName) currentProjectName.textContent = currentProject ? currentProject.name : 'Select Project';

    const currentBoard = getCurrentBoard();
    if (currentBoardName) currentBoardName.textContent = currentBoard ? currentBoard.name : 'Select Board';
};

// ================================
// LIST ELEMENT
// ================================
export const createListElement = (list) => {
    const board = getCurrentBoard();
    const listEl = document.createElement('div');
    listEl.className = 'list';
    listEl.dataset.listId = list.id;

    // Calculate totals
    const totalInitialEstimate = list.cards.reduce((sum, card) => sum + (card.initialEstimate || 0), 0);
    const totalRemainingHours = list.cards.reduce((sum, card) => sum + (card.remainingHours || 0), 0);

    listEl.innerHTML = `
        <div class="list-header">
            <input type="text" class="list-title" value="${list.title}">
            <div class="list-badges">
                <span class="list-hour-badge estimate" title="Total Initial Estimate">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    ${totalInitialEstimate}h
                </span>
                <span class="list-hour-badge remaining" title="Total Remaining Hours">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    ${totalRemainingHours}h
                </span>
                <span class="list-count">${list.cards.length}</span>
            </div>
            <button class="list-menu-btn">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
            </button>
            <div class="list-menu">
                <button class="list-menu-item move-list-left"><svg viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Move Left</button>
                <button class="list-menu-item move-list-right"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Move Right</button>
                <div class="list-menu-divider"></div>
                <button class="list-menu-item copy-list"><svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/><path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/></svg>Copy list</button>
                <button class="list-menu-item clear-list"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 9L15 15M15 9L9 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Clear cards</button>
                <button class="list-menu-item danger delete-list"><svg viewBox="0 0 24 24" fill="none"><path d="M3 6H21M8 6V4C8 2.89543 8.89543 2 10 2H14C15.1046 2 16 2.89543 16 4V6M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Delete list</button>
            </div>
        </div>
        <div class="list-cards" data-list-id="${list.id}"></div>
        <div class="list-footer">
            <button class="add-card-btn">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                Add a card
            </button>
            <div class="add-card-form">
                <textarea class="add-card-input" placeholder="Enter a title for this card..." rows="2"></textarea>
                <div class="add-card-actions">
                    <button class="btn btn-sm btn-primary add-card-save">Add Card</button>
                    <button class="btn-icon add-card-cancel">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add listeners for list actions (title edit, menu, add card, etc)
    // For brevity, assuming similar logic as original app.js, implemented here:
    // List title editing
    const titleInput = listEl.querySelector('.list-title');
    titleInput.addEventListener('blur', () => {
        const newTitle = titleInput.value.trim();
        if (newTitle && newTitle !== list.title) {
            list.title = newTitle;
            saveState();
        } else {
            titleInput.value = list.title;
        }
    });
    titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') titleInput.blur();
        if (e.key === 'Escape') {
            titleInput.value = list.title;
            titleInput.blur();
        }
    });

    // Menu toggle
    const menuBtn = listEl.querySelector('.list-menu-btn');
    const menu = listEl.querySelector('.list-menu');
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.list-menu.active').forEach(m => m.classList.remove('active'));
        menu.classList.toggle('active');
    });

    // List Actions
    listEl.querySelector('.move-list-left').addEventListener('click', () => {
        const idx = board.lists.indexOf(list);
        if (idx > 0) {
            [board.lists[idx - 1], board.lists[idx]] = [board.lists[idx], board.lists[idx - 1]];
            saveState(); renderBoard();
        }
    });

    listEl.querySelector('.move-list-right').addEventListener('click', () => {
        const idx = board.lists.indexOf(list);
        if (idx < board.lists.length - 1) {
            [board.lists[idx], board.lists[idx + 1]] = [board.lists[idx + 1], board.lists[idx]];
            saveState(); renderBoard();
        }
    });

    listEl.querySelector('.copy-list').addEventListener('click', () => {
        const newList = JSON.parse(JSON.stringify(list));
        newList.id = generateId();
        newList.title = `${list.title} (copy)`;
        newList.cards.forEach(c => c.id = generateId());
        board.lists.splice(board.lists.indexOf(list) + 1, 0, newList);
        saveState(); renderBoard();
    });

    listEl.querySelector('.delete-list').addEventListener('click', () => {
        if (confirm('Delete list?')) {
            board.lists = board.lists.filter(l => l.id !== list.id);
            saveState(); renderBoard();
        }
    });

    listEl.querySelector('.clear-list').addEventListener('click', () => {
        if (confirm('Clear all cards in this list?')) {
            list.cards = [];
            saveState(); renderBoard();
        }
    });

    // Add Card
    const addCardBtn = listEl.querySelector('.add-card-btn');
    const addCardForm = listEl.querySelector('.add-card-form');
    const addCardInput = listEl.querySelector('.add-card-input');
    const saveCardBtn = listEl.querySelector('.add-card-save');
    const cancelCardBtn = listEl.querySelector('.add-card-cancel');

    addCardBtn.addEventListener('click', () => {
        addCardBtn.style.display = 'none';
        addCardForm.classList.add('active');
        addCardInput.focus();
    });

    cancelCardBtn.addEventListener('click', () => {
        addCardBtn.style.display = 'flex';
        addCardForm.classList.remove('active');
        addCardInput.value = '';
    });

    saveCardBtn.addEventListener('click', () => {
        const title = addCardInput.value.trim();
        if (title) {
            list.cards.push({
                id: generateId(),
                title,
                description: '',
                labels: [],
                dueDate: '',
                checklist: [],
                initialEstimate: 0,
                remainingHours: 0
            });
            // Sync backlog if needed (omitted for brevity but should be here)
            if (state.currentProjectId) {
                const project = state.projects.find(p => p.id === state.currentProjectId);
                if (project) {
                    if (!project.backlog) project.backlog = [];
                    project.backlog.push({ id: generateId(), title, addedAt: new Date().toISOString() });
                }
            }
            saveState();
            renderBoard();
        }
    });

    addCardInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCardBtn.click(); }
        if (e.key === 'Escape') cancelCardBtn.click();
    });

    // Render Cards
    const cardsContainer = listEl.querySelector('.list-cards');
    list.cards.forEach(card => {
        const cardEl = createCardElement(card, list.id);
        cardsContainer.appendChild(cardEl);
    });

    // List drag-and-drop (reorder among siblings on the board)
    listEl.draggable = true;
    listEl.addEventListener('dragstart', handleListDragStart);
    listEl.addEventListener('dragend', handleListDragEnd);

    return listEl;
};

// ================================
// CARD ELEMENT
// ================================
const LABEL_COLORS = {
    'priority-high': '#ef4444',
    'priority-medium': '#f59e0b',
    'priority-low': '#22c55e',
    'bug': '#dc2626',
    'feature': '#8b5cf6',
    'improvement': '#06b6d4',
};

const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
};

const getDueDateMeta = (dueDate) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    if (isNaN(due)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueMidnight = new Date(due);
    dueMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.round((dueMidnight - today) / 86400000);
    let cls = '';
    if (diffDays < 0) cls = 'overdue';
    else if (diffDays <= 2) cls = 'soon';
    const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { cls, label };
};

export const createCardElement = (card, listId) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.cardId = card.id;
    cardEl.draggable = true;

    const labels = card.labels || [];
    const labelsHtml = labels.length ? `
        <div class="card-labels">
            ${labels.map(l => `<div class="card-label" style="background: ${LABEL_COLORS[l] || 'var(--accent-primary)'}" title="${escapeHtml(l)}"></div>`).join('')}
        </div>
    ` : '';

    const metaParts = [];

    const due = getDueDateMeta(card.dueDate);
    if (due) {
        metaParts.push(`
            <span class="card-meta-item ${due.cls}" title="Due ${escapeHtml(due.label)}">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${escapeHtml(due.label)}
            </span>
        `);
    }

    const checklist = Array.isArray(card.checklist) ? card.checklist : [];
    if (checklist.length) {
        const done = checklist.filter(i => i.completed).length;
        const complete = done === checklist.length;
        metaParts.push(`
            <span class="card-meta-item ${complete ? 'soon' : ''}" title="Checklist">
                <svg viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${done}/${checklist.length}
            </span>
        `);
    }

    const est = Number(card.initialEstimate) || 0;
    const rem = Number(card.remainingHours) || 0;
    if (est > 0 || rem > 0) {
        metaParts.push(`
            <span class="card-meta-item" title="Remaining / Estimate">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${rem}h / ${est}h
            </span>
        `);
    }

    const metaHtml = metaParts.length ? `<div class="card-meta">${metaParts.join('')}</div>` : '';

    cardEl.innerHTML = `
        ${labelsHtml}
        <div class="card-content">
            <div class="card-title-text">${escapeHtml(card.title || '')}</div>
            ${metaHtml}
        </div>
    `;

    cardEl.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('openCardModal', { detail: { cardId: card.id, listId } }));
    });

    cardEl.addEventListener('dragstart', handleCardDragStart);
    cardEl.addEventListener('dragend', handleCardDragEnd);

    cardEl.addEventListener('touchstart', handleCardTouchStart, { passive: true });
    cardEl.addEventListener('touchmove', handleCardTouchMove, { passive: false });
    cardEl.addEventListener('touchend', handleCardTouchEnd);
    cardEl.addEventListener('touchcancel', handleCardTouchEnd);

    return cardEl;
};

// ================================
// DRAG AND DROP
// ================================
let draggedCard = null;
let draggedListEl = null;

export const initDragAndDrop = () => {
    document.querySelectorAll('.list-cards').forEach(container => {
        container.addEventListener('dragover', handleCardDragOver);
        container.addEventListener('drop', handleCardDrop);
        container.addEventListener('dragleave', handleCardDragLeave);
    });

    if (boardElement) {
        boardElement.addEventListener('dragover', handleListDragOver);
        boardElement.addEventListener('drop', handleListDrop);
    }
};

// --- List reorder ---
const handleListDragStart = (e) => {
    // Ignore drags that originate inside a card (cards handle their own drag)
    if (e.target.closest('.card')) return;
    draggedListEl = e.currentTarget;
    draggedListEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedListEl.dataset.listId);
};

const handleListDragEnd = () => {
    if (draggedListEl) draggedListEl.classList.remove('dragging');
    draggedListEl = null;
};

const getDragAfterList = (container, x) => {
    const lists = [...container.querySelectorAll('.list:not(.dragging)')];
    return lists.reduce((closest, list) => {
        const box = list.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: list };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
};

const handleListDragOver = (e) => {
    if (!draggedListEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const afterList = getDragAfterList(boardElement, e.clientX);
    const addListEl = boardElement.querySelector('.add-list');
    if (!afterList) {
        if (addListEl) boardElement.insertBefore(draggedListEl, addListEl);
        else boardElement.appendChild(draggedListEl);
    } else if (afterList !== draggedListEl) {
        boardElement.insertBefore(draggedListEl, afterList);
    }
};

const handleListDrop = (e) => {
    if (!draggedListEl) return;
    e.preventDefault();
    const board = getCurrentBoard();
    if (!board) return;
    const newOrder = [...boardElement.querySelectorAll('.list')].map(el => el.dataset.listId);
    board.lists.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    saveState();
};

const handleCardDragStart = (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    draggedCard = cardEl;
    cardEl.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardEl.dataset.cardId);
};

const handleCardDragEnd = (e) => {
    const cardEl = e.target.closest('.card');
    if (cardEl) cardEl.classList.remove('dragging');
    document.querySelectorAll('.card-placeholder').forEach(p => p.remove());
    document.querySelectorAll('.list-cards.drag-over').forEach(el => el.classList.remove('drag-over'));
    draggedCard = null;
};

const handleCardDragOver = (e) => {
    if (!draggedCard) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = e.currentTarget;
    document.querySelectorAll('.list-cards.drag-over').forEach(el => {
        if (el !== container) el.classList.remove('drag-over');
    });
    container.classList.add('drag-over');
    const afterElement = getDragAfterElement(container, e.clientY);
    document.querySelectorAll('.card-placeholder').forEach(p => p.remove());
    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    if (afterElement) container.insertBefore(placeholder, afterElement);
    else container.appendChild(placeholder);
};

const handleCardDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
        e.currentTarget.querySelectorAll('.card-placeholder').forEach(p => p.remove());
    }
};

const dropCardToContainer = (cardId, container, clientY) => {
    const targetListId = container.dataset.listId;
    const board = getCurrentBoard();
    if (!board) return false;

    let sourceList, targetList, card;
    board.lists.forEach(l => {
        if (l.id === targetListId) targetList = l;
        const cIndex = l.cards.findIndex(c => c.id === cardId);
        if (cIndex !== -1) {
            sourceList = l;
            [card] = l.cards.splice(cIndex, 1);
        }
    });

    if (!sourceList || !targetList || !card) return false;

    const afterElement = getDragAfterElement(container, clientY);
    let insertIndex = targetList.cards.length;
    if (afterElement) {
        const afterId = afterElement.dataset.cardId;
        const idx = targetList.cards.findIndex(c => c.id === afterId);
        if (idx !== -1) insertIndex = idx;
    }
    targetList.cards.splice(insertIndex, 0, card);
    saveState();
    renderBoard();
    return true;
};

const handleCardDrop = (e) => {
    e.preventDefault();
    if (!draggedCard) return;
    dropCardToContainer(draggedCard.dataset.cardId, e.currentTarget, e.clientY);
};

// --- Touch support (long-press to drag) ---
const LONG_PRESS_MS = 300;
const TOUCH_SCROLL_THRESHOLD = 8;
const touchState = { card: null, startX: 0, startY: 0, timer: null, active: false };

const clearTouchVisuals = () => {
    document.querySelectorAll('.list-cards.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.card-placeholder').forEach(p => p.remove());
};

const handleCardTouchStart = (e) => {
    const cardEl = e.target.closest('.card');
    if (!cardEl) return;
    const t = e.touches[0];
    touchState.card = cardEl;
    touchState.startX = t.clientX;
    touchState.startY = t.clientY;
    touchState.active = false;
    clearTimeout(touchState.timer);
    touchState.timer = setTimeout(() => {
        if (!touchState.card) return;
        touchState.active = true;
        draggedCard = cardEl;
        cardEl.classList.add('dragging');
        if (navigator.vibrate) navigator.vibrate(25);
    }, LONG_PRESS_MS);
};

const handleCardTouchMove = (e) => {
    if (!touchState.card) return;
    const t = e.touches[0];
    if (!touchState.active) {
        if (Math.hypot(t.clientX - touchState.startX, t.clientY - touchState.startY) > TOUCH_SCROLL_THRESHOLD) {
            clearTimeout(touchState.timer);
            touchState.card = null;
        }
        return;
    }
    e.preventDefault();
    const pointEl = document.elementFromPoint(t.clientX, t.clientY);
    const container = pointEl?.closest('.list-cards');
    clearTouchVisuals();
    if (container) {
        container.classList.add('drag-over');
        const afterElement = getDragAfterElement(container, t.clientY);
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';
        if (afterElement) container.insertBefore(placeholder, afterElement);
        else container.appendChild(placeholder);
    }
};

const handleCardTouchEnd = (e) => {
    clearTimeout(touchState.timer);
    if (!touchState.card) return;
    const wasActive = touchState.active;
    const cardEl = touchState.card;
    touchState.card = null;
    touchState.active = false;
    cardEl.classList.remove('dragging');
    if (!wasActive) {
        draggedCard = null;
        clearTouchVisuals();
        return;
    }
    const changedTouch = e.changedTouches?.[0];
    const container = changedTouch
        ? document.elementFromPoint(changedTouch.clientX, changedTouch.clientY)?.closest('.list-cards')
        : null;
    clearTouchVisuals();
    if (container && changedTouch) {
        dropCardToContainer(cardEl.dataset.cardId, container, changedTouch.clientY);
    }
    draggedCard = null;
};

// ================================
// BURNDOWN CHART
// ================================
let burndownChart = null;
export const updateBurndownChart = () => {
    const board = getCurrentBoard();
    if (!board) return;

    let totalRemaining = 0;
    board.lists.forEach(list => list.cards.forEach(card => totalRemaining += (card.remainingHours || 0)));

    const totalEl = document.getElementById('totalRemainingValue');
    if (totalEl) totalEl.textContent = `${totalRemaining} h`;

    const today = new Date().toISOString().split('T')[0];
    if (!board.history) board.history = [];

    const todayEntry = board.history.find(h => h.date === today);
    if (todayEntry) todayEntry.remaining = totalRemaining;
    else board.history.push({ date: today, remaining: totalRemaining });

    board.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    saveState();

    const ctx = document.getElementById('burndownChart');
    if (!ctx) return;
    if (burndownChart) burndownChart.destroy();
    if (typeof Chart === 'undefined') return;

    burndownChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: board.history.map(h => {
                const d = new Date(h.date);
                return `${d.getDate()}/${d.getMonth() + 1}`;
            }),
            datasets: [{
                label: 'Remaining',
                data: board.history.map(h => h.remaining),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
};
