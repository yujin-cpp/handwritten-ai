import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";

type GoogleAuthExtra = {
  expoClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
};

const extra =
  (Constants.expoConfig?.extra?.googleAuth as GoogleAuthExtra | undefined) || {};

export const GOOGLE_AUTH_CONFIG = {
  expoClientId: extra.expoClientId || "",
  iosClientId: extra.iosClientId || "",
  androidClientId: extra.androidClientId || "",
  webClientId: extra.webClientId || "",
};

export const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo";

export const getGoogleRedirectUri = () =>
  AuthSession.makeRedirectUri({
    scheme: "handwrittenai",
    path: "oauthredirect",
  });

export const CURRENT_FIREBASE_PROJECT_NUMBER = "1093390926434";
export const LEGACY_GOOGLE_PROJECT_NUMBER = "697036998946";

export const MOBILE_GOOGLE_AUTH_SETUP_MESSAGE =
  "Google sign-in for mobile is not configured for handwritten-ai-scorer yet. " +
  `The current Firebase project number is ${CURRENT_FIREBASE_PROJECT_NUMBER}, but the old OAuth client IDs in this app came from ${LEGACY_GOOGLE_PROJECT_NUMBER}. ` +
  "Add the current Expo/Android/Web OAuth client IDs from the handwritten-ai-scorer Google Cloud or Firebase Authentication console.";

export const EXPO_GO_GOOGLE_AUTH_MESSAGE =
  "Google sign-in cannot be tested inside Expo Go. Use a development build or an installed Android build for this app so Google can redirect back to the handwrittenai:// scheme.";

export const hasNativeGoogleAuthConfig = Boolean(
  GOOGLE_AUTH_CONFIG.expoClientId || GOOGLE_AUTH_CONFIG.androidClientId || GOOGLE_AUTH_CONFIG.iosClientId,
);
