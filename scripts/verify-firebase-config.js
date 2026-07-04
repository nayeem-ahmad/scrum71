#!/usr/bin/env node
/**
 * Verifies Firebase configuration in src/js/config.js.
 * Run: npm run verify:firebase
 */
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'src', 'js', 'config.js');
const source = fs.readFileSync(configPath, 'utf8');

const fields = [
  { key: 'apiKey', pattern: /apiKey:\s*"([^"]+)"/ },
  { key: 'authDomain', pattern: /authDomain:\s*"([^"]+)"/ },
  { key: 'projectId', pattern: /projectId:\s*"([^"]+)"/ },
  { key: 'appId', pattern: /appId:\s*"([^"]+)"/ },
];

const placeholders = new Set(['YOUR_API_KEY', 'your-api-key', '']);

let ok = true;
const values = {};

for (const { key, pattern } of fields) {
  const match = source.match(pattern);
  if (!match || placeholders.has(match[1])) {
    console.error(`✗ ${key}: missing or placeholder`);
    ok = false;
  } else {
    values[key] = match[1];
    console.log(`✓ ${key}: ${match[1]}`);
  }
}

if (!ok) {
  console.error('\nFirebase config is incomplete. See FIREBASE_SETUP.md');
  process.exit(1);
}

if (values.projectId !== 'scrum71') {
  console.warn(`⚠ projectId is "${values.projectId}" (expected scrum71 for this repo)`);
}

console.log('\nFirebase config looks valid.');
console.log(`Project: ${values.projectId}`);
console.log(`Auth domain: ${values.authDomain}`);