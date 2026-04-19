import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

import { getReactNativePersistence, initializeAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGfURh85wfJelLiBlzGjNdpvFD_V3V5Vg",
  authDomain: "handwritten-ai-system.firebaseapp.com",
  databaseURL:
    "https://handwritten-ai-system-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "handwritten-ai-system",
  storageBucket: "handwritten-ai-system.firebasestorage.app",
  messagingSenderId: "9183885350",
  appId: "1:9183885350:web:e01085963bf0d5d7084ee7",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const storage = getStorage(app);
export const functions = getFunctions(app);
