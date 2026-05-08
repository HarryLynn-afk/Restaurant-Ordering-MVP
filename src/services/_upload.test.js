import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase', () => ({ storage: {} }));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => 'fake-storage-ref'),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve('https://cdn.example.com/image.jpg')),
}));

vi.mock('../utils/compressImage', () => ({
  default: vi.fn((file) => Promise.resolve(file)),
}));

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import compressImage from '../utils/compressImage';
import { uploadImage, storeImage } from './_upload';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ref).mockReturnValue('fake-storage-ref');
  vi.mocked(uploadBytes).mockResolvedValue(undefined);
  vi.mocked(getDownloadURL).mockResolvedValue('https://cdn.example.com/image.jpg');
  vi.mocked(compressImage).mockImplementation((file) => Promise.resolve(file));
});

describe('uploadImage', () => {
  it('returns the download URL from Firebase Storage', async () => {
    vi.mocked(getDownloadURL).mockResolvedValueOnce('https://cdn.example.com/photo.jpg');
    const file = new Blob(['data'], { type: 'image/jpeg' });

    const url = await uploadImage('some/path', file);

    expect(url).toBe('https://cdn.example.com/photo.jpg');
  });

  it('uploads to the storage ref for the given path', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    await uploadImage('menus/123_photo.jpg', file);

    expect(ref).toHaveBeenCalledWith(expect.anything(), 'menus/123_photo.jpg');
    expect(uploadBytes).toHaveBeenCalledWith('fake-storage-ref', file, expect.anything());
  });

  it('always sets contentType: image/jpeg on upload', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    await uploadImage('some/path', file);

    expect(uploadBytes).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { contentType: 'image/jpeg' },
    );
  });

  it('calls getDownloadURL with the storage ref', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    await uploadImage('some/path', file);

    expect(getDownloadURL).toHaveBeenCalledWith('fake-storage-ref');
  });

  it('forwards compressOpts to compressImage', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });
    const opts = { maxWidth: 800, quality: 0.8 };

    await uploadImage('some/path', file, opts);

    expect(compressImage).toHaveBeenCalledWith(file, opts);
  });

  it('passes an empty object to compressImage when no compressOpts given', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    await uploadImage('some/path', file);

    expect(compressImage).toHaveBeenCalledWith(file, {});
  });
});

describe('storeImage', () => {
  it('uploads to the storage ref for the given path', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    await storeImage('slips/uid42/ord1_9999', file);

    expect(ref).toHaveBeenCalledWith(expect.anything(), 'slips/uid42/ord1_9999');
    expect(uploadBytes).toHaveBeenCalledWith('fake-storage-ref', file, { contentType: 'image/jpeg' });
  });

  it('never calls getDownloadURL', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    await storeImage('slips/uid42/ord1_9999', file);

    expect(getDownloadURL).not.toHaveBeenCalled();
  });

  it('forwards compressOpts to compressImage', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });
    const opts = { maxWidth: 1200, quality: 0.8 };

    await storeImage('slips/uid42/ord1_9999', file, opts);

    expect(compressImage).toHaveBeenCalledWith(file, opts);
  });

  it('returns nothing', async () => {
    const file = new Blob(['data'], { type: 'image/jpeg' });

    const result = await storeImage('slips/uid42/ord1_9999', file);

    expect(result).toBeUndefined();
  });
});
