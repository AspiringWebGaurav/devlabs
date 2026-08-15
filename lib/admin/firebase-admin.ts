import { getApps, getApp, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getDatabase, Database } from "firebase-admin/database";

let _adminApp: App | null = null;
let _adminAuth: Auth | null = null;
let _adminDb: Database | null = null;

function getInitializedAdminApp(): App {
  if (_adminApp) return _adminApp;
  if (getApps().length > 0) {
    _adminApp = getApp();
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

  // Fix multiline escaped private keys
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
  }

  const databaseURL =
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
    } else {
      _adminApp = initializeApp({ projectId, databaseURL });
    }
  } catch {
    _adminApp = initializeApp({ projectId, databaseURL }, "admin-fallback");
  }

  return _adminApp;
}

export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getInitializedAdminApp());
  }
  return _adminAuth;
}

export function getAdminDb(): Database {
  if (!_adminDb) {
    _adminDb = getDatabase(getInitializedAdminApp());
  }
  return _adminDb;
}

// Lazy Proxies so module imports during build static collection never trigger background OAuth requests
export const adminDb = new Proxy({} as Database, {
  get(_target, prop) {
    const db = getAdminDb();
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
    const val = (auth as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return val.bind(auth);
    }
    return val;
  },
});
