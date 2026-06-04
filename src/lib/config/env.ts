const isProduction = process.env.NODE_ENV === "production";

function stripWrappingQuotes(value: string) {
  const first = value[0];
  const last = value[value.length - 1];
  const isWrapped = (first === '"' && last === '"') || (first === "'" && last === "'");
  return isWrapped ? value.slice(1, -1) : value;
}

function readEnv(key: string, fallback?: string) {
  const value = process.env[key];
  if (value && value.trim()) {
    return stripWrappingQuotes(value.trim());
  }

  if (isProduction && !fallback) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return fallback ?? "";
}

export const env = {
  appName: readEnv("NEXT_PUBLIC_APP_NAME", "Kids Progress Tracker"),
  firebase: {
    apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "AIzaSyD-REPLACE-WITH-REAL-FIREBASE-KEY"),
    authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "demo-project.firebaseapp.com"),
    projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-project"),
    storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "demo-project.appspot.com"),
    messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "000000000000"),
    appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "1:000000000000:web:0000000000000000000000"),
    measurementId: readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", ""),
  },
};

export const isFirebaseConfigured =
  !env.firebase.apiKey.includes("REPLACE-WITH-REAL") &&
  env.firebase.projectId !== "demo-project";
