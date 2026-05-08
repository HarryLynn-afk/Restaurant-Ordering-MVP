import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import compressImage from '../utils/compressImage';

const store = async (storagePath, file, compressOpts) => {
  const compressed = await compressImage(file, compressOpts);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return storageRef;
};

// Compress, store, and return the Firebase download URL.
// Only use this for paths where the uploader has read permission.
export const uploadImage = async (storagePath, file, compressOpts = {}) => {
  const storageRef = await store(storagePath, file, compressOpts);
  return getDownloadURL(storageRef);
};

// Compress and store without fetching the download URL.
// Use this for paths with restricted read access (e.g. slips/ — staff-only reads).
export const storeImage = async (storagePath, file, compressOpts = {}) => {
  await store(storagePath, file, compressOpts);
};
