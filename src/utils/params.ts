/**
 * Safely extract a single string value from expo-router search params.
 * Handles string | string[] | undefined gracefully.
 */
export const P = (v: string | string[] | undefined, fb = ""): string =>
  Array.isArray(v) ? v[0] : (v ?? fb);
