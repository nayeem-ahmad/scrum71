import { auth, isFirebaseConfigured, db } from './config.js';
import { showToast } from './utils.js';
import { state, loadState, setCurrentUser, getCurrentBoard, initializeSampleData, saveState, getUserProfile, saveUserProfile, getCurrentUser } from './store.js';
import { renderBoard } from './board.js'; // We will create this next
import { generateUniqueProjectName } from './utils.js';

// DOM Elements for Auth
const loadingScreen = document.getElementById('loadingScreen');
const authScreen = document.getElementById('authScreen');
const headerElement = document.querySelector('.header');
const boardContainer = document.querySelector('.board-container');
const userAvatar = document.querySelector('.user-avatar');
const userMenu = document.getElementById('userMenu');

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const resetForm = document.getElementById('resetForm');

const AUTH_ERROR_MESSAGES = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed before completing.',
    'auth/popup-blocked': 'Popup was blocked. Allow popups for this site and try again.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

const getAuthErrorMessage = (error) => {
    if (!error) return 'Something went wrong. Please try again.';
    if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
        return AUTH_ERROR_MESSAGES[error.code];
    }
    return error.message || 'Something went wrong. Please try again.';
};

// Helper function for form loading state
const setFormLoading = (form, loading) => {
    const btn = form.querySelector('.btn-block');
    if (!btn) return;
    if (loading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
};

// Update UI for authenticated user
export const updateUserUI = (user) => {
    const avatarEl = document.querySelector('.user-avatar');
    const menuAvatarEl = document.getElementById('userMenuAvatar');
    const menuNameEl = document.getElementById('userMenuName');
    const menuEmailEl = document.getElementById('userMenuEmail');

    if (user) {
        const displayName = user.displayName || 'User';
        const email = user.email || '';
        const photoURL = user.photoURL;
        const initial = displayName.charAt(0).toUpperCase();

        if (photoURL) {
            if (avatarEl) avatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}">`;
            if (menuAvatarEl) menuAvatarEl.innerHTML = `<img src="${photoURL}" alt="${displayName}">`;
        } else {
            if (avatarEl) avatarEl.innerHTML = `<span>${initial}</span>`;
            if (menuAvatarEl) menuAvatarEl.innerHTML = `<span>${initial}</span>`;
        }

        if (menuNameEl) menuNameEl.textContent = displayName;
        if (menuEmailEl) menuEmailEl.textContent = email;
    } else {
        if (avatarEl) avatarEl.innerHTML = '<span>U</span>';
    }
};

export const initAuth = () => {
    console.log('initAuth started');
    const safetyTimeout = setTimeout(() => {
        console.warn('Safety timeout triggered');
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            console.warn('Auth initialization timed out - forcing UI');
            loadingScreen.classList.add('hidden');
            document.getElementById('authScreen').classList.remove('hidden');
            showToast('Connection timed out. Please check your internet or try again.', 'warning');
        }
    }, 10000);

    if (isFirebaseConfigured) {
        console.log('Firebase is configured, setting up auth listener');
        auth.onAuthStateChanged(async (user) => {
            console.log('AuthStateChanged fired', user ? 'User logged in' : 'No user');
            clearTimeout(safetyTimeout);
            setCurrentUser(user);

            if (user) {
                updateUserUI(user);

                try {
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Data load timeout')), 5000)
                    );
                    await Promise.race([loadState(), timeoutPromise]);
                } catch (error) {
                    console.error('Data loading issue:', error);
                }

                // Show main app
                loadingScreen.classList.add('hidden');
                authScreen.classList.add('hidden');
                headerElement.classList.remove('hidden');
                boardContainer.classList.remove('hidden');

                // Render
                import('./app.js').then(module => {
                    const { initTheme, handleCardDeepLink } = module;
                    if (initTheme) initTheme();
                    renderBoard();
                    if (handleCardDeepLink) handleCardDeepLink();
                });

                if (state.boards.length === 0) {
                    // New user handling
                    // We need to access boardModal but it's in app.js or board.js logic.
                    // Ideally we trigger an event or call a shared function.
                    // For now let's dispatch a custom event
                    window.dispatchEvent(new CustomEvent('newUserNoBoards'));
                }

                // Helper to trigger invite link handling
                window.dispatchEvent(new CustomEvent('checkInviteLink'));
            } else {
                loadingScreen.classList.add('hidden');
                authScreen.classList.remove('hidden');
                headerElement.classList.add('hidden');
                boardContainer.classList.add('hidden');
                document.getElementById('burndownPanel')?.classList.add('hidden');
            }
        });
    } else {
        clearTimeout(safetyTimeout);
        loadingScreen.classList.add('hidden');
        authScreen.classList.add('hidden');
        headerElement.classList.remove('hidden');
        boardContainer.classList.remove('hidden');

        loadState();
        import('./app.js').then(module => {
            const { initTheme, handleCardDeepLink } = module;
            if (initTheme) initTheme();
            renderBoard();
            if (handleCardDeepLink) handleCardDeepLink();
            window.dispatchEvent(new CustomEvent('checkInviteLink'));
        });
    }

    setupAuthListeners();
    setupProfileListeners();
};

const setupProfileListeners = () => {
    const profileBtn = document.getElementById('profileBtn');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const userMenu = document.getElementById('userMenu');

    // Toggle User Menu
    const userAvatar = document.querySelector('.user-avatar');
    userAvatar?.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (userMenu && !userMenu.contains(e.target) && !userAvatar.contains(e.target)) {
            userMenu.classList.remove('active');
        }
    });

    // Open Profile Modal
    profileBtn?.addEventListener('click', async () => {
        userMenu.classList.remove('active');
        const user = getCurrentUser();
        if (!user) return;

        profileModal.classList.add('active');

        // Populate fields
        document.getElementById('profileName').value = user.displayName || '';
        document.getElementById('profilePhotoURL').value = user.photoURL || '';
        document.getElementById('profileModalAvatar').innerHTML = user.photoURL ?
            `<img src="${user.photoURL}" alt="${user.displayName}">` :
            (user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U');

        // Fetch extended details
        const profile = await getUserProfile(user.uid);
        if (profile) {
            document.getElementById('profileMobile').value = profile.mobile || '';
            document.getElementById('profileDetails').value = profile.details || '';
        } else {
            document.getElementById('profileMobile').value = '';
            document.getElementById('profileDetails').value = '';
        }
    });

    // Close Modal
    const closeModal = () => profileModal.classList.remove('active');
    closeProfileModal?.addEventListener('click', closeModal);
    cancelProfileBtn?.addEventListener('click', closeModal);

    // Save Profile
    saveProfileBtn?.addEventListener('click', async () => {
        const user = getCurrentUser();
        if (!user) return;

        const name = document.getElementById('profileName').value;
        const photoURL = document.getElementById('profilePhotoURL').value;
        const mobile = document.getElementById('profileMobile').value;
        const details = document.getElementById('profileDetails').value;

        const btn = document.getElementById('saveProfileBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';
        btn.disabled = true;

        try {
            // Update Auth Profile
            await user.updateProfile({
                displayName: name,
                photoURL: photoURL || null
            });

            // Update Firestore Profile
            await saveUserProfile(user.uid, {
                mobile,
                details
            });

            updateUserUI(user);
            showToast('Profile updated successfully', 'success');
            closeModal();
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast('Failed to save profile', 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
};

const showAuthForm = (formId) => {
    ['loginForm', 'registerForm', 'resetForm'].forEach(id => {
        document.getElementById(id)?.classList.toggle('hidden', id !== formId);
    });
};

const setupAuthListeners = () => {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (target === 'login') showAuthForm('loginForm');
            if (target === 'register') showAuthForm('registerForm');
        });
    });

    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        showAuthForm('resetForm');
    });

    document.getElementById('backToLoginLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
        showAuthForm('loginForm');
    });

    // Login
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isFirebaseConfigured) {
            showToast('Firebase not configured.', 'error');
            return;
        }

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        setFormLoading(loginForm, true);

        try {
            await auth.signInWithEmailAndPassword(email, password);
            showToast('Welcome back!', 'success');
        } catch (error) {
            console.error('Login error:', error);
            showToast(getAuthErrorMessage(error), 'error');
        } finally {
            setFormLoading(loginForm, false);
        }
    });

    // Register
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isFirebaseConfigured) return;

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        setFormLoading(registerForm, true);

        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName: name });
            showToast('Account created successfully!', 'success');
        } catch (error) {
            console.error('Registration error:', error);
            showToast(getAuthErrorMessage(error), 'error');
        } finally {
            setFormLoading(registerForm, false);
        }
    });

    // Reset
    resetForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isFirebaseConfigured) return;
        const email = document.getElementById('resetEmail').value;
        setFormLoading(resetForm, true);
        try {
            await auth.sendPasswordResetEmail(email);
            showToast('Password reset email sent!', 'success');
            document.getElementById('backToLoginLink').click();
        } catch (error) {
            showToast(getAuthErrorMessage(error), 'error');
        } finally {
            setFormLoading(resetForm, false);
        }
    });

    // Google
    document.getElementById('googleSignIn')?.addEventListener('click', async () => {
        if (!isFirebaseConfigured) return;
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            showToast('Signed in with Google!', 'success');
        } catch (error) {
            console.error(error);
            showToast(getAuthErrorMessage(error), 'error');
        }
    });

    // GitHub
    document.getElementById('githubSignIn')?.addEventListener('click', async () => {
        if (!isFirebaseConfigured) return;
        try {
            const provider = new firebase.auth.GithubAuthProvider();
            await auth.signInWithPopup(provider);
            showToast('Signed in with GitHub!', 'success');
        } catch (error) {
            console.error(error);
            showToast(getAuthErrorMessage(error), 'error');
        }
    });

    // Sign Out
    document.getElementById('signOutBtn')?.addEventListener('click', async () => {
        if (isFirebaseConfigured) {
            try {
                await auth.signOut();
                showToast('Signed out successfully', 'info');
            } catch (error) {
                console.error(error);
            }
        }
        userMenu.classList.remove('active');
    });
};
