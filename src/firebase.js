// src/firebase.js
import { initializeApp } from 'firebase/app';
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
    console.log('[FCM] Step 1: checking isSupported()');
    const supported = await isSupported();
    console.log('[FCM] isSupported result:', supported);
    if (!supported) {
      console.warn('[FCM] Browser does NOT support FCM. Aborting.');
      return null;
    }

    console.log('[FCM] Step 2: current Notification.permission =', Notification.permission);
    if (Notification.permission === 'denied') {
      console.warn('[FCM] Permission was previously denied. User must enable in browser settings.');
      return null;
    }

    if (Notification.permission === 'default') {
      console.log('[FCM] Step 3: requesting permission from user');
      const permission = await Notification.requestPermission();
      console.log('[FCM] Permission result:', permission);
      if (permission !== 'granted') {
        console.warn('[FCM] User did not grant permission.');
        return null;
      }
    }

    console.log('[FCM] Step 4: getting FCM token');
    const msg = getMessaging(app);
    const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    console.log('[FCM] Token generated:', token ? token.substring(0, 30) + '...' : 'NULL');
    return token;
  } catch (e) {
    console.error('[FCM] Error in requestNotificationToken:', e);
    return null;
  }
};
