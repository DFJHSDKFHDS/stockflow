// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database"; // Added
import { getStorage } from "firebase/storage"; // Added

const firebaseConfig = {
  apiKey: "AIzaSyBWcF5RHqeNJKVZQ7zWyonxVFNjeK4rfls",
  authDomain: "finalyear-project-7f5c2.firebaseapp.com",
  databaseURL: "https://finalyear-project-7f5c2-default-rtdb.firebaseio.com",
  projectId: "finalyear-project-7f5c2",
  storageBucket: "finalyear-project-7f5c2.appspot.com",
  messagingSenderId: "287737299602",
  appId: "1:287737299602:web:19361aeb56035469fb1c4b",
  measurementId: "G-9X2422RGM0"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app); // Added Realtime Database
const storage = getStorage(app); // Added Firebase Storage

export { app, auth, db, rtdb, storage }; // Exported rtdb and storage
