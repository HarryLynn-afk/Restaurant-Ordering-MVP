import { uploadMenuItemImage } from './menu';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), onSnapshot: vi.fn(), orderBy: vi.fn(), query: vi.fn(),
  getDocs: vi.fn(), doc: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(),
  deleteDoc: vi.fn(), serverTimestamp: vi.fn(),
}));

vi.mock('../firebase', () => ({ db: {}, storage: {} }));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => 'storageRef'),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve('https://cdn.example.com/image.jpg')),
}));

vi.mock('../utils/compressImage', () => ({
  default: vi.fn((file) => Promise.resolve(new File(['compressed'], file.name, { type: file.type }))),
}));

import compressImage from '../utils/compressImage';
import { uploadBytes, getDownloadURL } from 'firebase/storage';

describe('uploadMenuItemImage', () => {
  it('compresses the file, uploads to storage, and returns the download URL', async () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
    const url = await uploadMenuItemImage(file);

    expect(compressImage).toHaveBeenCalledWith(file, { maxWidth: 800, quality: 0.8 });
    expect(uploadBytes).toHaveBeenCalledWith('storageRef', expect.any(File), { contentType: 'image/jpeg' });
    expect(getDownloadURL).toHaveBeenCalledWith('storageRef');
    expect(url).toBe('https://cdn.example.com/image.jpg');
  });
});
