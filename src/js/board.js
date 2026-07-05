import { state, getCurrentBoard, getActiveProject, saveState, getOrCreateInviteToken, generateInviteToken, getCurrentUser, createList, updateListTitle, deleteList, reorderLists, createCard, updateCard, deleteCard, moveCard } from './store.js';
import { generateId, showToast, getDragAfterElement, getEffectiveRemainingHours, getSpentHours, getListHourTotals, getSprintTotalEstimate, formatSprintDuration, getProjectTeamMembers, getLabelColor, getLabelName } from './utils.js';

// ================================
// BOARD RENDERING
// ================================
const boardElement = document.getElementById('board');
const currentProjectName = document.getElementById('currentProjectName');
const currentBoardName = document.getElementById('currentBoardName');

const updateSprintInfoBar = (board) => {
    const bar = document.getElementById('sprintInfoBar');
    if (!bar) return;
    if (!board) { bar.classList.add('hidden'); return; }

    const goalEl = document.getElementById('sprintGoalDisplay');
    const datesEl = document.getElementById('sprintDatesDisplay');

    const goal = board.goal?.trim();
    const start = board.startDate;
    const end = board.endDate;

    if (goalEl) goalEl.textContent = goal ? `🎯 ${goal}` : '';

    if (datesEl && (start || end)) {
        const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '?';
        const today = new Date(); today.setHours(0,0,0,0);
        const duration = formatSprintDuration(start, end);
        const durationInfo = duration ? ` · ${duration}` : '';
        let daysInfo = '';
        if (end) {
            const endDate = new Date(end + 'T00:00:00');
            const diff = Math.round((endDate - today) / 86400000);
            if (diff < 0) daysInfo = ` · <span style="color:var(--error)">${Math.abs(diff)}d overdue</span>`;
            else if (diff === 0) daysInfo = ` · <span style="color:var(--warning)">ends today</span>`;
            else daysInfo = ` · ${diff}d left`;
        }
        datesEl.innerHTML = `📅 ${fmt(start)} – ${fmt(end)}${durationInfo}${daysInfo}`;
    } else if (datesEl) {
        datesEl.textContent = '';
    }

    const hasContent = goal || start || end;
    bar.classList.toggle('hidden', !hasContent);
};

export const renderBoard = () => {
    updateSelectorTexts();
    const board = getCurrentBoard();

    updateSprintInfoBar(board);

    if (!boardElement) return;

    if (!board) {
        const project = state.projects.find(p => p.id === state.currentProjectId);
        let message = 'Select a project and board to get started';
        if (!state.currentProjectId && state.projects.length) {
            message = 'Select a project from the header to get started';
        } else if (state.currentProjectId && project) {
            message = `No boards in "${project.name}". Create one from the board menu.`;
        }
        boardElement.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
        document.documentElement.style.setProperty('--board-bg', '#f3f4f6');
        updateBurndownPanelVisibility(null);
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

    saveBtn.addEventListener('click', async () => {
        const title = addListInput.value.trim();
        if (title) {
            try {
                const board = getCurrentBoard();
                await createList(board.id, title);
                renderBoard();
                showToast('List added!', 'success');
            } catch (error) {
                console.error('Error creating list:', error);
                showToast('Failed to create list', 'error');
            }
        }
    });

    addListInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    });

    boardElement.appendChild(addListEl);
    initDragAndDrop();
    recordDailyBurndown(board);
    updateBurndownPanelVisibility(board);
    updateBurndownChart();
};

export const updateSelectorTexts = () => {
    const currentProject = state.projects.find(p => p.id === state.currentProjectId);
    const projectLabel = currentProject ? currentProject.name : 'Select Project';
    if (currentProjectName) currentProjectName.textContent = projectLabel;

    const currentBoard = getCurrentBoard();
    const boardLabel = currentBoard ? currentBoard.name : 'Select Board';
    if (currentBoardName) currentBoardName.textContent = boardLabel;

    const mobileProjectName = document.getElementById('mobileNavProjectName');
    const mobileBoardName = document.getElementById('mobileNavBoardName');
    if (mobileProjectName) mobileProjectName.textContent = projectLabel;
    if (mobileBoardName) mobileBoardName.textContent = boardLabel;
};

// ================================
// LIST ELEMENT
// ================================
export const createListElement = (list) => {
    const board = getCurrentBoard();
    const listEl = document.createElement('div');
    listEl.className = 'list';
    listEl.dataset.listId = list.id;

    const { estimate: totalInitialEstimate, remaining: totalRemainingHours } = getListHourTotals(list);
    const estimateBadge = totalInitialEstimate > 0
        ? `<span class="list-hour-badge estimate" title="Sum of initial estimates for all cards in this list">
                    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    ${totalInitialEstimate}h
                </span>`
        : '';
    const remainingBadge = totalRemainingHours > 0
        ? `<span class="list-hour-badge remaining" title="Sum of effective remaining hours for all cards in this list">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                    ${totalRemainingHours}h
                </span>`
        : '';

    listEl.innerHTML = `
        <div class="list-header">
            <input type="text" class="list-title" value="${list.title}">
            <div class="list-badges">
                ${estimateBadge}
                ${remainingBadge}
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
    titleInput.addEventListener('blur', async () => {
        const newTitle = titleInput.value.trim();
        if (newTitle && newTitle !== list.title) {
            try {
                const board = getCurrentBoard();
                await updateListTitle(board.id, list.id, newTitle);
                list.title = newTitle;
            } catch (error) {
                console.error('Error updating list title:', error);
                titleInput.value = list.title;
                showToast('Failed to update list title', 'error');
            }
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
    listEl.querySelector('.move-list-left').addEventListener('click', async () => {
        const board = getCurrentBoard();
        const idx = board.lists.indexOf(list);
        if (idx > 0) {
            try {
                const newOrder = [...board.lists.map(l => l.id)];
                [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
                await reorderLists(board.id, newOrder);
                renderBoard();
            } catch (error) {
                console.error('Error moving list left:', error);
                showToast('Failed to move list', 'error');
            }
        }
    });

    listEl.querySelector('.move-list-right').addEventListener('click', async () => {
        const board = getCurrentBoard();
        const idx = board.lists.indexOf(list);
        if (idx < board.lists.length - 1) {
            try {
                const newOrder = [...board.lists.map(l => l.id)];
                [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
                await reorderLists(board.id, newOrder);
                renderBoard();
            } catch (error) {
                console.error('Error moving list right:', error);
                showToast('Failed to move list', 'error');
            }
        }
    });

    listEl.querySelector('.copy-list').addEventListener('click', async () => {
        const board = getCurrentBoard();
        try {
            const newList = JSON.parse(JSON.stringify(list));
            newList.id = generateId();
            newList.title = `${list.title} (copy)`;
            newList.cards.forEach(c => c.id = generateId());
            
            // Create the copied list
            await createList(board.id, newList.title);
            
            // Add copied cards to the new list
            for (const card of list.cards) {
                await createCard(board.id, newList.id, card.title, card.description);
            }
            
            renderBoard();
            showToast('List copied!', 'success');
        } catch (error) {
            console.error('Error copying list:', error);
            showToast('Failed to copy list', 'error');
        }
    });

    listEl.querySelector('.delete-list').addEventListener('click', async () => {
        if (confirm('Delete list?')) {
            try {
                const board = getCurrentBoard();
                await deleteList(board.id, list.id);
                renderBoard();
                showToast('List deleted!', 'success');
            } catch (error) {
                console.error('Error deleting list:', error);
                showToast('Failed to delete list', 'error');
            }
        }
    });

    listEl.querySelector('.clear-list').addEventListener('click', async () => {
        if (confirm('Clear all cards in this list?')) {
            try {
                const board = getCurrentBoard();
                // Delete all cards in the list
                for (const card of [...list.cards]) {
                    await deleteCard(board.id, list.id, card.id);
                }
                renderBoard();
                showToast('List cleared!', 'success');
            } catch (error) {
                console.error('Error clearing list:', error);
                showToast('Failed to clear list', 'error');
            }
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

    saveCardBtn.addEventListener('click', async () => {
        const title = addCardInput.value.trim();
        if (title) {
            try {
                const board = getCurrentBoard();
                await createCard(board.id, list.id, title);
                renderBoard();
                showToast('Card added!', 'success');
            } catch (error) {
                console.error('Error creating card:', error);
                showToast('Failed to create card', 'error');
            }
        }
    });

    addCardInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCardBtn.click(); }
        if (e.key === 'Escape') cancelCardBtn.click();
    });

    // Render Cards progressively
    const cardsContainer = listEl.querySelector('.list-cards');
    const cards = list.cards || [];
    const INITIAL_LIMIT = 10;
    const CHUNK_SIZE = 10;

    // Render initial chunk
    const initialCards = cards.slice(0, INITIAL_LIMIT);
    initialCards.forEach(card => {
        const cardEl = createCardElement(card, list.id);
        cardsContainer.appendChild(cardEl);
    });

    // Progressively render remaining cards in the background when idle/deferred
    if (cards.length > INITIAL_LIMIT) {
        let currentIndex = INITIAL_LIMIT;
        
        const renderNextChunk = () => {
            if (currentIndex >= cards.length) return;
            
            const chunk = cards.slice(currentIndex, currentIndex + CHUNK_SIZE);
            const fragment = document.createDocumentFragment();
            chunk.forEach(card => {
                const cardEl = createCardElement(card, list.id);
                fragment.appendChild(cardEl);
            });
            cardsContainer.appendChild(fragment);
            currentIndex += CHUNK_SIZE;
            
            if (currentIndex < cards.length) {
                if (window.requestIdleCallback) {
                    window.requestIdleCallback(renderNextChunk);
                } else {
                    setTimeout(renderNextChunk, 30);
                }
            }
        };

        if (window.requestIdleCallback) {
            window.requestIdleCallback(renderNextChunk);
        } else {
            setTimeout(renderNextChunk, 30);
        }
    }

    // List drag-and-drop (reorder among siblings on the board)
    listEl.draggable = true;
    listEl.addEventListener('dragstart', handleListDragStart);
    listEl.addEventListener('dragend', handleListDragEnd);

    return listEl;
};

// ================================
// CARD ELEMENT
// ================================
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

    const project = getActiveProject();
    const labels = card.labels || [];
    const labelsHtml = labels.length ? `
        <div class="card-labels">
            ${labels.map(l => `<div class="card-label" style="background: ${getLabelColor(project, l)}" title="${escapeHtml(getLabelName(project, l))}"></div>`).join('')}
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

    const comments = Array.isArray(card.comments) ? card.comments : [];
    if (comments.length) {
        metaParts.push(`
            <span class="card-meta-item" title="Comments">
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${comments.length}
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
    const rem = getEffectiveRemainingHours(card);
    const spent = getSpentHours(card);
    if (rem > 0) {
        metaParts.push(`
            <span class="card-meta-item time-remaining" title="Remaining hours">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${rem}h
            </span>
        `);
    }
    if (est > 0 || spent > 0) {
        const overBudget = est > 0 && spent > est;
        metaParts.push(`
            <span class="card-meta-item time-spent ${overBudget ? 'over-budget' : ''}" title="Spent / Estimate">
                <svg viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${spent} / ${est}h
            </span>
        `);
    }

    const attachments = Array.isArray(card.attachments) ? card.attachments : [];
    if (attachments.length) {
        metaParts.push(`
            <span class="card-meta-item" title="Attachments">
                <svg viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${attachments.length}
            </span>
        `);
    }

    // Assignee avatar(s)
    let assigneeHtml = '';
    if (card.assigneeId) {
        const team = getProjectTeamMembers(getActiveProject());
        const assignee = team.find(m => m?.id === card.assigneeId);
        if (assignee) {
            const initials = (assignee.name || assignee.email || 'U').charAt(0).toUpperCase();
            assigneeHtml = assignee.photoURL
                ? `<div class="card-assignee" title="${escapeHtml(assignee.name || assignee.email || '')}"><img src="${escapeHtml(assignee.photoURL)}" alt="${escapeHtml(initials)}"></div>`
                : `<div class="card-assignee" title="${escapeHtml(assignee.name || assignee.email || '')}">${escapeHtml(initials)}</div>`;
        } else {
            assigneeHtml = `<div class="card-assignee unknown" title="Unknown member">?</div>`;
        }
    }

    const metaHtml = metaParts.length || assigneeHtml ? `
        <div class="card-meta">
            <div class="card-meta-left">${metaParts.join('')}</div>
            ${assigneeHtml ? `<div class="card-meta-right">${assigneeHtml}</div>` : ''}
        </div>
    ` : '';

    // Story badge
    let storyBadgeHtml = '';
    if (card.linkedStoryId) {
        const project = state.projects.find(p => p.id === state.currentProjectId);
        const story = project ? (project.backlog || []).find(s => s.id === card.linkedStoryId) : null;
        if (story) {
            storyBadgeHtml = `<div class="card-story-badge">
                <svg viewBox="0 0 24 24" fill="none" width="10" height="10"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${escapeHtml(story.title)}
            </div>`;
        }
    }

    cardEl.innerHTML = `
        ${storyBadgeHtml}
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

const handleListDrop = async (e) => {
    if (!draggedListEl) return;
    e.preventDefault();
    const board = getCurrentBoard();
    if (!board) return;
    const newOrder = [...boardElement.querySelectorAll('.list')].map(el => el.dataset.listId);
    
    try {
        await reorderLists(board.id, newOrder);
        // Update local state to match new order
        board.lists.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
    } catch (error) {
        console.error('Error reordering lists:', error);
        showToast('Failed to reorder lists', 'error');
        // Re-render to restore original order
        renderBoard();
    }
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

const dropCardToContainer = async (cardId, container, clientY) => {
    const targetListId = container.dataset.listId;
    const board = getCurrentBoard();
    if (!board) return false;

    let sourceList = null;
    let targetList = null;
    for (const list of board.lists) {
        if (list.id === targetListId) targetList = list;
        if (list.cards.some(c => c.id === cardId)) sourceList = list;
    }

    if (!sourceList || !targetList) return false;

    const afterElement = getDragAfterElement(container, clientY);
    let insertIndex = targetList.cards.length;
    if (afterElement) {
        const afterId = afterElement.dataset.cardId;
        const idx = targetList.cards.findIndex(c => c.id === afterId);
        if (idx !== -1) insertIndex = idx;
    }

    try {
        await moveCard(board.id, sourceList.id, targetList.id, cardId, insertIndex);
        renderBoard();
        return true;
    } catch (error) {
        console.error('Error moving card:', error);
        showToast('Failed to move card', 'error');
        renderBoard();
        return false;
    }
};

const handleCardDrop = async (e) => {
    e.preventDefault();
    if (!draggedCard) return;
    await dropCardToContainer(draggedCard.dataset.cardId, e.currentTarget, e.clientY);
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
let burndownAssigneeFilter = 'all';

const getBurndownFilterKey = (projectId) => `flowboard-burndown-filter-${projectId || 'none'}`;

const loadBurndownAssigneeFilter = (projectId) => {
    const saved = localStorage.getItem(getBurndownFilterKey(projectId));
    return saved || 'all';
};

const saveBurndownAssigneeFilter = (projectId, value) => {
    localStorage.setItem(getBurndownFilterKey(projectId), value);
};

const buildByAssigneeTotals = (cards) => {
    const byAssignee = {};
    cards.forEach(card => {
        if (!card.assigneeId) return;
        const rem = getEffectiveRemainingHours(card);
        byAssignee[card.assigneeId] = (byAssignee[card.assigneeId] || 0) + rem;
    });
    return byAssignee;
};

export const recordDailyBurndown = (board) => {
    if (!board?.lists) return;

    const today = new Date().toISOString().slice(0, 10);
    const allCards = [];
    board.lists.forEach(list => list.cards.forEach(card => allCards.push(card)));
    const totalRemaining = allCards.reduce((sum, card) => sum + getEffectiveRemainingHours(card), 0);
    const byAssignee = buildByAssigneeTotals(allCards);

    if (!Array.isArray(board.history)) board.history = [];

    const existing = board.history.find(h => h.date === today);
    if (existing) {
        let changed = false;
        if (existing.remaining !== totalRemaining) {
            existing.remaining = totalRemaining;
            changed = true;
        }
        if (JSON.stringify(existing.byAssignee || {}) !== JSON.stringify(byAssignee)) {
            existing.byAssignee = byAssignee;
            changed = true;
        }
        if (changed) saveState();
        return;
    }

    board.history.push({ date: today, remaining: totalRemaining, byAssignee });
    board.history.sort((a, b) => a.date.localeCompare(b.date));
    saveState();
};

const populateBurndownAssigneeFilter = (board) => {
    const select = document.getElementById('burndownAssigneeFilter');
    if (!select) return;

    const project = state.projects.find(p => p.id === board.projectId);
    const members = getProjectTeamMembers(project);
    const saved = loadBurndownAssigneeFilter(board.projectId);
    const valid = saved === 'all' || members.some(m => m.id === saved);

    select.innerHTML = '<option value="all">All team</option>' +
        members.map(m => {
            const label = m.name || m.email || 'Member';
            return `<option value="${escapeHtml(m.id)}">${escapeHtml(label)}</option>`;
        }).join('');

    burndownAssigneeFilter = valid ? saved : 'all';
    select.value = burndownAssigneeFilter;
};

const buildBurndownDays = (cards, startDate, endDate, history = []) => {
    const allTimestamps = new Set();
    cards.forEach(card => {
        (card.remainingHoursLog || []).forEach(e => allTimestamps.add(e.timestamp));
    });

    let uniqueDays = [...new Set([...allTimestamps].map(t => t.slice(0, 10)))];

    history.forEach(h => uniqueDays.push(h.date));

    // Include sprint start/end if available
    if (startDate) uniqueDays.push(startDate);
    if (endDate) uniqueDays.push(endDate);

    // Also include today
    uniqueDays.push(new Date().toISOString().slice(0, 10));

    uniqueDays = [...new Set(uniqueDays)].sort();

    // Only span from earliest log entry to today (or end date)
    const todayStr = new Date().toISOString().slice(0, 10);
    const endStr = endDate && endDate <= todayStr ? endDate : todayStr;
    const minDay = startDate || uniqueDays[0];
    uniqueDays = uniqueDays.filter(d => d >= minDay && d <= endStr);

    return uniqueDays;
};

export const updateBurndownChart = () => {
    const board = getCurrentBoard();
    if (!board) return;

    populateBurndownAssigneeFilter(board);

    const allCards = [];
    board.lists.forEach(list => list.cards.forEach(card => allCards.push(card)));

    const assigneeId = burndownAssigneeFilter === 'all' ? null : burndownAssigneeFilter;
    const chartCards = assigneeId
        ? allCards.filter(card => card.assigneeId === assigneeId)
        : allCards;

    const totalRemaining = chartCards.reduce((sum, card) => sum + getEffectiveRemainingHours(card), 0);
    const totalSpent = chartCards.reduce((sum, card) => sum + getSpentHours(card), 0);

    const totalEl = document.getElementById('totalRemainingValue');
    if (totalEl) totalEl.textContent = `${totalRemaining} h`;
    const spentEl = document.getElementById('totalSpentValue');
    if (spentEl) spentEl.textContent = `${totalSpent}h`;

    const emptyEl = document.getElementById('burndownEmptyHint');
    if (emptyEl) {
        emptyEl.textContent = assigneeId && !chartCards.length
            ? 'No cards assigned to this member'
            : '';
        emptyEl.classList.toggle('hidden', !(assigneeId && !chartCards.length));
    }

    const subtitleEl = document.getElementById('burndownFilterSubtitle');
    if (subtitleEl) {
        if (assigneeId) {
            const project = state.projects.find(p => p.id === board.projectId);
            const member = getProjectTeamMembers(project).find(m => m.id === assigneeId);
            const label = member?.name || member?.email || 'Member';
            subtitleEl.textContent = `Showing ${label}'s work`;
            subtitleEl.classList.remove('hidden');
        } else {
            subtitleEl.textContent = '';
            subtitleEl.classList.add('hidden');
        }
    }

    const ctx = document.getElementById('burndownChart');
    if (!ctx) return;
    if (burndownChart) { burndownChart.destroy(); burndownChart = null; }
    if (typeof Chart === 'undefined') return;

    const history = Array.isArray(board.history) ? board.history : [];
    const uniqueDays = buildBurndownDays(chartCards.length ? chartCards : allCards, board.startDate, board.endDate, history);
    if (!uniqueDays.length) return;

    const chartLabels = uniqueDays.map(d => {
        const [, m, day] = d.split('-');
        return `${parseInt(day)}/${parseInt(m)}`;
    });

    const datasets = [];
    const historyByDate = Object.fromEntries(history.map(h => [h.date, h]));

    const getHistoryRemaining = (date) => {
        const entry = historyByDate[date];
        if (!entry) return undefined;
        if (assigneeId) return entry.byAssignee?.[assigneeId];
        return entry.remaining;
    };

    const actualData = uniqueDays.map(d => {
        const histVal = getHistoryRemaining(d);
        if (histVal !== undefined && histVal !== null) return histVal;
        const endOfDay = new Date(`${d}T23:59:59.999Z`);
        return chartCards.reduce((sum, card) => sum + getEffectiveRemainingHours(card, endOfDay), 0);
    });

    const actualLabel = assigneeId ? 'Actual (member)' : 'Actual';
    datasets.push({
        label: actualLabel,
        data: actualData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2.5
    });

    if (board.startDate && board.endDate) {
        const totalEstimate = getSprintTotalEstimate(chartCards);
        const sprintDays = uniqueDays.filter(d => d >= board.startDate && d <= board.endDate);
        if (sprintDays.length >= 1 && totalEstimate > 0) {
            const lastIdx = Math.max(sprintDays.length - 1, 1);
            const idealData = uniqueDays.map(d => {
                if (d < board.startDate) return null;
                if (d > board.endDate) return null;
                const dayIdx = sprintDays.indexOf(d);
                if (dayIdx < 0) return null;
                return Math.max(0, totalEstimate * (1 - dayIdx / lastIdx));
            });
            datasets.push({
                label: 'Ideal',
                data: idealData,
                borderColor: '#94a3b8',
                borderDash: [6, 4],
                backgroundColor: 'transparent',
                fill: false,
                tension: 0,
                pointRadius: 0,
                borderWidth: 2
            });
        }
    }

    burndownChart = new Chart(ctx, {
        type: 'line',
        data: { labels: chartLabels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    labels: { boxWidth: 14, font: { size: 11 }, usePointStyle: true }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (ctx) => {
                            const value = ctx.parsed.y;
                            return value == null ? '' : `${ctx.dataset.label}: ${value}h`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Hours' } },
                x: { title: { display: false } }
            }
        }
    });
};

export const updateBurndownPanelVisibility = (board) => {
    const panel = document.getElementById('burndownPanel');
    if (!panel) return;

    const pmScreen = document.getElementById('projectManagementScreen');
    const boardContainer = document.getElementById('boardContainer');
    const pmVisible = pmScreen && !pmScreen.classList.contains('hidden');
    const boardVisible = boardContainer && !boardContainer.classList.contains('hidden');
    const hasSprintDates = !!(board?.startDate && board?.endDate);

    panel.classList.toggle('hidden', pmVisible || !boardVisible || !hasSprintDates);
};

const initBurndownPanel = () => {
    const panel = document.getElementById('burndownPanel');
    const header = document.getElementById('burndownHeader');
    const toggleBtn = panel?.querySelector('.burndown-toggle');
    if (!panel || !header || !toggleBtn) return;

    const isMobileBurndown = () => window.matchMedia('(max-width: 768px)').matches;

    const applyBurndownLayout = () => {
        if (isMobileBurndown()) {
            panel.style.left = '';
            panel.style.top = '';
            panel.style.right = '';
            panel.style.bottom = '';
            panel.classList.add('mobile-sheet');
            return;
        }
        panel.classList.remove('mobile-sheet');
        const saved = localStorage.getItem('flowboard-burndown-position');
        if (!saved) return;
        try {
            const pos = JSON.parse(saved);
            if (typeof pos.left === 'number' && typeof pos.top === 'number') {
                panel.style.right = 'auto';
                panel.style.bottom = 'auto';
                panel.style.left = `${pos.left}px`;
                panel.style.top = `${pos.top}px`;
            }
        } catch { /* ignore */ }
    };

    applyBurndownLayout();
    window.matchMedia('(max-width: 768px)').addEventListener('change', applyBurndownLayout);

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('collapsed');
    });

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    header.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        if (isMobileBurndown()) return;
        dragging = true;
        header.setPointerCapture(e.pointerId);
        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = `${startLeft}px`;
        panel.style.top = `${startTop}px`;
        panel.classList.add('dragging');
    });

    header.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        panel.style.left = `${startLeft + (e.clientX - startX)}px`;
        panel.style.top = `${startTop + (e.clientY - startY)}px`;
    });

    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        panel.classList.remove('dragging');
        header.releasePointerCapture(e.pointerId);
        const rect = panel.getBoundingClientRect();
        localStorage.setItem('flowboard-burndown-position', JSON.stringify({
            left: Math.max(0, rect.left),
            top: Math.max(0, rect.top)
        }));
    };

    header.addEventListener('pointerup', endDrag);
    header.addEventListener('pointercancel', endDrag);

    const assigneeSelect = document.getElementById('burndownAssigneeFilter');
    assigneeSelect?.addEventListener('change', () => {
        const board = getCurrentBoard();
        burndownAssigneeFilter = assigneeSelect.value || 'all';
        if (board?.projectId) saveBurndownAssigneeFilter(board.projectId, burndownAssigneeFilter);
        updateBurndownChart();
    });
};

initBurndownPanel();
