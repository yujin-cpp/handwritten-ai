export const UI_COLORS = {
  appBackground: "#fafafa",
  appSurface: "#ffffff",
  appText: "#5f5f5f",
  appTextMuted: "#888888",
  primary: "#00c897",
  primaryDark: "#00624a",
  white: "#ffffff",
  black: "#000000",
};

export const UI_GLASS = {
  background: "#ffffff",
  backgroundStrong: "#ffffff",
  backgroundFallback: "#ffffff",
  border: "transparent",
  borderSoft: "transparent",
  highlight: "transparent",
  glow: "transparent",
  shadow: "rgba(0, 0, 0, 0.25)",
  blurWeb: 0,
  blurNative: 0,
} as const;

export const UI_GRADIENT_PRIMARY = [
  UI_COLORS.primary,
  UI_COLORS.primaryDark,
] as const;
