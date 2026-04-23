import { Router } from "expo-router";

/**
 * Safe back navigation — attempts router.back() if there's history,
 * otherwise falls back to a specified route (defaults to classes list).
 */
export function safeGoBack(router: Router, fallback: string = "/(tabs)/classes") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
