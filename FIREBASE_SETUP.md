# Firebase Setup Guide for Scrum71

## ✅ Firebase is Configured for Project: scrum71

This project is configured with Firebase using the **scrum71** project.

### Current Configuration

| Setting | Value |
|---------|-------|
| **Project ID** | `scrum71` |
| **Auth Domain** | `scrum71.firebaseapp.com` |
| **App ID** | `1:744464444206:web:77995ba24fce2e57a228bf` |

### Enabled Features

- ✅ **Email/Password Authentication** - Sign in with email and password
- ✅ **Google Sign-In** - One-click Google authentication
- ✅ **Firestore Database** - Real-time data sync in production mode
- ✅ **Authorized Domains** - `nayeem-ahmad.github.io` is whitelisted for GitHub Pages

---

## Running Locally

Just open `index.html` in your browser or start a local server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node (if http-server is installed)
npx http-server -p 8080
```

Then navigate to `http://localhost:8080`

---

## Deploying to GitHub Pages

The app is already configured for GitHub Pages deployment at:
`https://nayeem-ahmad.github.io/scrum71/`

Just push your changes to the repository and GitHub Pages will automatically deploy.

---

## Firebase CLI Commands

```bash
# View current project
firebase projects:list

# Switch to scrum71
firebase use scrum71

# Deploy Firestore rules
firebase deploy --only firestore:rules --project scrum71
```

---

## Firestore Security Rules

The current rules (`firestore.rules`) ensure each user can only access their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
