import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCmNItXV1lZHv9JnjlST1wNpOTYbVAl8Q0",
  authDomain: "vmanga-555e2.firebaseapp.com",
  projectId: "vmanga-555e2",
  storageBucket: "vmanga-555e2.firebasestorage.app",
  messagingSenderId: "467946613187",
  appId: "1:467946613187:web:2f6b1ba38e9ea408557576",
  measurementId: "G-Z42Z1563WP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
