// ================================
// UTILITY FUNCTIONS
// ================================
export const generateId = () => Math.random().toString(36).substring(2, 15);

export const generateUniqueProjectName = () => {
    const adjectives = ['Alpha', 'Beta', 'Cosmic', 'Delta', 'Echo', 'Flow', 'Gamma', 'Hyper', 'Ionic', 'Lunar', 'Neon', 'Omega', 'Prime', 'Rapid', 'Solar', 'Terra', 'Ultra', 'Velocity', 'Zenith'];
    const nouns = ['Board', 'Core', 'Deck', 'Grid', 'Hub', 'Lab', 'Matrix', 'Nexus', 'Orbit', 'Pad', 'Project', 'Space', 'Sphere', 'Station', 'Stream', 'System', 'Vault', 'Zone'];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 99) + 1;

    return `${adj} ${noun} ${num}`;
};

// Toast Notifications
export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 4L12 14.01l-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        error: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
        warning: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" stroke-width="2"/><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
        info: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    };

    toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none">${icons[type]}</svg>
        <span class="toast-message">${message}</span>
        <button class="toast-close"><svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
    `;

    container.appendChild(toast);
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) closeBtn.onclick = () => removeToast(toast);
    setTimeout(() => removeToast(toast), 4000);
};

export const removeToast = (toast) => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
};

// ================================
// REMAINING HOURS LOG HELPERS
// ================================

/**
 * Returns the effective remaining hours for a card at a given time.
 * Takes the latest log entry with timestamp <= atTime.
 * If atTime is omitted, uses the current time.
 */
export const getEffectiveRemainingHours = (card, atTime) => {
    const log = Array.isArray(card.remainingHoursLog) ? card.remainingHoursLog : [];
    if (!log.length) return 0;
    const t = atTime instanceof Date ? atTime : (atTime ? new Date(atTime) : new Date());
    const eligible = log.filter(e => new Date(e.timestamp) <= t);
    if (!eligible.length) return 0;
    eligible.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return eligible[0].remainingHours;
};

export const getDragAfterElement = (container, y) => {
    const elements = [...container.querySelectorAll('.card:not(.dragging)')];

    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
};
