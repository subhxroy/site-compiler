import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, inMemoryPersistence, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDNiWJk2XFi0Q5IKv_1QLlyoMeYI8k9EEs",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "site-compiler.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "site-compiler",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "site-compiler.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "160987480027",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:160987480027:web:079416ca098a8354fd31fe",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QWV5FN49V9"
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 5);

let app: FirebaseApp | undefined;
let auth: Auth | null = null;

if (firebaseConfig.apiKey) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (err) {
    console.warn('[Firebase Config] Auth initialization warning:', (err as Error)?.message || err);
  }
}

if (auth && typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    if (auth) setPersistence(auth, inMemoryPersistence).catch(() => {});
  });
}

export { app, auth };
export const googleProvider = new GoogleAuthProvider();
export default app;
