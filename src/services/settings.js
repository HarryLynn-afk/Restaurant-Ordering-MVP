import { normalizePrice } from '../utils/currency';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { uploadImage } from './_upload';

export const subscribeToSettings = (callback) =>
  onSnapshot(doc(db, 'settings', 'restaurant'), (snap) => callback(snap.data() || {}));

export const getSettings = () =>
  getDoc(doc(db, 'settings', 'restaurant')).then((snap) => snap.data() || {});

export const patchSettings = (fields) => {
  const normalized = { ...fields };
  if (fields.categoryModifiers) {
    normalized.categoryModifiers = Object.fromEntries(Object.entries(fields.categoryModifiers).map(([category, groups]) => [
      category, groups.map(group => ({ ...group, options: group.options.map(option => ({
        ...option, ...(group.type === 'extras' ? { price: normalizePrice(option.price ?? 0) } : {}),
      })) })),
    ]));
  }
  return setDoc(doc(db, 'settings', 'restaurant'), normalized, { merge: true });
};

export const uploadQrCode = (file) =>
  uploadImage(`settings/qr_${Date.now()}`, file, { maxWidth: 800, quality: 0.9 });
