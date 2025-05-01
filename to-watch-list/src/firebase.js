import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';  // Add this import to access authentication methods.

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlrigzobRzUQasX1sn-6kVpFK35EQRo9s",
  authDomain: "things-to-watch-b75b6.firebaseapp.com",
  projectId: "things-to-watch-b75b6",
  storageBucket: "things-to-watch-b75b6.firebasestorage.app",
  messagingSenderId: "436859718601",
  appId: "1:436859718601:web:8bb06cea97616e00417618"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);

export { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, auth };
