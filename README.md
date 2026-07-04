# Flowboard Kanban (Scrum71)

A vanilla JavaScript Kanban board for agile teams — projects, sprints, backlog, drag-and-drop cards, time tracking, burndown charts, and Firebase-backed collaboration.

## Quick start

```bash
# Install dev dependencies (Playwright)
npm install

# Serve the app locally (port 7890 matches Playwright config)
python3 -m http.server 7890
```

Open [http://localhost:7890](http://localhost:7890). The app works in **guest mode** without Firebase; sign in to sync data to the cloud.

## Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run Playwright end-to-end tests (desktop + mobile viewports) |
| `npm run test:headed` | Run tests in a visible browser |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run verify:firebase` | Validate Firebase config and connectivity |

Run tests in CI mode (headless, single worker):

```bash
CI=true npm test
```

## Firebase

This project uses Firebase project **`scrum71`** for Auth and Firestore. See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for configuration, deployment, and GitHub Pages setup.

Deploy Firestore and Storage security rules:

```bash
firebase deploy --only firestore:rules,storage --project scrum71
```

## Project structure

```
index.html          # SPA shell and modals
src/js/
  app.js            # Card modal, theme, selectors
  auth.js           # Authentication flows
  board.js          # Board rendering, drag-and-drop
  project.js        # Project management, backlog, team
  store.js          # State, Firestore persistence
tests/              # Playwright specs by story
docs/               # PRD, architecture, user stories
```

## Documentation

- [Product requirements](docs/prd/index.md)
- [Architecture](docs/architecture/index.md)
- [Implementation status](README_STATUS.md)
- [Prioritized backlog](todo.md)

## License

ISC