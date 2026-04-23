export const getContrastColor = (color: string) => {
  if (!color) return "#FFFFFF";
  
  if (color.startsWith("hsl")) {
    const match = color.match(/hsl\(.*?,\s*.*?%,\s*(\d+)%\)/);
    if (match && parseInt(match[1]) > 60) return "#1F2937"; // dark gray text
    return "#FFFFFF";
  }
  
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return (yiq >= 150) ? "#1F2937" : "#FFFFFF";
};
