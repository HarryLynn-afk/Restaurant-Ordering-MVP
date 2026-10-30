import { normalizePrice } from '../utils/currency';
import { db } from '../firebase';
import {
  collection, onSnapshot, orderBy, query, getDocs,
  doc, addDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import { uploadImage } from './_upload';

export const subscribeToMenu = (callback, onError) => {
  const q = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
};

export const getSoldOutItemIds = () =>
  getDocs(collection(db, 'menuItems')).then((snap) =>
    new Set(snap.docs.filter((d) => d.data().soldOut).map((d) => d.id)),
  );

export const addMenuItem = (data) =>
  addDoc(collection(db, 'menuItems'), { ...data, price: normalizePrice(data.price), soldOut: false, createdAt: serverTimestamp() });

export const updateMenuItem = (id, data) =>
  updateDoc(doc(db, 'menuItems', id), { ...data, ...(data.price !== undefined ? { price: normalizePrice(data.price) } : {}) });

export const deleteMenuItem = (id) =>
  deleteDoc(doc(db, 'menuItems', id));

export const toggleSoldOut = (item) =>
  updateDoc(doc(db, 'menuItems', item.id), { soldOut: !item.soldOut });

export const markAllAvailable = (items) =>
  Promise.all(items.filter((i) => i.soldOut).map((i) =>
    updateDoc(doc(db, 'menuItems', i.id), { soldOut: false }),
  ));

export const uploadMenuItemImage = (file) =>
  uploadImage(`menus/${Date.now()}_${file.name}`, file, { maxWidth: 800, quality: 0.8 });
