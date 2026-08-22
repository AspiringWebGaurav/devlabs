import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  Auth,
} from "firebase/auth";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gaurav-portfolio-improved.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gaurav-portfolio-improved",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://gaurav-portfolio-improved-default-rtdb.asia-southeast1.firebasedatabase.app/",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gaurav-portfolio-improved.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "761696179429",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:761696179429:web:8919d6a499c2e8f0d4b00c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-WQKV3WPPD8",
};

let _app: FirebaseApp | null = null;
export const getClientApp = (): FirebaseApp => {
  if (!_app) {
    _app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return _app;
};

let _auth: Auth | null = null;
export const getFirebaseAuth = (): Auth => {
  if (!_auth) {
    _auth = getAuth(getClientApp());
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

let _googleProvider: GoogleAuthProvider | null = null;
export const getGoogleProvider = (): GoogleAuthProvider => {
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
    _googleProvider.setCustomParameters({
      prompt: "select_account",
    });
  }
  return _googleProvider;
};

export {
  signInWithPopup,
  signOut,
};
