import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
    getAuth,
    getReactNativePersistence,
    initializeAuth,
} from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

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
  // Web should continue to use browser persistence.
  if (Platform.OS === "web") {
    return getAuth(app);
  }

  // Native apps should use AsyncStorage persistence.
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    // During hot reload, auth may already be initialized.
    return getAuth(app);
  }
};

export const db = getDatabase(app);
export const auth = createAuth();
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
export { app };

