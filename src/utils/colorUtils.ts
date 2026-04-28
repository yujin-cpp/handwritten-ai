
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
};

export const getContrastColor = (color: string): string => {
  if (!color) return "#FFFFFF";

  let r: number, g: number, b: number;

  if (color.startsWith("hsl")) {
    const match = color.match(/hsl\(\s*([\d.]+)[,\s]+\s*([\d.]+)%[,\s]+\s*([\d.]+)%\s*\)/);
    if (!match) return "#FFFFFF";
    [r, g, b] = hslToRgb(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  } else {
    let hex = color.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  }

  // YIQ perceived luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1F2937" : "#FFFFFF";
};


export const getIconBoxColors = (color: string): { bg: string; icon: string } => {
  if (!color) return { bg: "rgba(0,0,0,0.08)", icon: "#1F2937" };

  let r: number, g: number, b: number;

  if (color.startsWith("hsl")) {
    const match = color.match(/hsl\(\s*([\d.]+)[,\s]+\s*([\d.]+)%[,\s]+\s*([\d.]+)%\s*\)/);
    if (!match) return { bg: "rgba(0,0,0,0.08)", icon: "#1F2937" };
    [r, g, b] = hslToRgb(parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]));
  } else {
    let hex = color.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  }

  const bg = `rgba(${r}, ${g}, ${b}, 0.15)`;

  const icon = color;

  return { bg, icon };
};
