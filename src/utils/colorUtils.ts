
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
    .join("")}`;

const parseColorToRgb = (color: string): [number, number, number] | null => {
  if (!color) return null;

  if (color.startsWith("hsl")) {
    const match = color.match(/hsl\(\s*([\d.]+)[,\s]+\s*([\d.]+)%[,\s]+\s*([\d.]+)%\s*\)/);
    if (!match) return null;
    return hslToRgb(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  }

  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  if (hex.length !== 6) return null;

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return [r, g, b].every(Number.isFinite) ? [r, g, b] : null;
};

const relativeLuminance = ([r, g, b]: [number, number, number]) => {
  const channels = [r, g, b].map((value) => {
    const next = value / 255;
    return next <= 0.03928 ? next / 12.92 : Math.pow((next + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (a: [number, number, number], b: [number, number, number]) => {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getContrastColor = (color: string): string => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return "#FFFFFF";

  // YIQ perceived luminance formula
  const [r, g, b] = rgb;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1F2937" : "#FFFFFF";
};


export const getIconBoxColors = (color: string): { bg: string; icon: string } => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return { bg: "rgba(0,0,0,0.08)", icon: "#1F2937" };

  const [r, g, b] = rgb;
  const bg = `rgba(${r}, ${g}, ${b}, 0.15)`;
  const tintedBg: [number, number, number] = [
    Math.round(255 * 0.85 + r * 0.15),
    Math.round(255 * 0.85 + g * 0.15),
    Math.round(255 * 0.85 + b * 0.15),
  ];

  let iconRgb: [number, number, number] = [r, g, b];
  for (let factor = 0.9; contrastRatio(iconRgb, tintedBg) < 3 && factor >= 0.25; factor -= 0.1) {
    iconRgb = [
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor),
    ];
  }

  const icon =
    contrastRatio(iconRgb, tintedBg) >= 3
      ? rgbToHex(iconRgb[0], iconRgb[1], iconRgb[2])
      : "#1F2937";

  return { bg, icon };
};
