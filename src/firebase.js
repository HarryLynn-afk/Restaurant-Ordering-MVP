// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration - USE THE ONE FROM FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyD9zJ2dTVEof6QNCGBg-YZpGVXZI6aNu4o",
  authDomain: "restaurant-ordering-app-1addc.firebaseapp.com",
  projectId: "restaurant-ordering-app-1addc",
  storageBucket: "restaurant-ordering-app-1addc.firebasestorage.app",
  messagingSenderId: "109137284o630",
  appId: "1:109137284o630:web:a2d80e165b6aedb713a0e7",
  measurementId: "G-HQN89DVC38"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
