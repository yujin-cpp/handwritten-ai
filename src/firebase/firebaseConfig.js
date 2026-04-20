import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage"; // 1. Import Storage
import { Platform } from "react-native";

import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-isD4bPRKmumW1XxYPZlXorN2MkSgDEs",
  authDomain: "handwritten-ai-scorer.firebaseapp.com",
  databaseURL: "https://handwritten-ai-scorer-default-rtdb.firebaseio.com/",
  projectId: "handwritten-ai-scorer",
  storageBucket: "handwritten-ai-scorer.firebasestorage.app",
  messagingSenderId: "1093390926434",
  appId: "1:1093390926434:web:a1ae78fb198e7878b6073b",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const createAuth = () => {
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
};

export const db = getDatabase(app);
export const auth = createAuth();
export const storage = getStorage(app); // 2. Initialize and Export Storage
export const functions = getFunctions(app, "us-central1"); // Add this export
export { app };

