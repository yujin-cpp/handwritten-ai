import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-isD4bPRKmumW1XxYPZlXorN2MkSgDEs",
  authDomain: "handwritten-ai-scorer.firebaseapp.com",
  databaseURL: "https://handwritten-ai-scorer-default-rtdb.firebaseio.com/",
  projectId: "handwritten-ai-scorer",
  storageBucket: "handwritten-ai-scorer.firebasestorage.app",
  messagingSenderId: "1093390926434",
  appId: "1:1093390926434:web:a1ae78fb198e7878b6073b",
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
