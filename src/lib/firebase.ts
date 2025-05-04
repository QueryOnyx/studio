
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics"; // Import Analytics

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkDho-SiStH1uVDBff6hLlvUOkjVw5yiY",
  authDomain: "queryonyx-bf737.firebaseapp.com",
  projectId: "queryonyx-bf737",
  storageBucket: "queryonyx-bf737.appspot.com", // Corrected domain if using default bucket
  messagingSenderId: "13403249278",
  appId: "1:13403249278:web:3c479c11d89c67dea4162f",
  measurementId: "G-SM9KSLTXYC"
};


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
let analytics;
// Check if window is defined (running in browser) before initializing Analytics
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}


export { app, auth, db, analytics };
