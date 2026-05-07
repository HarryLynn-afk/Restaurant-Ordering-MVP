import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('../firebase', () => ({ db: {}, storage: {} }));

vi.mock('../utils/compressImage', () => ({
  default: vi.fn((file) => Promise.resolve(file)),
}));

import { getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { uploadBytes, getDownloadURL } from 'firebase/storage';
import { getSettings, patchSettings, subscribeToSettings, uploadQrCode } from './settings';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSettings', () => {
  it('returns the data object when the document exists', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      data: () => ({ restaurantName: 'NOONA', lineId: '@noona' }),
    });

    const result = await getSettings();
    expect(result).toEqual({ restaurantName: 'NOONA', lineId: '@noona' });
  });

  it('returns an empty object when the document has no data', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({ data: () => undefined });

    const result = await getSettings();
    expect(result).toEqual({});
  });
});

describe('patchSettings', () => {
  it('calls setDoc with merge:true', async () => {
    vi.mocked(setDoc).mockResolvedValueOnce(undefined);

    await patchSettings({ busyMode: true });

    const [, data, options] = vi.mocked(setDoc).mock.calls[0];
    expect(data).toMatchObject({ busyMode: true });
    expect(options).toEqual({ merge: true });
  });
});

describe('subscribeToSettings', () => {
  it('calls callback with snapshot data when snapshot fires', () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, cb) => {
      cb({ data: () => ({ restaurantName: 'NOONA', storeClosed: false }) });
      return () => {};
    });

    const callback = vi.fn();
    subscribeToSettings(callback);

    expect(callback).toHaveBeenCalledWith({ restaurantName: 'NOONA', storeClosed: false });
  });

  it('calls callback with empty object when snapshot data is undefined', () => {
    vi.mocked(onSnapshot).mockImplementation((_ref, cb) => {
      cb({ data: () => undefined });
      return () => {};
    });

    const callback = vi.fn();
    subscribeToSettings(callback);

    expect(callback).toHaveBeenCalledWith({});
  });
});

describe('uploadQrCode', () => {
  it('uploads the file and returns the download URL', async () => {
    vi.mocked(uploadBytes).mockResolvedValueOnce(undefined);
    vi.mocked(getDownloadURL).mockResolvedValueOnce('https://cdn.example.com/qr.png');

    const fakeFile = new Blob(['img'], { type: 'image/png' });
    const url = await uploadQrCode(fakeFile);

    expect(uploadBytes).toHaveBeenCalledTimes(1);
    expect(url).toBe('https://cdn.example.com/qr.png');
  });
});
