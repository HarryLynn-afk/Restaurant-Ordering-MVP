import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { uploadImage } from './_upload';

export const subscribeToSettings = (callback) =>
  onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => callback(snap.data() || {}));

export const getSettings = () =>
  getDoc(doc(db, 'settings', 'restaurant')).then((snap) => snap.data() || {});

export const patchSettings = (fields) =>
  setDoc(doc(db, 'settings', 'restaurant'), fields, { merge: true });

export const uploadQrCode = (file) =>
  uploadImage(`settings/qr_${Date.now()}`, file, { maxWidth: 800, quality: 0.9 });
