import { getApps, getApp, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getDatabase, Database } from "firebase-admin/database";

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

let adminApp: App;

if (getApps().length === 0) {
  try {
    if (projectId && clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        databaseURL,
      });
    } else {
      adminApp = initializeApp({ projectId, databaseURL });
    }
  } catch {
    adminApp = initializeApp({ projectId, databaseURL }, "admin-fallback");
  }
} else {
  adminApp = getApp();
}

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Database = getDatabase(adminApp);
export { adminApp };
