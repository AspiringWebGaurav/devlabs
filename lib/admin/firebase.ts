import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  browserLocalPersistence,
  setPersistence,
  Auth,
} from "firebase/auth";
import { getDatabase, ref, onValue, set, get, remove, Database } from "firebase/database";

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

let _app: FirebaseApp | null = null;
export const getClientApp = (): FirebaseApp => {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
};

export const app: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    const instance = getClientApp();
    const val = (instance as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(instance);
    }
    return val;
  },
});

let _auth: Auth | null = null;
export const getFirebaseAuth = (): Auth => {
  if (!_auth) {
    _auth = getAuth(getClientApp());
    if (typeof window !== "undefined") {
      try {
        setPersistence(_auth, browserLocalPersistence).catch(() => {});
      } catch {
        // Ignore in environments without window storage
      }
    }
  }
  return _auth;
};

let _rtdb: Database | null = null;
export const getFirebaseRtdb = (): Database => {
  if (!_rtdb) {
    _rtdb = getDatabase(getClientApp());
  }
  return _rtdb;
};

export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getFirebaseAuth();
    const val = (instance as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(instance);
    }
    return val;
  },
  set(_, prop, value) {
    (getFirebaseAuth() as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
});

export const rtdb: Database = new Proxy({} as Database, {
  get(_, prop) {
    const instance = getFirebaseRtdb();
    const val = (instance as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === "function") {
      return (val as (...args: unknown[]) => unknown).bind(instance);
    }
    return val;
  },
  set(_, prop, value) {
    (getFirebaseRtdb() as unknown as Record<string, unknown>)[prop as string] = value;
    return true;
  },
});

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export {
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  ref,
  onValue,
  set,
  get,
  remove,
};
