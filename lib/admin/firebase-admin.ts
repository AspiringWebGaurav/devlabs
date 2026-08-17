import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getDatabase, Database } from "firebase-admin/database";

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Database | null = null;

export function isFirebaseAdminConfigured(): boolean {
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  return !!(privateKey && privateKey.trim() && clientEmail && clientEmail.trim());
}

function getInitializedAdminApp(): App | null {
  if (_adminApp) return _adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    _adminApp = existingApps[0];
    return _adminApp;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "portfolio-admin";
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    "admin@portfolio-admin.iam.gserviceaccount.com";
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || "";

  // Fix multiline escaped private keys and surrounding quotes
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n").replace(/\\r/g, "");
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
  }

  const databaseURL =
    process.env.FIREBASE_DATABASE_URL ||
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    "https://portfolio-admin-default-rtdb.firebaseio.com";

  try {
    if (projectId && clientEmail && privateKey) {
      _adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });
      return _adminApp;
    }
  } catch (err) {
    console.warn("Firebase Admin SDK cert initialization warning:", err);
  }

  try {
    const appsAfterAttempt = getApps();
    if (appsAfterAttempt.length > 0) {
      _adminApp = appsAfterAttempt[0];
      return _adminApp;
    }
    _adminApp = initializeApp({ projectId, databaseURL });
    return _adminApp;
  } catch (err) {
    console.warn("Firebase Admin SDK fallback initialization warning:", err);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    if (!_adminAuth) {
      const app = getInitializedAdminApp();
      if (!app) return null;
      _adminAuth = getAuth(app);
    }
    return _adminAuth;
  } catch (err) {
    console.warn("Firebase Admin Auth init note:", err);
    return null;
  }
}

export function getAdminDb(): Database | null {
  try {
    if (!_adminDb) {
      const app = getInitializedAdminApp();
      if (!app) return null;
      _adminDb = getDatabase(app);
    }
    return _adminDb;
  } catch (err) {
    console.warn("Firebase Admin DB init note:", err);
    return null;
  }
}

// Lazy Proxies so module imports during build static collection never trigger background OAuth requests
export const adminDb = new Proxy({} as Database, {
  get(_target, prop) {
    const db = getAdminDb();
    if (!db) {
      // Return safe no-op functions if Admin SDK is unconfigured
      if (prop === "ref") {
        return () => ({
          set: async () => {},
          once: async () => ({ exists: () => false, val: () => null }),
          remove: async () => {},
        });
      }
      return undefined;
    }
    const val = (db as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return val.bind(db);
    }
    return val;
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth();
    if (!auth) {
      return undefined;
    }
    const val = (auth as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return val.bind(auth);
    }
    return val;
  },
});
