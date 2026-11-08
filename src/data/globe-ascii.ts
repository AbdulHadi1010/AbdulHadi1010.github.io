// Static ASCII globe, computed at build time from the same land mask as the
// live shader. Shown until WebGL takes over, and kept on devices without a GPU.
import { LAND_BITS, LAND_H, LAND_W } from "./landmask";

const CHARS = " .:-=+*#%@";

export function asciiGlobe(cols = 64, rows = 32, yaw = 1.2, tilt = 0.38): string {
  const bits = Uint8Array.from(Buffer.from(LAND_BITS, "base64"));
  const land = (lon: number, lat: number) => {
    const x = Math.floor((((lon / (2 * Math.PI) + 0.5) % 1) + 1) % 1 * LAND_W);
    const y = Math.min(LAND_H - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * LAND_H)));
    const i = y * LAND_W + x;
    return bits[i >> 3] & (1 << (i & 7)) ? 1 : 0;
  };
  const L = [-0.35, 0.45, 0.9].map((v, _, a) => v / Math.hypot(...a));
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    let line = "";
    for (let c = 0; c < cols; c++) {
      const dx = (c + 0.5) / cols * 2 - 1;
      const dy = -((r + 0.5) / rows * 2 - 1);
      const d2 = dx * dx + dy * dy;
      if (d2 >= 1) { line += " "; continue; }
      const nz = Math.sqrt(1 - d2);
      const x1 = Math.cos(yaw) * dx + Math.sin(yaw) * nz;
      const z1 = -Math.sin(yaw) * dx + Math.cos(yaw) * nz;
      const y2 = Math.cos(tilt) * dy - Math.sin(tilt) * z1;
      const z2 = Math.sin(tilt) * dy + Math.cos(tilt) * z1;
      const lat = Math.asin(Math.max(-1, Math.min(1, y2)));
      const lon = Math.atan2(z2, x1);
      const diff = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
      const b = land(lon, lat) ? 0.3 + 0.66 * diff ** 0.8 : 0.05 + 0.12 * diff;
      line += CHARS[Math.min(CHARS.length - 1, Math.round(b * (CHARS.length - 1)))];
    }
    out.push(line.replace(/\s+$/, ""));
  }
  return out.join("\n");
}
