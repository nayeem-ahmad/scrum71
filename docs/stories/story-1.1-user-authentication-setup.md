# Story 1.1: User Authentication Setup

## Status
✅ **Implemented** (June 11, 2026)

## Implementation Details
- **Files**: `src/js/auth.js`, `src/js/config.js`, `index.html`
- Email/password login and registration with profile display name
- Google and GitHub OAuth popup flows
- Password reset email flow
- Auth state listener with loading screen and 10s safety timeout
- User-friendly Firebase error messages (`getAuthErrorMessage`)
- Auth tab switching (login / register / reset)
- Playwright coverage: `tests/story-1.1-auth-ui.spec.js`

## Story
**As a** user,  
**I want** to register and sign in with email/password or social providers,  
**so that** I can access my personal boards securely.

## Acceptance Criteria
1. Registration form accepts email, password, and display name
2. Login form accepts email and password
3. Google OAuth sign-in button initiates popup flow
4. GitHub OAuth sign-in button initiates popup flow
5. Password reset sends email with reset link
6. Auth state persists across browser sessions
7. Loading screen displays during auth check
8. Error messages display for invalid credentials

## Tasks / Subtasks

- [x] Task 1: Firebase Auth Configuration (AC: 1, 2, 3, 4)
  - [x] Configure Firebase project with Authentication enabled
  - [x] Enable Email/Password provider
  - [x] Enable Google OAuth provider
  - [x] Enable GitHub OAuth provider (requires GitHub App setup)
  - [x] Export `auth` and `isFirebaseConfigured` from `config.js`

- [x] Task 2: Create Auth Module Structure (AC: 1-8)
  - [x] Create `src/js/auth.js` module
  - [x] Import Firebase auth, store, and utils modules
  - [x] Export `initAuth()` function
  - [x] Export `updateUserUI()` function

- [x] Task 3: Implement Login Flow (AC: 2, 8)
  - [x] Create login form submit handler
  - [x] Call `auth.signInWithEmailAndPassword(email, password)`
  - [x] Handle auth errors with specific user-friendly messages
  - [x] Show loading state on button during submission

- [x] Task 4: Implement Registration Flow (AC: 1)
  - [x] Create register form submit handler  
  - [x] Call `auth.createUserWithEmailAndPassword(email, password)`
  - [x] Call `user.updateProfile({ displayName: name })` after creation
  - [x] Handle validation errors (weak password, email in use)

- [x] Task 5: Implement Google OAuth (AC: 3)
  - [x] Create Google sign-in button click handler
  - [x] Create `GoogleAuthProvider` instance
  - [x] Call `auth.signInWithPopup(provider)`
  - [x] Handle popup blocked scenario

- [x] Task 6: Implement GitHub OAuth (AC: 4)
  - [x] Create GitHub sign-in button click handler
  - [x] Create `GithubAuthProvider` instance
  - [x] Call `auth.signInWithPopup(provider)`
  - [x] Handle popup blocked scenario

- [x] Task 7: Implement Password Reset (AC: 5)
  - [x] Create reset form submit handler
  - [x] Call `auth.sendPasswordResetEmail(email)`
  - [x] Show success toast and redirect to login

- [x] Task 8: Implement Auth State Listener (AC: 6, 7)
  - [x] Call `auth.onAuthStateChanged(callback)` in `initAuth()`
  - [x] On authenticated: hide loading/auth screens, show header/board
  - [x] On unauthenticated: show auth screen, hide main app
  - [x] Implement safety timeout (10s) for network issues

- [x] Task 9: Loading Screen During Auth Check (AC: 7)
  - [x] Show loading screen by default on page load
  - [x] Hide loading screen once auth state is determined
  - [x] Handle timeout gracefully with user feedback

- [ ] Task 10: Enhanced Error Messaging (AC: 8)
  - [ ] Map Firebase error codes to user-friendly messages
  - [ ] Display inline validation errors on forms
  - [ ] Implement error handling per architecture patterns

- [ ] Task 11: Manual Testing
  - [ ] Test email/password registration
  - [ ] Test email/password login
  - [ ] Test Google OAuth login
  - [ ] Test GitHub OAuth login
  - [ ] Test password reset flow
  - [ ] Test session persistence across refresh
  - [ ] Test logout clears state

## Dev Notes

### Current Implementation Status
**This is a brownfield story** - significant implementation already exists in `src/js/auth.js` (346 lines). The existing code covers most acceptance criteria. This story should focus on:
1. Reviewing existing implementation for completeness
2. Enhancing error messaging (Task 10 - incomplete)
3. Ensuring all AC are fully met

### File Locations
- **Auth Module:** `src/js/auth.js` - Main authentication logic [Source: architecture/project-structure.md]
- **Config Module:** `src/js/config.js` - Firebase configuration and auth export [Source: architecture/project-structure.md]
- **Store Module:** `src/js/store.js` - User state management [Source: architecture/components.md#state-management-module]
- **Utils Module:** `src/js/utils.js` - `showToast()` function [Source: architecture/components.md#utilities-module]

### Data Models
- **User Model** [Source: architecture/data-models.md#user]:
  - `uid`: string - Firebase Auth unique identifier
  - `email`: string - User's email address
  - `displayName`: string - User's display name
  - `photoURL`: string (optional) - Profile picture URL
  - `createdAt`: timestamp - Account creation date

### Auth Module Interface [Source: architecture/components.md#authentication-module]
- `initAuth()` - Initialize auth state listener
- `signIn(email, password)` - Email/password login (inline in form handler)
- `signUp(email, password, name)` - Registration (inline in form handler)
- `signInWithGoogle()` - OAuth popup flow
- `signInWithGitHub()` - OAuth popup flow
- `signOut()` - Logout user
- `resetPassword(email)` - Password reset email

### Firebase Auth API [Source: architecture/external-apis.md#firebase-authentication-api]
**Key Methods:**
- `createUserWithEmailAndPassword(email, password)`
- `signInWithEmailAndPassword(email, password)`
- `signInWithPopup(provider)` - Google/GitHub
- `signOut()`
- `sendPasswordResetEmail(email)`
- `onAuthStateChanged(callback)`

**Rate Limits:** 100 accounts/IP/hour (free tier)

### Error Handling Patterns [Source: architecture/error-handling-strategy.md]
```javascript
// Auth error handling pattern
auth.onAuthStateChanged((user) => {
    if (!user) {
        // Session expired or logged out
        clearLocalState();
        showAuthScreen();
    }
});
```

**Auth Error Scenarios:**
- Invalid credentials → Show specific error message
- OAuth popup blocked → Offer alternatives
- Session expired → Redirect to login

### User Authentication Flow [Source: architecture/core-workflows.md#user-authentication-flow]
1. User enters credentials
2. Submit login form
3. `auth.signInWithEmailAndPassword()` called
4. Firebase Auth returns user credential
5. `setCurrentUser(user)` in store
6. Load user data from Firestore
7. Show board view

### Input Validation [Source: architecture/input-validation.md]
- Email: Valid email format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Password: Firebase enforces minimum 6 characters

## Testing

### Testing Standards [Source: architecture/testing-strategy.md]
- **Test Level:** Manual testing for authentication flows
- **Test Location:** No automated tests yet (future: Vitest)
- **Coverage:** All 7 authentication scenarios in manual checklist

### Manual Testing Checklist [Source: architecture/testing-strategy.md#manual-testing-checklist]
- [ ] Email/password registration
- [ ] Email/password login
- [ ] Google OAuth login
- [ ] GitHub OAuth login
- [ ] Password reset flow
- [ ] Session persistence across refresh
- [ ] Logout clears state

## Change Log
| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-01-09 | 1.0.0 | Initial story draft | BMad Master |

---

## Dev Agent Record

### Agent Model Used
_To be filled by Dev Agent_

### Debug Log References
_To be filled by Dev Agent_

### Completion Notes List
_To be filled by Dev Agent_

### File List
_To be filled by Dev Agent_

---

## QA Results
_To be filled by QA Agent_
