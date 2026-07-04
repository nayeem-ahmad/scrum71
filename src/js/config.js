// Firebase configuration for Scrum71 (using scrum71 project)
const firebaseConfig = {
    apiKey: "AIzaSyAeW96tQLnWeqah7NO8zGOHlfi31nDHOQw",
    authDomain: "scrum71.firebaseapp.com",
    projectId: "scrum71",
    storageBucket: "scrum71.firebasestorage.app",
    messagingSenderId: "744464444206",
    appId: "1:744464444206:web:77995ba24fce2e57a228bf",
    measurementId: "G-KJF2BWTCWL"
};

// Initialize Firebase
let auth, db, storage;
let isFirebaseConfigured = false;

try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Enable Firestore offline persistence
        db.enablePersistence().catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open.');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence failed: Browser not supported.');
            } else {
                console.warn('Firestore persistence failed:', err);
            }
        });

        if (typeof firebase.storage !== 'undefined') {
            storage = firebase.storage();
        }
        isFirebaseConfigured = true;
    } else {
        if (typeof firebase === 'undefined') {
            console.warn('⚠️ Firebase SDK not loaded.');
        } else {
            console.warn('⚠️ Firebase not configured. Using localStorage fallback.');
            console.info('To enable cloud sync and authentication, replace the firebaseConfig in app.js with your Firebase project credentials.');
        }
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}

export { auth, db, storage, isFirebaseConfigured };
