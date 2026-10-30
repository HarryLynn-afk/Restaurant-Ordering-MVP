// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const functions = getFunctions(app);
export const db = getFirestore(app);
export const storage = getStorage(app, `gs://${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}`);
export const auth = getAuth(app);

export const ensureCustomerSession = async () => {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  if (auth.currentUser) return auth.currentUser;
  const credential = await signInAnonymously(auth);
  return credential.user;
};

export const onForegroundMessage = (callback) => {
  isSupported().then((supported) => {
    if (!supported) return;
    const msg = getMessaging(app);
    onMessage(msg, callback);
  });
};

export const requestNotificationToken = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    if (Notification.permission === 'denied') return null;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
    }

    const msg = getMessaging(app);
    const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    return token;
  } catch {
    return null;
  }
};
