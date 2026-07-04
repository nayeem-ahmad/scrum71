import { initAuth } from './auth.js';
import { renderBoard } from './board.js';
import { state, loadState, saveState, getOrCreateInviteToken, generateInviteToken, getCurrentBoard, getActiveProject, getCurrentUser, getBoardsForProject, deleteCard as deleteCardFromStore, createCard, updateCard, createBoard, createProject, updateBoard, updateProject } from './store.js';
import { showToast, generateUniqueProjectName, generateId, getEffectiveRemainingHours, getSpentHours, formatSprintDuration, getProjectTeamMembers, getProjectLabels } from './utils.js';
import { isFirebaseConfigured, storage } from './config.js';
import { renderProjectManagement, unlinkBacklogFromCard } from './project.js';

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

const switchToProject = (projectId) => {
    if (!projectId || projectId === state.currentProjectId) return;
    state.currentProjectId = projectId;
    const boards = getBoardsForProject(projectId);
    const currentStillValid = boards.some(b => b.id === state.currentBoardId);
    if (!currentStillValid) {
        state.currentBoardId = boards.length ? boards[0].id : null;
    }
    saveState();
    renderBoard();
};

const switchToBoard = (boardId) => {
    if (!boardId || boardId === state.currentBoardId) return;
    state.currentBoardId = boardId;
    saveState();
    renderBoard();
};

const bindProjectListItems = (container, onSelect) => {
    if (!container) return;
    container.querySelectorAll('.board-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
            switchToProject(btn.dataset.id);
            onSelect?.();
        });
    });
};

const bindBoardListItems = (container, onSelect) => {
    if (!container) return;
    container.querySelectorAll('.board-list-item').forEach(btn => {
        btn.addEventListener('click', () => {
            switchToBoard(btn.dataset.id);
            onSelect?.();
        });
    });
};

const renderHeaderProjectList = () => {
    const html = !state.projects.length
        ? '<div class="dropdown-empty-hint">No projects yet</div>'
        : state.projects.map(p => `
        <button class="board-list-item ${p.id === state.currentProjectId ? 'active' : ''}" data-id="${p.id}">
            <div class="board-color-dot" style="background: var(--accent-primary)"></div>
            <span class="board-item-name">${escapeHtml(p.name)}</span>
        </button>
    `).join('');

    const list = document.getElementById('projectList');
    const mobileList = document.getElementById('mobileProjectList');
    if (list) list.innerHTML = html;
    if (mobileList) mobileList.innerHTML = html;

    const closeDesktop = () => document.getElementById('projectSelector')?.classList.remove('active');
    bindProjectListItems(list, closeDesktop);
    bindProjectListItems(mobileList, closeMobileNav);
};

const renderHeaderBoardList = () => {
    let html;
    if (!state.currentProjectId) {
        html = '<div class="dropdown-empty-hint">Select a project first</div>';
    } else {
        const boards = getBoardsForProject(state.currentProjectId);
        const project = state.projects.find(p => p.id === state.currentProjectId);
        html = !boards.length
            ? `<div class="dropdown-empty-hint">No boards in ${escapeHtml(project?.name || 'this project')}</div>`
            : boards.map(b => `
        <button class="board-list-item ${b.id === state.currentBoardId ? 'active' : ''}" data-id="${b.id}">
             <div class="board-color-dot" style="background: ${escapeHtml(b.background)}"></div>
             <span class="board-item-name">${escapeHtml(b.name)}</span>
        </button>
    `).join('');
    }

    const list = document.getElementById('boardList');
    const mobileList = document.getElementById('mobileBoardList');
    if (list) list.innerHTML = html;
    if (mobileList) mobileList.innerHTML = html;

    const closeDesktop = () => document.getElementById('boardSelector')?.classList.remove('active');
    bindBoardListItems(list, closeDesktop);
    bindBoardListItems(mobileList, closeMobileNav);
};

// ================================
// MOBILE NAVIGATION
// ================================
const closeMobileNav = () => {
    const overlay = document.getElementById('mobileNavOverlay');
    overlay?.classList.remove('active');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mobile-nav-open');
};

const openMobileNav = () => {
    renderHeaderProjectList();
    renderHeaderBoardList();
    const overlay = document.getElementById('mobileNavOverlay');
    overlay?.classList.add('active');
    overlay?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobile-nav-open');
};

document.getElementById('mobileNavBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openMobileNav();
});

document.getElementById('mobileNavClose')?.addEventListener('click', closeMobileNav);
document.getElementById('mobileNavOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'mobileNavOverlay') closeMobileNav();
});

document.getElementById('mobileManageProjectsBtn')?.addEventListener('click', () => {
    closeMobileNav();
    const pmScreen = document.getElementById('projectManagementScreen');
    if (pmScreen?.classList.contains('hidden')) {
        document.getElementById('manageProjectsBtn')?.click();
    }
});

document.getElementById('mobileCreateBoardBtn')?.addEventListener('click', () => {
    closeMobileNav();
    document.getElementById('createBoardBtn')?.click();
});

document.getElementById('mobileCreateProjectBtn')?.addEventListener('click', () => {
    document.getElementById('mobileProjectQuickCreate')?.classList.remove('hidden');
    document.getElementById('mobileQuickProjectName')?.focus();
});

document.getElementById('mobileQuickCancelProjectBtn')?.addEventListener('click', () => {
    document.getElementById('mobileProjectQuickCreate')?.classList.add('hidden');
    const input = document.getElementById('mobileQuickProjectName');
    if (input) input.value = '';
});

const submitMobileQuickProject = async () => {
    const input = document.getElementById('mobileQuickProjectName');
    const name = input?.value.trim();
    if (!name) {
        showToast('Enter a project name', 'error');
        input?.focus();
        return;
    }
    try {
        await createProject({ name });
        if (input) input.value = '';
        document.getElementById('mobileProjectQuickCreate')?.classList.add('hidden');
        renderHeaderProjectList();
        renderBoard();
        showToast(`Project "${name}" created`, 'success');
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Failed to create project', 'error');
    }
};

document.getElementById('mobileQuickCreateProjectBtn')?.addEventListener('click', submitMobileQuickProject);
document.getElementById('mobileQuickProjectName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitMobileQuickProject(); }
    if (e.key === 'Escape') document.getElementById('mobileQuickCancelProjectBtn')?.click();
});

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
        el.querySelector('.checklist-checkbox').addEventListener('change', async (e) => {
            item.completed = e.target.checked;
            el.classList.toggle('completed', e.target.checked);
            
            // Save checklist update
            if (editingCardContext) {
                try {
                    const board = getCurrentBoard();
                    await updateCard(board.id, editingCardContext.listId, card.id, {
                        checklist: card.checklist
                    });
                } catch (error) {
                    console.error('Error updating checklist:', error);
                    // Rollback UI
                    item.completed = !e.target.checked;
                    el.classList.toggle('completed', !e.target.checked);
                    e.target.checked = !e.target.checked;
                    showToast('Failed to update checklist', 'error');
                }
            }
        });
        el.querySelector('.checklist-delete').addEventListener('click', async () => {
            const updatedChecklist = card.checklist.filter(i => i.id !== id);
            
            if (editingCardContext) {
                try {
                    const board = getCurrentBoard();
                    await updateCard(board.id, editingCardContext.listId, card.id, {
                        checklist: updatedChecklist
                    });
                    card.checklist = updatedChecklist;
                    renderChecklist(card);
                } catch (error) {
                    console.error('Error deleting checklist item:', error);
                    showToast('Failed to delete checklist item', 'error');
                }
            } else {
                card.checklist = updatedChecklist;
                renderChecklist(card);
            }
        });
    });
};

// ================================
// CARD COMMENTS
// ================================

let commentsSortNewest = true;

const formatRelativeTime = (iso) => {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getCommentAuthor = () => {
    const user = getCurrentUser();
    if (user) {
        return {
            authorId: user.uid,
            author: user.displayName || user.email || 'User'
        };
    }
    const board = getCurrentBoard();
    if (board?.owner) {
        return {
            authorId: board.owner.id || 'guest',
            author: board.owner.name || board.owner.email || 'Guest'
        };
    }
    return { authorId: 'guest', author: 'Guest' };
};

const canDeleteComment = (comment) => {
    const { authorId } = getCommentAuthor();
    return comment.authorId === authorId;
};

const renderComments = (card) => {
    const container = document.getElementById('commentsList');
    const sortBtn = document.getElementById('commentsSortToggle');
    if (!container) return;
    if (!card.comments) card.comments = [];

    if (sortBtn) {
        sortBtn.textContent = commentsSortNewest ? 'Newest first' : 'Oldest first';
    }

    const sorted = [...card.comments].sort((a, b) => {
        const diff = new Date(a.createdAt) - new Date(b.createdAt);
        return commentsSortNewest ? -diff : diff;
    });

    if (!sorted.length) {
        container.innerHTML = '<div class="comments-empty">No comments yet. Start the discussion below.</div>';
        return;
    }

    container.innerHTML = sorted.map(comment => {
        const deleteBtn = canDeleteComment(comment)
            ? `<button class="comment-delete-btn" data-comment-id="${escapeHtml(comment.id)}" title="Delete comment">
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </button>`
            : '';
        return `
        <div class="comment-item" data-comment-id="${escapeHtml(comment.id)}">
            <div class="comment-meta">
                <span class="comment-author">${escapeHtml(comment.author || 'User')}</span>
                <span class="comment-time" title="${escapeHtml(comment.createdAt || '')}">${escapeHtml(formatRelativeTime(comment.createdAt))}</span>
                ${deleteBtn}
            </div>
            <div class="comment-content">${escapeHtml(comment.content || '')}</div>
        </div>`;
    }).join('');

    container.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const commentId = btn.dataset.commentId;
            if (!commentId || !editingCardContext) return;
            const updated = card.comments.filter(c => c.id !== commentId);
            try {
                const board = getCurrentBoard();
                await updateCard(board.id, editingCardContext.listId, card.id, { comments: updated });
                card.comments = updated;
                renderBoard();
                renderComments(card);
            } catch (error) {
                console.error('Error deleting comment:', error);
                showToast('Failed to delete comment', 'error');
            }
        });
    });
};

document.getElementById('commentsSortToggle')?.addEventListener('click', () => {
    commentsSortNewest = !commentsSortNewest;
    const card = getEditingCard();
    if (card) renderComments(card);
});

document.getElementById('addCommentBtn')?.addEventListener('click', async () => {
    const card = getEditingCard();
    const input = document.getElementById('newCommentInput');
    if (!card || !input || !editingCardContext) return;

    const content = input.value.trim();
    if (!content) {
        showToast('Comment cannot be empty', 'error');
        input.focus();
        return;
    }

    const { authorId, author } = getCommentAuthor();
    const newComment = {
        id: generateId(),
        authorId,
        author,
        content,
        createdAt: new Date().toISOString()
    };
    const updated = [...(card.comments || []), newComment];

    try {
        const board = getCurrentBoard();
        await updateCard(board.id, editingCardContext.listId, card.id, { comments: updated });
        card.comments = updated;
        input.value = '';
        renderBoard();
        renderComments(card);
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast('Failed to add comment', 'error');
    }
});

document.getElementById('newCommentInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById('addCommentBtn')?.click();
    }
});

const renderAssigneePreview = (card) => {
    const preview = document.getElementById('cardAssigneePreview');
    if (!preview) return;
    const team = getProjectTeamMembers(getActiveProject());
    const assignee = team.find(m => m.id === card.assigneeId);

    if (!card.assigneeId) {
        preview.innerHTML = '<span class="assignee-none">No assignee selected</span>';
        return;
    }
    if (!assignee) {
        preview.innerHTML = '<span class="assignee-unknown">Unknown member</span>';
        return;
    }

    const label = assignee.name || assignee.email || 'Member';
    const initials = label.charAt(0).toUpperCase();
    const avatarHtml = assignee.photoURL
        ? `<div class="assignee-preview-avatar"><img src="${escapeHtml(assignee.photoURL)}" alt="${escapeHtml(initials)}"></div>`
        : `<div class="assignee-preview-avatar">${escapeHtml(initials)}</div>`;
    preview.innerHTML = `${avatarHtml}<span>${escapeHtml(label)}</span>`;
};

const renderAssigneeOptions = (card) => {
    const select = document.getElementById('cardAssignee');
    if (!select) return;
    const members = getProjectTeamMembers(getActiveProject());

    select.innerHTML = '<option value="">Unassigned</option>' +
        members.map(m => {
            const label = m.name || m.email || 'Member';
            const roleHint = m.role && m.role !== 'owner' ? ` (${m.role})` : '';
            return `<option value="${escapeHtml(m.id)}">${escapeHtml(label + roleHint)}</option>`;
        }).join('');

    select.value = card.assigneeId || '';
    renderAssigneePreview(card);
};

document.getElementById('cardAssignee')?.addEventListener('change', () => {
    const card = getEditingCard();
    if (!card) return;
    card.assigneeId = document.getElementById('cardAssignee').value || null;
    renderAssigneePreview(card);
});

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

    renderLabelPicker(card);

    // Story link
    const storyDisplay = document.getElementById('cardStoryDisplay');
    if (storyDisplay) {
        const project = state.projects.find(p => p.id === state.currentProjectId);
        const story = card.linkedStoryId && project
            ? (project.backlog || []).find(s => s.id === card.linkedStoryId)
            : null;
        if (story) {
            storyDisplay.className = 'card-story-link';
            storyDisplay.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" width="12" height="12"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${escapeHtml(story.title)}
            `;
        } else {
            storyDisplay.className = 'card-story-none';
            storyDisplay.textContent = 'No story linked';
        }
    }

    renderChecklist(card);
    renderComments(card);
    renderAssigneeOptions(card);
    renderRemainingHoursTab(card);
    renderAttachments(card);

    document.getElementById('cardModal').classList.add('active');
};

const renderLabelPicker = (card) => {
    const picker = document.getElementById('labelPicker');
    if (!picker) return;
    const project = getActiveProject();
    const labels = getProjectLabels(project);
    const selected = card.labels || [];

    picker.innerHTML = labels.map(label => `
        <button type="button" class="label-option${selected.includes(label.id) ? ' selected' : ''}" data-label="${escapeHtml(label.id)}" data-color="${escapeHtml(label.color)}" title="${escapeHtml(label.name)}">
            <span class="label-color" style="background: ${escapeHtml(label.color)}"></span>
            ${escapeHtml(label.name)}
        </button>
    `).join('');

    picker.querySelectorAll('.label-option').forEach(btn => {
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });
};

const openAttachmentLightbox = (url, name) => {
    const lightbox = document.getElementById('attachmentLightbox');
    const img = document.getElementById('attachmentLightboxImg');
    const caption = document.getElementById('attachmentLightboxCaption');
    if (!lightbox || !img) return;
    img.src = url;
    img.alt = name || 'Attachment preview';
    if (caption) caption.textContent = name || '';
    lightbox.classList.remove('hidden');
};

const closeAttachmentLightbox = () => {
    const lightbox = document.getElementById('attachmentLightbox');
    const img = document.getElementById('attachmentLightboxImg');
    if (!lightbox) return;
    lightbox.classList.add('hidden');
    if (img) {
        img.src = '';
        img.alt = '';
    }
    document.getElementById('attachmentLightboxCaption')?.replaceChildren();
};

const renderAttachments = (card) => {
    const list = document.getElementById('attachmentsList');
    const progress = document.getElementById('attachmentUploadProgress');
    if (!list) return;
    if (progress) progress.classList.add('hidden');

    const attachments = card.attachments || [];
    if (!attachments.length) {
        list.innerHTML = '<div class="attachments-empty">No attachments yet.</div>';
        return;
    }

    list.innerHTML = attachments.map(att => {
        const isImage = att.type?.startsWith('image/');
        const preview = isImage
            ? `<button type="button" class="attachment-thumb-btn" data-url="${escapeHtml(att.url)}" data-name="${escapeHtml(att.name)}" title="Preview image">
                <img src="${escapeHtml(att.url)}" alt="" class="attachment-thumb">
               </button>`
            : `<span class="attachment-file-icon" aria-hidden="true">📄</span>`;
        return `
        <div class="attachment-item" data-id="${escapeHtml(att.id)}">
            ${preview}
            <a href="${escapeHtml(att.url)}" target="_blank" rel="noopener" class="attachment-name" download="${escapeHtml(att.name)}">${escapeHtml(att.name)}</a>
            <button type="button" class="attachment-delete-btn" data-id="${escapeHtml(att.id)}" title="Delete attachment">×</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.attachment-thumb-btn').forEach(btn => {
        btn.addEventListener('click', () => openAttachmentLightbox(btn.dataset.url, btn.dataset.name));
    });

    list.querySelectorAll('.attachment-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteAttachment(card, btn.dataset.id));
    });
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const uploadAttachmentFile = async (file) => {
    const card = getEditingCard();
    if (!card || !editingCardContext || !file) return;

    const progress = document.getElementById('attachmentUploadProgress');
    if (progress) {
        progress.classList.remove('hidden');
        progress.textContent = `Uploading ${file.name}...`;
    }

    try {
        const board = getCurrentBoard();
        let url;
        let storagePath = null;

        if (isFirebaseConfigured && getCurrentUser() && storage) {
            storagePath = `attachments/${board.id}/${card.id}/${Date.now()}-${file.name}`;
            const ref = storage.ref(storagePath);
            await ref.put(file);
            url = await ref.getDownloadURL();
        } else {
            if (file.size > 500000) {
                showToast('File too large for guest mode (max 500KB)', 'error');
                return;
            }
            url = await readFileAsDataUrl(file);
        }

        const entry = {
            id: generateId(),
            name: file.name,
            url,
            type: file.type || 'application/octet-stream',
            storagePath,
            addedAt: new Date().toISOString()
        };
        const updated = [...(card.attachments || []), entry];
        await updateCard(board.id, editingCardContext.listId, card.id, { attachments: updated });
        card.attachments = updated;
        renderBoard();
        renderAttachments(card);
        showToast('File attached', 'success');
    } catch (error) {
        console.error('Attachment upload failed:', error);
        showToast('Failed to upload file', 'error');
    } finally {
        if (progress) progress.classList.add('hidden');
    }
};

const deleteAttachment = async (card, attachmentId) => {
    if (!card || !editingCardContext || !attachmentId) return;
    const attachment = (card.attachments || []).find(a => a.id === attachmentId);
    if (!attachment) return;

    try {
        const board = getCurrentBoard();
        if (attachment.storagePath && storage && isFirebaseConfigured) {
            try {
                await storage.ref(attachment.storagePath).delete();
            } catch (error) {
                console.warn('Storage delete failed:', error);
            }
        }
        const updated = (card.attachments || []).filter(a => a.id !== attachmentId);
        await updateCard(board.id, editingCardContext.listId, card.id, { attachments: updated });
        card.attachments = updated;
        renderBoard();
        renderAttachments(card);
        showToast('Attachment removed', 'success');
    } catch (error) {
        console.error('Failed to delete attachment:', error);
        showToast('Failed to delete attachment', 'error');
    }
};

const closeCardModal = () => {
    editingCardContext = null;
    document.getElementById('cardModal').classList.remove('active');
};

const saveCardChanges = async () => {
    const card = getEditingCard();
    if (!card || !editingCardContext) return;

    const title = document.getElementById('cardTitle').value.trim();
    if (!title) {
        showToast('Title cannot be empty', 'error');
        document.getElementById('cardTitle').focus();
        return;
    }

    const updates = {
        title: title,
        description: document.getElementById('cardDescription').value,
        dueDate: document.getElementById('cardDueDate').value || '',
        labels: [...document.querySelectorAll('#labelPicker .label-option.selected')]
            .map(btn => btn.dataset.label),
        assigneeId: document.getElementById('cardAssignee').value || null
    };

    const estVal = document.getElementById('cardInitialEstimate').value;
    updates.initialEstimate = estVal === '' ? 0 : Number(estVal) || 0;

    try {
        const board = getCurrentBoard();
        await updateCard(board.id, editingCardContext.listId, card.id, updates);
        
        // Update local state
        Object.assign(card, updates, { updatedAt: new Date().toISOString() });
        
        renderBoard();
        closeCardModal();
        showToast('Card saved', 'success');
    } catch (error) {
        console.error('Error saving card:', error);
        showToast('Failed to save card', 'error');
    }
};

const duplicateCard = async () => {
    const card = getEditingCard();
    if (!card || !editingCardContext) return;
    const board = getCurrentBoard();
    const list = board?.lists.find(l => l.id === editingCardContext.listId);
    if (!list) return;

    try {
        // Create the duplicate card
        const newCard = await createCard(board.id, list.id, `${card.title} (copy)`, card.description);
        
        // Copy other properties
        const updates = {
            dueDate: card.dueDate,
            labels: [...card.labels],
            initialEstimate: card.initialEstimate,
            checklist: card.checklist ? card.checklist.map(item => ({
                ...item,
                id: generateId()
            })) : [],
            comments: []
        };
        
        await updateCard(board.id, list.id, newCard.id, updates);
        
        // Find the index of the original card and insert after it
        const idx = list.cards.findIndex(c => c.id === card.id);
        if (idx !== -1) {
            const clonedCard = { ...newCard, ...updates };
            list.cards.splice(idx + 1, 0, clonedCard);
        }
        
        renderBoard();
        closeCardModal();
        showToast('Card duplicated!', 'success');
    } catch (error) {
        console.error('Error duplicating card:', error);
        showToast('Failed to duplicate card', 'error');
    }
};

const deleteCard = async () => {
    if (!editingCardContext) return;
    if (!confirm('Delete this card? This cannot be undone.')) return;

    try {
        const board = getCurrentBoard();
        const card = getEditingCard();
        await deleteCardFromStore(board.id, editingCardContext.listId, editingCardContext.cardId);

        const list = board?.lists.find(l => l.id === editingCardContext.listId);
        if (list) {
            list.cards = list.cards.filter(c => c.id !== editingCardContext.cardId);
        }

        if (card) await unlinkBacklogFromCard(card, board);

        renderBoard();
        closeCardModal();
        showToast('Card deleted', 'success');
    } catch (error) {
        console.error('Error deleting card:', error);
        showToast('Failed to delete card', 'error');
    }
};

window.addEventListener('openCardModal', (e) => openCardModal(e.detail));

// ================================
// REMAINING HOURS LOG
// ================================

let cardRemainingChart = null;

const getSpentTimeAuthor = () => {
    const user = getCurrentUser();
    if (user) {
        return {
            userId: user.uid,
            author: user.displayName || user.email || 'User'
        };
    }
    const raw = localStorage.getItem('flowboard-guest-identity');
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed?.email) {
                return {
                    userId: parsed.email,
                    author: parsed.name || parsed.email
                };
            }
        } catch { /* ignore */ }
    }
    const board = getCurrentBoard();
    if (board?.owner) {
        return {
            userId: board.owner.id || board.owner.email || 'guest',
            author: board.owner.name || board.owner.email || 'Guest'
        };
    }
    return { userId: 'guest', author: 'Guest' };
};

const canDeleteSpentEntry = (entry) => {
    const { userId } = getSpentTimeAuthor();
    return !entry.userId || entry.userId === userId;
};

const renderTimeSummaryBar = (card) => {
    const est = Number(card.initialEstimate) || 0;
    const rem = getEffectiveRemainingHours(card);
    const totalSpent = getSpentHours(card);

    const estEl = document.getElementById('tsSummaryEst');
    const spentEl = document.getElementById('tsSummarySpent');
    const remEl = document.getElementById('tsSummaryRemaining');
    const badge = document.getElementById('timeTrackingBadge');
    if (estEl) estEl.textContent = est > 0 ? `${est}h` : '—';
    if (spentEl) {
        spentEl.textContent = `${totalSpent}h`;
        spentEl.classList.toggle('over-budget', est > 0 && totalSpent > est);
    }
    if (remEl) remEl.textContent = rem > 0 ? `${rem}h` : '—';
    if (badge) badge.textContent = rem > 0 ? `${rem}h` : '';
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

        el.querySelector('.rh-delete-btn').addEventListener('click', async () => {
            try {
                const board = getCurrentBoard();
                const updatedLog = card.remainingHoursLog.filter(e => e.id !== entryId);
                await updateCard(board.id, editingCardContext.listId, card.id, {
                    remainingHoursLog: updatedLog
                });
                card.remainingHoursLog = updatedLog;
                renderBoard();
                renderRhLogList(card);
                renderCardRemainingChart(card);
                renderTimeSummaryBar(card);
            } catch (error) {
                console.error('Error deleting remaining hours entry:', error);
                showToast('Failed to delete entry', 'error');
            }
        });

        el.querySelector('.rh-edit-btn').addEventListener('click', () => {
            el.querySelector('.rh-entry-view').classList.add('hidden');
            el.querySelector('.rh-entry-edit').classList.remove('hidden');
        });

        el.querySelector('.rh-cancel-edit-btn').addEventListener('click', () => {
            el.querySelector('.rh-entry-view').classList.remove('hidden');
            el.querySelector('.rh-entry-edit').classList.add('hidden');
        });

        el.querySelector('.rh-save-edit-btn').addEventListener('click', async () => {
            const newHours = parseFloat(el.querySelector('.rh-edit-hours').value);
            const newTs = el.querySelector('.rh-edit-timestamp').value;
            if (isNaN(newHours) || newHours < 0 || !newTs) {
                showToast('Enter valid hours and timestamp', 'error');
                return;
            }
            try {
                const board = getCurrentBoard();
                const updatedLog = card.remainingHoursLog.map(e => 
                    e.id === entryId 
                        ? { ...e, remainingHours: newHours, timestamp: new Date(newTs).toISOString() }
                        : e
                );
                await updateCard(board.id, editingCardContext.listId, card.id, {
                    remainingHoursLog: updatedLog
                });
                card.remainingHoursLog = updatedLog;
                renderBoard();
                renderRhLogList(card);
                renderCardRemainingChart(card);
                renderTimeSummaryBar(card);
            } catch (error) {
                console.error('Error updating remaining hours entry:', error);
                showToast('Failed to update entry', 'error');
            }
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

document.getElementById('rhAddEntryBtn')?.addEventListener('click', async () => {
    const card = getEditingCard();
    if (!card || !editingCardContext) return;
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
    try {
        const board = getCurrentBoard();
        const newEntry = {
            id: generateId(),
            remainingHours: hours,
            timestamp: new Date(tsVal).toISOString()
        };
        const updatedLog = [...(card.remainingHoursLog || []), newEntry];
        await updateCard(board.id, editingCardContext.listId, card.id, {
            remainingHoursLog: updatedLog
        });
        card.remainingHoursLog = updatedLog;
        document.getElementById('rhNewHours').value = '';
        document.getElementById('rhNewTimestamp').value = new Date().toISOString().slice(0, 16);
        renderBoard();
        renderRhLogList(card);
        renderCardRemainingChart(card);
        renderTimeSummaryBar(card);
        showToast('Entry added', 'success');
    } catch (error) {
        console.error('Error adding remaining hours entry:', error);
        showToast('Failed to add entry', 'error');
    }
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
        const deleteBtn = canDeleteSpentEntry(entry) ? `
                    <button class="rh-delete-btn sh-delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>` : '';
        return `
        <div class="rh-entry sh-entry" data-entry-id="${escapeHtml(entry.id)}">
            <div class="rh-entry-view">
                <span class="rh-entry-hours sh-hours">+${entry.spentHours}h</span>
                <span class="rh-entry-date">${dateStr} ${timeStr}</span>
                ${noteHtml}
                <div class="rh-entry-actions">
                    ${deleteBtn}
                </div>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.sh-delete-btn').forEach(btn => {
        const entryId = btn.closest('.sh-entry')?.dataset.entryId;
        btn.addEventListener('click', async () => {
            try {
                const board = getCurrentBoard();
                const updatedLog = (card.spentHoursLog || []).filter(e => e.id !== entryId);
                await updateCard(board.id, editingCardContext.listId, card.id, {
                    spentHoursLog: updatedLog
                });
                card.spentHoursLog = updatedLog;
                renderBoard();
                renderShLogList(card);
                renderTimeSummaryBar(card);
            } catch (error) {
                console.error('Error deleting spent hours entry:', error);
                showToast('Failed to delete entry', 'error');
            }
        });
    });
};

document.getElementById('shAddEntryBtn')?.addEventListener('click', async () => {
    const card = getEditingCard();
    if (!card || !editingCardContext) return;
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
    try {
        const board = getCurrentBoard();
        const { userId } = getSpentTimeAuthor();
        const newEntry = {
            id: generateId(),
            spentHours: hours,
            timestamp: new Date(tsVal).toISOString(),
            note: note || null,
            userId
        };
        const updatedLog = [...(card.spentHoursLog || []), newEntry];
        await updateCard(board.id, editingCardContext.listId, card.id, {
            spentHoursLog: updatedLog
        });
        card.spentHoursLog = updatedLog;
        document.getElementById('shNewHours').value = '';
        document.getElementById('shNewNote').value = '';
        document.getElementById('shNewTimestamp').value = new Date().toISOString().slice(0, 16);
        renderBoard();
        renderTimeSummaryBar(card);
        // If history panel open, refresh it
        if (!document.getElementById('rhHistoryPanel')?.classList.contains('hidden')) {
            renderShLogList(card);
        }
        showToast('Time logged!', 'success');
    } catch (error) {
        console.error('Error adding spent hours entry:', error);
        showToast('Failed to log time', 'error');
    }
});

document.getElementById('closeCardModal')?.addEventListener('click', closeCardModal);
document.getElementById('cancelCardBtn')?.addEventListener('click', closeCardModal);
document.getElementById('saveCardBtn')?.addEventListener('click', saveCardChanges);
document.getElementById('duplicateCardBtn')?.addEventListener('click', duplicateCard);
document.getElementById('deleteCardBtn')?.addEventListener('click', deleteCard);

const buildCardShareUrl = (boardId, cardId, projectId = null) => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('board', boardId);
    url.searchParams.set('card', cardId);
    if (projectId) url.searchParams.set('project', projectId);
    return url.toString();
};

const findCardLocation = (board, cardId) => {
    if (!board?.lists) return null;
    for (const list of board.lists) {
        if ((list.cards || []).some(c => c.id === cardId)) {
            return { boardId: board.id, listId: list.id };
        }
    }
    return null;
};

document.getElementById('copyCardLinkBtn')?.addEventListener('click', async () => {
    const board = getCurrentBoard();
    const card = getEditingCard();
    if (!board || !card) return;
    const link = buildCardShareUrl(board.id, card.id, state.currentProjectId);
    try {
        await navigator.clipboard.writeText(link);
        showToast('Link copied to clipboard', 'success');
    } catch (error) {
        console.error('Clipboard error:', error);
        showToast('Failed to copy link', 'error');
    }
});

document.getElementById('attachmentUploadBtn')?.addEventListener('click', () => {
    document.getElementById('attachmentFileInput')?.click();
});

const handleAttachmentFiles = async (files) => {
    for (const file of files) {
        await uploadAttachmentFile(file);
    }
};

document.getElementById('attachmentFileInput')?.addEventListener('change', async (e) => {
    await handleAttachmentFiles(Array.from(e.target.files || []));
    e.target.value = '';
});

document.getElementById('attachmentLightboxClose')?.addEventListener('click', closeAttachmentLightbox);
document.getElementById('attachmentLightbox')?.addEventListener('click', (e) => {
    if (e.target.id === 'attachmentLightbox') closeAttachmentLightbox();
});

const attachmentsSection = document.getElementById('attachmentsSection');
if (attachmentsSection) {
    let dragDepth = 0;

    attachmentsSection.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragDepth += 1;
        attachmentsSection.classList.add('attachments-drag-over');
    });

    attachmentsSection.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    attachmentsSection.addEventListener('dragleave', () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) attachmentsSection.classList.remove('attachments-drag-over');
    });

    attachmentsSection.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragDepth = 0;
        attachmentsSection.classList.remove('attachments-drag-over');
        if (!document.getElementById('cardModal')?.classList.contains('active')) return;
        await handleAttachmentFiles(Array.from(e.dataTransfer?.files || []));
    });
}

document.getElementById('addChecklistItemBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('newChecklistItem');
    const text = input.value.trim();
    if (!text) return;
    const card = getEditingCard();
    if (!card || !editingCardContext) return;
    if (!card.checklist) card.checklist = [];
    
    const newChecklistItem = { id: generateId(), text, completed: false };
    const updatedChecklist = [...card.checklist, newChecklistItem];
    
    try {
        const board = getCurrentBoard();
        await updateCard(board.id, editingCardContext.listId, card.id, {
            checklist: updatedChecklist
        });
        card.checklist = updatedChecklist;
        input.value = '';
        renderChecklist(card);
    } catch (error) {
        console.error('Error adding checklist item:', error);
        showToast('Failed to add checklist item', 'error');
    }
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

// ================================
// SEARCH
// ================================
const openSearch = () => {
    document.getElementById('searchModal').classList.add('active');
    document.getElementById('searchInput').focus();
    document.getElementById('searchResults').innerHTML =
        '<div class="search-empty">Start typing to search cards...</div>';
};

const closeSearch = () => {
    document.getElementById('searchModal').classList.remove('active');
    document.getElementById('searchInput').value = '';
};

document.getElementById('searchBtn')?.addEventListener('click', openSearch);

const closeTopmostOverlay = () => {
    const pmSidebar = document.getElementById('pmSidebar');
    if (pmSidebar?.classList.contains('open')) {
        document.getElementById('pmSidebarBackdrop')?.classList.remove('active');
        pmSidebar.classList.remove('open');
        return true;
    }
    const mobileNav = document.getElementById('mobileNavOverlay');
    if (mobileNav?.classList.contains('active')) {
        closeMobileNav();
        return true;
    }
    const lightbox = document.getElementById('attachmentLightbox');
    if (lightbox && !lightbox.classList.contains('hidden')) {
        closeAttachmentLightbox();
        return true;
    }
    if (document.getElementById('searchModal')?.classList.contains('active')) {
        closeSearch();
        return true;
    }
    if (document.getElementById('cardModal')?.classList.contains('active')) {
        closeCardModal();
        return true;
    }
    if (document.getElementById('projectInfoModal')?.classList.contains('active')) {
        document.getElementById('projectInfoModal').classList.remove('active');
        return true;
    }
    if (document.getElementById('boardModal')?.classList.contains('active')) {
        document.getElementById('boardModal').classList.remove('active');
        return true;
    }
    if (document.getElementById('sprintEditModal')?.classList.contains('active')) {
        document.getElementById('sprintEditModal').classList.remove('active');
        return true;
    }
    if (document.getElementById('sprintPickerModal')?.classList.contains('active')) {
        document.getElementById('sprintPickerModal').classList.remove('active');
        return true;
    }
    if (document.getElementById('profileModal')?.classList.contains('active')) {
        document.getElementById('profileModal').classList.remove('active');
        return true;
    }
    return false;
};

document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
    }
    if (e.key === 'Escape') {
        closeTopmostOverlay();
    }
});

document.getElementById('searchModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'searchModal') closeSearch();
});

document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const resultsEl = document.getElementById('searchResults');
    if (!query) {
        resultsEl.innerHTML = '<div class="search-empty">Start typing to search cards...</div>';
        return;
    }

    const matches = [];
    state.boards.forEach(board => {
        board.lists.forEach(list => {
            list.cards.forEach(card => {
                if (
                    card.title.toLowerCase().includes(query) ||
                    (card.description || '').toLowerCase().includes(query)
                ) {
                    matches.push({ board, list, card });
                }
            });
        });
    });

    if (!matches.length) {
        resultsEl.innerHTML = '<div class="search-empty">No cards found.</div>';
        return;
    }

    resultsEl.innerHTML = matches.map(({ board, list, card }) => `
        <div class="search-result-item" data-board-id="${board.id}" data-list-id="${list.id}" data-card-id="${card.id}">
            <div class="search-result-icon">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </div>
            <div class="search-result-content">
                <div class="search-result-title">${escapeHtml(card.title)}</div>
                <div class="search-result-meta">${escapeHtml(board.name)} · ${escapeHtml(list.title)}</div>
            </div>
        </div>
    `).join('');

    resultsEl.querySelectorAll('.search-result-item').forEach(el => {
        el.addEventListener('click', () => {
            const { boardId, listId, cardId } = el.dataset;
            closeSearch();
            if (state.currentBoardId !== boardId) {
                state.currentBoardId = boardId;
                saveState();
                renderBoard();
            }
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('openCardModal', { detail: { cardId, listId } }));
            }, 50);
        });
    });
});

window.addEventListener('newUserNoBoards', () => {
    const modal = document.getElementById('boardModal');
    if (modal) {
        modal.classList.add('active');
        const input = document.getElementById('boardName');
        if (input) input.value = generateUniqueProjectName();
    }
});

const populateBoardProjectSelect = (presetProjectId = null) => {
    const select = document.getElementById('boardProjectSelect');
    const modal = document.getElementById('boardModal');
    if (!select) return null;

    if (!state.projects.length) {
        select.innerHTML = '<option value="">No projects available</option>';
        select.disabled = true;
        if (modal) modal.dataset.presetProjectId = '';
        return null;
    }

    select.disabled = false;
    select.innerHTML = state.projects.map(p =>
        `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`
    ).join('');

    const projectId = presetProjectId || state.currentProjectId || state.projects[0].id;
    select.value = projectId;
    if (modal) modal.dataset.presetProjectId = projectId;
    return projectId;
};

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
    populateBoardProjectSelect(presetProjectId);
    document.getElementById('boardModal')?.classList.add('active');
};

document.getElementById('boardProjectSelect')?.addEventListener('change', (e) => {
    const modal = document.getElementById('boardModal');
    if (modal) modal.dataset.presetProjectId = e.target.value;
});

document.getElementById('createProjectBtn')?.addEventListener('click', () => {
    document.getElementById('projectQuickCreate')?.classList.remove('hidden');
    document.getElementById('quickProjectName')?.focus();
});

document.getElementById('quickCancelProjectBtn')?.addEventListener('click', () => {
    document.getElementById('projectQuickCreate')?.classList.add('hidden');
    const input = document.getElementById('quickProjectName');
    if (input) input.value = '';
});

const submitQuickProject = async () => {
    const input = document.getElementById('quickProjectName');
    const name = input?.value.trim();
    if (!name) {
        showToast('Enter a project name', 'error');
        input?.focus();
        return;
    }
    try {
        await createProject({ name });
        if (input) input.value = '';
        document.getElementById('projectQuickCreate')?.classList.add('hidden');
        document.getElementById('projectSelector')?.classList.remove('active');
        renderHeaderProjectList();
        renderBoard();
        showToast(`Project "${name}" created`, 'success');
    } catch (error) {
        console.error('Error creating project:', error);
        showToast('Failed to create project', 'error');
    }
};

document.getElementById('quickCreateProjectBtn')?.addEventListener('click', submitQuickProject);
document.getElementById('quickProjectName')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitQuickProject(); }
    if (e.key === 'Escape') document.getElementById('quickCancelProjectBtn')?.click();
});

document.getElementById('createBoardBtn')?.addEventListener('click', () => {
    if (!state.projects.length) {
        showToast('Create a project first', 'warning');
        document.getElementById('projectSelector')?.classList.remove('active');
        document.getElementById('boardSelector')?.classList.remove('active');
        document.getElementById('projectSelectorBtn')?.click();
        document.getElementById('createProjectBtn')?.click();
        return;
    }
    openBoardModal(state.currentProjectId || state.projects[0]?.id);
    document.getElementById('boardSelector').classList.remove('active');
});

document.getElementById('headerManageProjectsBtn')?.addEventListener('click', () => {
    document.getElementById('projectSelector')?.classList.remove('active');
    const pmScreen = document.getElementById('projectManagementScreen');
    if (pmScreen?.classList.contains('hidden')) {
        document.getElementById('manageProjectsBtn')?.click();
    }
});

window.addEventListener('openBoardModal', (e) => openBoardModal(e.detail?.projectId));

document.getElementById('saveBoardBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('boardName')?.value.trim();
    if (!name) { showToast('Enter a board name', 'error'); return; }

    const modal = document.getElementById('boardModal');
    const projectId = document.getElementById('boardProjectSelect')?.value
        || modal?.dataset.presetProjectId
        || state.currentProjectId
        || null;
    if (!projectId) {
        showToast('Select or create a project first', 'error');
        return;
    }
    const goal = document.getElementById('boardGoal')?.value.trim() || '';
    const startDate = document.getElementById('boardStartDate')?.value || '';
    const endDate = document.getElementById('boardEndDate')?.value || '';
    const background = document.querySelector('#boardModal .color-option.selected')?.dataset.color
        || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    const user = state.projects.find(p => p.id === projectId)?.owner
        || { id: generateId(), name: 'You', email: 'you@example.com', photoURL: null };

    try {
        const boardData = {
            name,
            background,
            goal,
            startDate,
            endDate,
            projectId,
            owner: user,
            members: [],
            history: []
        };

        const board = await createBoard(boardData);

        // Associate board with project
        if (projectId) {
            const project = state.projects.find(p => p.id === projectId);
            if (project) {
                const sprintIds = [...(project.sprintIds || []), board.id];
                const members = [...(project.members || [])];
                const emails = [project.owner?.email, ...members.map(m => m.email)].filter(Boolean);
                if (!emails.includes(user.email)) {
                    members.push({ ...user, role: 'member', addedAt: new Date().toISOString() });
                }
                await updateProject(projectId, {
                    sprintIds,
                    owner: project.owner || user,
                    members
                });
            }
        }

        renderBoard();
        document.getElementById('boardModal').classList.remove('active');
        showToast(`Sprint "${name}" created`, 'success');
    } catch (error) {
        console.error('Error creating board:', error);
        showToast('Failed to create board', 'error');
    }
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

const updateSprintEditDurationPreview = () => {
    const hint = document.getElementById('sprintEditDuration');
    if (!hint) return;
    const start = document.getElementById('sprintEditStart')?.value || '';
    const end = document.getElementById('sprintEditEnd')?.value || '';
    const duration = formatSprintDuration(start, end);
    hint.textContent = duration ? `Sprint duration: ${duration}` : '';
};

// Sprint edit modal (opened from sprint info bar)
document.getElementById('editSprintPropsBtn')?.addEventListener('click', () => {
    const board = getCurrentBoard();
    if (!board) return;
    document.getElementById('sprintEditName').value = board.name || '';
    document.getElementById('sprintEditGoal').value = board.goal || '';
    document.getElementById('sprintEditStart').value = board.startDate || '';
    document.getElementById('sprintEditEnd').value = board.endDate || '';
    updateSprintEditDurationPreview();
    const modal = document.getElementById('sprintEditModal');
    if (modal) { modal.dataset.sprintId = board.id; modal.classList.add('active'); }
});

['sprintEditStart', 'sprintEditEnd'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', updateSprintEditDurationPreview);
});

document.getElementById('saveSprintEditBtn')?.addEventListener('click', async () => {
    const modal = document.getElementById('sprintEditModal');
    const sprintId = modal?.dataset.sprintId;
    const board = sprintId
        ? state.boards.find(b => b.id === sprintId)
        : getCurrentBoard();
    if (!board) return;
    try {
        const updates = {
            name: document.getElementById('sprintEditName').value.trim() || board.name,
            goal: document.getElementById('sprintEditGoal').value.trim(),
            startDate: document.getElementById('sprintEditStart').value,
            endDate: document.getElementById('sprintEditEnd').value
        };
        await updateBoard(board.id, updates);
        renderBoard();
        modal?.classList.remove('active');
        // If inside PM screen, re-render sprints tab
        if (document.querySelector('.pm-tab[data-tab="sprints"].active')) {
            renderProjectManagement();
        }
        showToast('Sprint updated', 'success');
    } catch (error) {
        console.error('Error updating board:', error);
        showToast('Failed to update sprint', 'error');
    }
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

// ================================
// DEEP LINKING (shareable card URLs)
// ================================

export const handleCardDeepLink = () => {
    const params = new URLSearchParams(window.location.search);
    const boardId = params.get('board');
    const cardId = params.get('card');
    if (!boardId && !cardId) return;

    if (boardId) {
        const board = state.boards.find(b => b.id === boardId);
        if (!board) {
            showToast('Board not found or access denied', 'error');
            return;
        }
        state.currentBoardId = boardId;
        const projectParam = params.get('project');
        if (projectParam && state.projects.some(p => p.id === projectParam)) {
            state.currentProjectId = projectParam;
        } else if (board.projectId) {
            state.currentProjectId = board.projectId;
        }
        renderBoard();
    }

    if (!cardId) return;

    const board = getCurrentBoard();
    if (!board) return;

    const location = findCardLocation(board, cardId);
    if (!location) {
        showToast('Card not found', 'error');
        return;
    }

    window.dispatchEvent(new CustomEvent('openCardModal', {
        detail: { cardId, listId: location.listId }
    }));

    const clean = new URL(window.location.href);
    ['board', 'card', 'project'].forEach(key => clean.searchParams.delete(key));
    const query = clean.searchParams.toString();
    window.history.replaceState({}, '', query ? `${clean.pathname}?${query}` : clean.pathname);
};

// ================================
// ONLINE/OFFLINE CONNECTION SYNC
// ================================

window.addEventListener('online', async () => {
    showToast('You are back online. Syncing data...', 'info');
    const user = getCurrentUser();
    if (user) {
        try {
            await loadState();
            renderBoard();
            showToast('Cloud sync complete!', 'success');
        } catch (error) {
            console.error('Failed to sync on reconnect:', error);
        }
    }
});

window.addEventListener('offline', () => {
    showToast('Working offline. Changes will save locally.', 'warning');
});
