import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

function initAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  // 1. Check for local service account JSON file
  const localKeyPath = path.resolve(process.cwd(), 'site-compiler-firebase-adminsdk-fbsvc-11ba6db54e.json');
  
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf-8'));
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: 'site-compiler',
      });
    } catch (err) {
      console.error('[Firebase Admin] Error parsing service account JSON file:', err);
    }
  }

  // 2. Check for environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: 'site-compiler',
      });
    } catch (err) {
      console.error('[Firebase Admin] Error parsing FIREBASE_SERVICE_ACCOUNT_KEY env var:', err);
    }
  }

  // 3. Fallback to default credentials (will fail Firestore reads without service account)
  console.warn(
    '[Firebase Admin] No service account found. Set FIREBASE_SERVICE_ACCOUNT_KEY env var or place the JSON file in project root. Firestore operations will fail.'
  );
  return initializeApp({
    projectId: 'site-compiler',
  });
}

export const adminApp = initAdmin();
export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
