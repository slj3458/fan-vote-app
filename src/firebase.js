import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB_T9wCCjdb-B4Up6ZoSQjjwl4YYC-bvy0",
  authDomain: "fan-vote-71884.firebaseapp.com",
  projectId: "fan-vote-71884",
  storageBucket: "fan-vote-71884.firebasestorage.app",
  messagingSenderId: "589593352663",
  appId: "1:589593352663:web:ce7aef837bd7ca1452d392",
  measurementId: "G-KW14MQKF9R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Sign in anonymously
export const signInAnonymous = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};
