import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getDatabase, Database } from "firebase-admin/database";
import { getStorage, Storage } from "firebase-admin/storage";

let _adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (_adminApp) return _adminApp;
  const existingApps = getApps();
  if (existingApps.length > 0) {
    _adminApp = existingApps[0];
    return _adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, "\n");
      _adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
        storageBucket:
          process.env.FIREBASE_ADMIN_STORAGE_BUCKET ||
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          "gaurav-portfolio-improved.firebasestorage.app",
      });
      return _adminApp;
    } catch (err) {
      console.warn("Firebase Admin App Init Note:", err);
      return null;
    }
  }

  return null;
}

let _adminFirestore: Firestore | null = null;

export function getAdminFirestore(): Firestore | null {
  if (_adminFirestore) return _adminFirestore;
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // ignore if already configured
  }
  _adminFirestore = db;
  return _adminFirestore;
}

export function getAdminDb(): Database | null {
  const app = getAdminApp();
  return app ? getDatabase(app) : null;
}

let _adminStorage: Storage | null = null;

export function getAdminStorage(): Storage | null {
  if (_adminStorage) return _adminStorage;
  const app = getAdminApp();
  if (!app) return null;
  _adminStorage = getStorage(app);
  return _adminStorage;
}
