import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// During build time, allow missing env vars (they'll be set at runtime)
// At runtime in production, all environment variables must be set
const isProduction = process.env.NODE_ENV === 'production';
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NEXT_PHASE === 'phase-development-build';

// Validate required environment variables only at runtime (not during build)
if (isProduction && !isBuildTime && typeof window !== 'undefined') {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
    // Don't throw during build - just warn
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (isProduction ? undefined : "AIzaSyBng3T4aJpLfrZC0eITWWiz7Uz-tJeeR9o"),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (isProduction ? undefined : "binary-plan-2e2ae.firebaseapp.com"),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (isProduction ? undefined : "binary-plan-2e2ae"),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || (isProduction ? undefined : "binary-plan-2e2ae.firebasestorage.app"),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || (isProduction ? undefined : "839113575490"),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || (isProduction ? undefined : "1:839113575490:web:08dd8ecc517ffa6a26b1db"),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || (isProduction ? undefined : "G-THN0XL9LRC")
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    // Initialize Analytics only in browser and if measurementId exists
    if (firebaseConfig.measurementId) {
      try {
        analytics = getAnalytics(app);
      } catch (error) {
        console.warn('Analytics initialization failed:', error);
      }
    }
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  // Server-side: Initialize minimal Firebase for SSR
  // Skip initialization during build time if env vars are missing
  const hasRequiredConfig = firebaseConfig.apiKey && firebaseConfig.projectId;
  
  if (hasRequiredConfig) {
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
      } else {
        app = getApps()[0];
        db = getFirestore(app);
      }
    } catch (error) {
      // During build time, it's okay if Firebase can't initialize
      if (!isBuildTime) {
        console.error('Firebase server-side initialization failed:', error);
      }
    }
  } else if (!isBuildTime) {
    console.warn('Firebase configuration incomplete. Some features may not work.');
  }
}

// Helper function to ensure db is initialized
export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firestore is not initialized. Make sure Firebase is properly configured.');
  }
  return db;
}

export { app, auth, db, storage, analytics };
