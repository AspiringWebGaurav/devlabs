import { getApps, getApp, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || "gaurav-portfolio-improved";
const clientEmail =
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
  "firebase-adminsdk-fbsvc@gaurav-portfolio-improved.iam.gserviceaccount.com";
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
  "https://gaurav-portfolio-improved-default-rtdb.asia-southeast1.firebasedatabase.app/";

let adminApp: App;

if (getApps().length === 0) {
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      databaseURL,
    });
  } catch (error) {
    console.error("Firebase Admin cert error:", error);
    adminApp = initializeApp({ databaseURL });
  }
} else {
  adminApp = getApp();
}

export const adminAuth = getAuth(adminApp);
export const adminDb = getDatabase(adminApp);
export { adminApp };
