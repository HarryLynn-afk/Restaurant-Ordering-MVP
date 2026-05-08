import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import compressImage from '../utils/compressImage';

export const uploadImage = async (storagePath, file, compressOpts = {}) => {
  const compressed = await compressImage(file, compressOpts);
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
};
