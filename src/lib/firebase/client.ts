import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile as fbUpdateProfile,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

export type FirebaseConfigOptions = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

const envFirebaseConfig: FirebaseConfigOptions = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyC4UYN_il1mIZjkvAc3MXC8vPD5O33_MuI',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'espaco-catolico-santo-antonio.firebaseapp.com',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'espaco-catolico-santo-antonio',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'espaco-catolico-santo-antonio.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    '660229626268',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:660229626268:web:8f2370e874158b55b85059',
};

const STORAGE_FIREBASE_CONFIG_KEY = 'santo_antonio_firebase_config';

export function getFirebaseConfig(): FirebaseConfigOptions | null {
  if (
    envFirebaseConfig.apiKey &&
    envFirebaseConfig.projectId &&
    !envFirebaseConfig.apiKey.includes('placeholder')
  ) {
    return envFirebaseConfig;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_FIREBASE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.apiKey && parsed?.projectId) {
          return parsed;
        }
      }
    } catch {}
  }

  return null;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(getFirebaseConfig());
}

export function saveFirebaseRuntimeConfig(config: FirebaseConfigOptions): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseInstances(): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} | null {
  const cfg = getFirebaseConfig();
  if (!cfg) return null;

  try {
    if (!cachedApp) {
      cachedApp = getApps().length > 0 ? getApp() : initializeApp(cfg);
      cachedAuth = getAuth(cachedApp);
      cachedDb = getFirestore(cachedApp);
    }
    return {
      app: cachedApp!,
      auth: cachedAuth!,
      db: cachedDb!,
    };
  } catch (e) {
    console.warn('Firebase initialization warning:', e);
    return null;
  }
}

export {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  fbUpdateProfile,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
};
export type { FirebaseUser };

