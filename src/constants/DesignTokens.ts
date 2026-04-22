export const UI_COLORS = {
  appBackground: "#f4f7fb",
  appSurface: "#ffffff",
  appText: "#1f2937",
  appTextMuted: "#4b5563",
  primary: "#0EA47A",
  primaryDark: "#017EBA",
};

export const UI_GLASS = {
  background: "rgba(255, 255, 255, 0.34)",
  backgroundStrong: "rgba(255, 255, 255, 0.5)",
  backgroundFallback: "rgba(248, 250, 252, 0.84)",
  border: "rgba(255, 255, 255, 0.82)",
  borderSoft: "rgba(255, 255, 255, 0.24)",
  highlight: "rgba(255, 255, 255, 0.58)",
  glow: "rgba(255, 255, 255, 0.22)",
  shadow: "rgba(15, 23, 42, 0.14)",
  blurWeb: 68,
  blurNative: 40,
} as const;

export const UI_GRADIENT_PRIMARY = [
  UI_COLORS.primary,
  UI_COLORS.primaryDark,
] as const;
