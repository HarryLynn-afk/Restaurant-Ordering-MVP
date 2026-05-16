import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  deleteField: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  orderBy: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  Timestamp: { fromDate: vi.fn(() => 'TIMESTAMP') },
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
  storage: {},
  ensureCustomerSession: vi.fn(),
}));

vi.mock('../utils/compressImage', () => ({
  default: vi.fn((file) => Promise.resolve(file)),
}));

import { addDoc, getDoc, updateDoc, onSnapshot, deleteField } from 'firebase/firestore';
import { uploadBytes, getDownloadURL } from 'firebase/storage';
import { ensureCustomerSession } from '../firebase';
import {
  createOrder, getOrder, updateOrderStatus, cancelOrder,
  setOrderFcmToken, subscribeToOrder, subscribeToRecentOrders,
  uploadDeliveryPhoto, deleteDeliveryPhoto, getPaymentSlipUrl, uploadPaymentSlip,
} from './orders';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getOrder', () => {
  it('returns null when the order document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ exists: () => false });
    const result = await getOrder('ord123');
    expect(result).toBeNull();
  });

  it('returns a plain object with id when the order exists', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'ord123',
      data: () => ({ status: 'new', customerName: 'Kyaw' }),
    });
    const result = await getOrder('ord123');
    expect(result).toEqual({ id: 'ord123', status: 'new', customerName: 'Kyaw' });
  });
});

describe('createOrder', () => {
  it('returns the new document id', async () => {
    vi.mocked(ensureCustomerSession).mockResolvedValueOnce({ uid: 'uid1' });
    vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-order-id' });
    const id = await createOrder({}, [], 0);
    expect(id).toBe('new-order-id');
  });

  it('sets status to "new", nulls out slip fields, and attaches ownerUid', async () => {
    vi.mocked(ensureCustomerSession).mockResolvedValueOnce({ uid: 'uid42' });
    vi.mocked(addDoc).mockResolvedValueOnce({ id: 'x' });
    const form = { customerName: 'Test', phone: '0812345678', address: '1 St' };
    const items = [{ id: 'i1', name: 'Pad Thai', price: 60, quantity: 1 }];

    await createOrder(form, items, 60);

    const [, data] = vi.mocked(addDoc).mock.calls[0];
    expect(data.status).toBe('new');
    expect(data.paymentSlipUrl).toBeNull();
    expect(data.paymentSlipPath).toBeNull();
    expect(data.ownerUid).toBe('uid42');
    expect(data.total).toBe(60);
    expect(data.items).toEqual(items);
    expect(data.createdAt).toBe('SERVER_TIMESTAMP');
  });
});

describe('updateOrderStatus', () => {
  it('writes only the status field', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await updateOrderStatus('ord1', 'preparing');
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ status: 'preparing' });
  });
});

describe('cancelOrder', () => {
  it('sets status to cancelled and attaches the cancel reason', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await cancelOrder('ord1', 'Out of stock');
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ status: 'cancelled', cancelReason: 'Out of stock' });
  });
});

describe('setOrderFcmToken', () => {
  it('writes only the fcmToken field', async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await setOrderFcmToken('ord1', 'tok_abc');
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ fcmToken: 'tok_abc' });
  });
});

describe('subscribeToOrder', () => {
  it('calls onError when ensureCustomerSession rejects', async () => {
    vi.mocked(ensureCustomerSession).mockRejectedValueOnce(new Error('auth'));
    const onData = vi.fn();
    const onError = vi.fn();

    const cancel = subscribeToOrder('ord1', onData, onError);
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalled();
    expect(onData).not.toHaveBeenCalled();
    cancel();
  });

  it('calls onData with the order object when the snapshot exists', async () => {
    vi.mocked(ensureCustomerSession).mockResolvedValueOnce(undefined);
    vi.mocked(onSnapshot).mockImplementation((_ref, successCb) => {
      successCb({ exists: () => true, id: 'ord1', data: () => ({ status: 'new' }) });
      return () => {};
    });

    const onData = vi.fn();
    const onError = vi.fn();

    const cancel = subscribeToOrder('ord1', onData, onError);
    await Promise.resolve();
    await Promise.resolve();

    expect(onData).toHaveBeenCalledWith({ id: 'ord1', status: 'new' });
    expect(onError).not.toHaveBeenCalled();
    cancel();
  });

  it('calls onError when the snapshot document does not exist', async () => {
    vi.mocked(ensureCustomerSession).mockResolvedValueOnce(undefined);
    vi.mocked(onSnapshot).mockImplementation((_ref, successCb) => {
      successCb({ exists: () => false });
      return () => {};
    });

    const onData = vi.fn();
    const onError = vi.fn();

    const cancel = subscribeToOrder('ord1', onData, onError);
    await Promise.resolve();
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith('not-found');
    cancel();
  });
});

describe('subscribeToRecentOrders', () => {
  const snap = (orders) => ({
    docs: orders.map(({ id, ...data }) => ({
      id,
      data: () => data,
    })),
  });

  it('merges recent orders with active orders so stale active orders stay visible', () => {
    const callbacks = [];
    const unsubRecent = vi.fn();
    const unsubActive = vi.fn();
    vi.mocked(onSnapshot)
      .mockImplementationOnce((_q, cb) => {
        callbacks.push(cb);
        return unsubRecent;
      })
      .mockImplementationOnce((_q, cb) => {
        callbacks.push(cb);
        return unsubActive;
      });
    const callback = vi.fn();

    const unsubscribe = subscribeToRecentOrders(callback);

    callbacks[0](snap([
      { id: 'recent-delivered', status: 'delivered' },
      { id: 'shared-active', status: 'ready' },
    ]));
    expect(callback).not.toHaveBeenCalled();

    callbacks[1](snap([
      { id: 'shared-active', status: 'ready' },
      { id: 'stale-active', status: 'out_for_delivery' },
    ]));

    const ids = callback.mock.calls[0][0].map((order) => order.id).sort();
    expect(ids).toEqual(['recent-delivered', 'shared-active', 'stale-active']);

    unsubscribe();
    expect(unsubRecent).toHaveBeenCalled();
    expect(unsubActive).toHaveBeenCalled();
  });
});

describe('uploadDeliveryPhoto', () => {
  it('uploads compressed file and writes deliveryPhotoUrl to Firestore', async () => {
    vi.mocked(uploadBytes).mockResolvedValueOnce(undefined);
    vi.mocked(getDownloadURL).mockResolvedValueOnce('https://cdn.example.com/delivery.jpg');
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    const fakeFile = new Blob(['img'], { type: 'image/jpeg' });
    const url = await uploadDeliveryPhoto('ord1', fakeFile);

    expect(uploadBytes).toHaveBeenCalledTimes(1);
    expect(url).toBe('https://cdn.example.com/delivery.jpg');
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ deliveryPhotoUrl: 'https://cdn.example.com/delivery.jpg' });
  });
});

describe('deleteDeliveryPhoto', () => {
  it('removes deliveryPhotoUrl from the order document', async () => {
    vi.mocked(deleteField).mockReturnValueOnce('DELETE_SENTINEL');
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    await deleteDeliveryPhoto('ord1');

    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ deliveryPhotoUrl: 'DELETE_SENTINEL' });
  });
});

describe('getPaymentSlipUrl', () => {
  it('returns the download URL for the given storage path', async () => {
    vi.mocked(getDownloadURL).mockResolvedValueOnce('https://cdn.example.com/slip.jpg');

    const url = await getPaymentSlipUrl('slips/uid1/ord1_1234.jpg');

    expect(getDownloadURL).toHaveBeenCalledTimes(1);
    expect(url).toBe('https://cdn.example.com/slip.jpg');
  });
});

describe('uploadPaymentSlip', () => {
  it('uploads compressed file and writes paymentSlipPath to Firestore', async () => {
    vi.mocked(ensureCustomerSession).mockResolvedValueOnce({ uid: 'uid42' });
    vi.spyOn(Date, 'now').mockReturnValueOnce(9999);
    vi.mocked(uploadBytes).mockResolvedValueOnce(undefined);
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

    const fakeFile = new Blob(['img'], { type: 'image/jpeg' });
    const path = await uploadPaymentSlip('ord1', fakeFile);

    expect(uploadBytes).toHaveBeenCalledTimes(1);
    expect(path).toBe('slips/uid42/ord1_9999');
    const [, fields] = vi.mocked(updateDoc).mock.calls[0];
    expect(fields).toEqual({ paymentSlipPath: 'slips/uid42/ord1_9999' });
  });
});
