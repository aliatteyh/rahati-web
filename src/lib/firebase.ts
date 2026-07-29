import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Public Firebase web config (safe to expose). Overridable via env.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAd5zKlthK9Bn0rL-jAMmICMP8KT3ToZ58",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "rahati-home-service-f5f9c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "rahati-home-service-f5f9c",
  storageBucket: "rahati-home-service-f5f9c.firebasestorage.app",
  messagingSenderId: "249659471125",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:249659471125:web:d1382057a43c5208a4a51c",
};

export function getFirebaseAuth(): Auth {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return getAuth(app);
}
