import * as admin from "firebase-admin";

let _adminApp: admin.app.App | null = null;

export function getAdminApp(): admin.app.App | null {
  if (_adminApp) return _adminApp;
  if (admin.apps.length > 0) {
    _adminApp = admin.apps[0];
    return _adminApp;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, "\n");
      _adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL,
      });
      return _adminApp;
    } catch (err) {
      console.warn("Firebase Admin App Init Note:", err);
      return null;
    }
  }

  return null;
}

export function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getAdminApp();
  return app ? app.firestore() : null;
}

export function getAdminDb(): admin.database.Database | null {
  const app = getAdminApp();
  return app ? app.database() : null;
}
