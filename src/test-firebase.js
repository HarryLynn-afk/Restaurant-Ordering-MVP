import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

// Test function
async function testFirebase() {
  try {
    const testData = {
      test: 'Hello Firebase!',
      timestamp: new Date()
    };
    
    const docRef = await addDoc(collection(db, 'test'), testData);
    console.log('✅ Firebase connected! Document ID:', docRef.id);
  } catch (error) {
    console.error('❌ Firebase error:', error);
  }
}

testFirebase();