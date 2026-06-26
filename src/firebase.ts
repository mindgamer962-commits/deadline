import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";

// Configured values from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyC6FGiy8-zopDxpYvZ6OGLwdFYEzHgvU4o",
  authDomain: "propmtwars-electiq.firebaseapp.com",
  projectId: "propmtwars-electiq",
  storageBucket: "propmtwars-electiq.firebasestorage.app",
  messagingSenderId: "946861827171",
  appId: "1:946861827171:web:525a6eb2acc5f912000456",
};

// Custom Database ID
const databaseId = "ai-studio-9d98e3e1-2cda-45b4-a9ab-43a65e94ebc0";

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);

// Use custom databaseId for Firestore initialization
let db;
try {
  db = getFirestore(app, databaseId);
} catch (e) {
  console.warn("Fell back to standard standard firestore initializer:", e);
  db = getFirestore(app);
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
