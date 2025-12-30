import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDGfURh85wfJelLiBlzGjNdpvFD_V3V5Vg",
  authDomain: "handwritten-ai-system.firebaseapp.com",
  databaseURL: "https://handwritten-ai-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "handwritten-ai-system",
  storageBucket: "handwritten-ai-system.firebasestorage.app",
  messagingSenderId: "9183885350",
  appId: "1:9183885350:web:e01085963bf0d5d7084ee7"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);