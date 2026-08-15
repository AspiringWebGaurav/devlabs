import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { getDatabase, ref, onValue, set, get, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key-build-safe",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "portfolio-admin.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "portfolio-admin",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://portfolio-admin-default-rtdb.firebaseio.com",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "portfolio-admin.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:000000000000",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-00000000",
};

// Initialize Firebase client safely on the browser or build-time environment
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app);

if (typeof window !== "undefined") {
  try {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  } catch {
    // Ignore in SSR/build
  }
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export {
  app,
  auth,
  rtdb,
  ref,
  onValue,
  set,
  get,
  remove,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
};
