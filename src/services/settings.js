import { db, storage } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import compressImage from '../utils/compressImage';

export const subscribeToSettings = (callback) =>
  onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => callback(snap.data() || {}));

export const getSettings = () =>
  getDoc(doc(db, 'settings', 'restaurant')).then((snap) => snap.data() || {});

export const patchSettings = (fields) =>
  setDoc(doc(db, 'settings', 'restaurant'), fields, { merge: true });

export const uploadQrCode = async (file) => {
  const compressed = await compressImage(file, { maxWidth: 800, quality: 0.9 });
  const storageRef = ref(storage, `settings/qr_${Date.now()}`);
  await uploadBytes(storageRef, compressed);
  return getDownloadURL(storageRef);
};
