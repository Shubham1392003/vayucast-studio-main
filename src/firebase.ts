// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB51xcj5NtLD9Jy7Wz2fxwTP3UgHIwo0Rw",
  authDomain: "vayucast-c65ca.firebaseapp.com",
  projectId: "vayucast-c65ca",
  storageBucket: "vayucast-c65ca.firebasestorage.app",
  messagingSenderId: "342222495906",
  appId: "1:342222495906:web:a5a9024905218d14c0b7fb",
  measurementId: "G-TVMF7FF2YT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
