import { db, storage, ensureCustomerSession } from '../firebase';
import {
  collection, onSnapshot, orderBy, query, where, Timestamp,
  doc, addDoc, getDoc, updateDoc, deleteField, serverTimestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { uploadImage } from './_upload';

export const subscribeToOrder = (orderId, onData, onError) => {
  let unsubscribe = () => {};
  let cancelled = false;

  ensureCustomerSession()
    .then(() => {
      if (cancelled) return;
      unsubscribe = onSnapshot(doc(db, 'orders', orderId),
        (snap) => {
          if (snap.exists()) {
            onData({ id: snap.id, ...snap.data() });
          } else {
            onError('not-found');
          }
        },
        () => onError('error'),
      );
    })
    .catch(() => {
      if (!cancelled) onError('auth');
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
};

export const subscribeToRecentOrders = (callback) => {
  const cutoff = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const q = query(
    collection(db, 'orders'),
    where('createdAt', '>=', cutoff),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
};

export const createOrder = async (form, items, total) => {
  const { uid } = await ensureCustomerSession();
  const docRef = await addDoc(collection(db, 'orders'), {
    ...form,
    items,
    total,
    status: 'new',
    paymentSlipUrl: null,
    paymentSlipPath: null,
    ownerUid: uid,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const setOrderFcmToken = (orderId, token) =>
  updateDoc(doc(db, 'orders', orderId), { fcmToken: token });

export const getOrder = (orderId) =>
  getDoc(doc(db, 'orders', orderId)).then((snap) =>
    snap.exists() ? { id: snap.id, ...snap.data() } : null,
  );

export const updateOrderStatus = (orderId, status) =>
  updateDoc(doc(db, 'orders', orderId), { status });

export const cancelOrder = (orderId, reason) =>
  updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', cancelReason: reason });

export const uploadDeliveryPhoto = async (orderId, file) => {
  const url = await uploadImage(`delivery/${orderId}_${Date.now()}`, file, { maxWidth: 1200, quality: 0.8 });
  await updateDoc(doc(db, 'orders', orderId), { deliveryPhotoUrl: url });
  return url;
};

export const deleteDeliveryPhoto = (orderId) =>
  updateDoc(doc(db, 'orders', orderId), { deliveryPhotoUrl: deleteField() });

export const getPaymentSlipUrl = (path) =>
  getDownloadURL(ref(storage, path));

export const uploadPaymentSlip = async (orderId, file) => {
  const { uid } = await ensureCustomerSession();
  const path = `slips/${uid}/${orderId}_${Date.now()}`;
  await uploadImage(path, file, { maxWidth: 1200, quality: 0.8 });
  await updateDoc(doc(db, 'orders', orderId), { paymentSlipPath: path });
  return path;
};
