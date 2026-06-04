import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim(),
  authDomain: (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "").trim(),
  projectId: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim(),
  storageBucket: (process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "").trim(),
  messagingSenderId: (process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "").trim(),
  appId: (process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "").trim(),
  measurementId: (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "").trim() || undefined,
};

// Check if we have valid-looking config values. If not, use mock placeholders to prevent crashing Next.js static build workers.
const isConfigValid = 
  firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.appId;

const appConfig = isConfigValid ? firebaseConfig : {
  apiKey: "mock-api-key-for-build",
  authDomain: "mock-auth-domain-for-build",
  projectId: "mock-project-id-for-build",
  storageBucket: "mock-storage-bucket-for-build",
  messagingSenderId: "mock-sender-id-for-build",
  appId: "mock-app-id-for-build",
};

const app = getApps().length ? getApp() : initializeApp(appConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
