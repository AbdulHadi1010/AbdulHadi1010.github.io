// Renders public/og.png (1200×630): the same ASCII globe as the hero, computed on
// the CPU, laid out as SVG text and rasterised with sharp.
// Run: node scripts/build-og.mjs
import fs from "node:fs";
import sharp from "sharp";

const src = fs.readFileSync("src/data/landmask.ts", "utf8");
const W = +src.match(/LAND_W = (\d+)/)[1];
const H = +src.match(/LAND_H = (\d+)/)[1];
const bits = Buffer.from(src.match(/LAND_BITS = "([^"]+)"/)[1], "base64");
const land = (lon, lat) => {
  const x = Math.floor(((lon / (2 * Math.PI) + 0.5) % 1 + 1) % 1 * W);
  const y = Math.min(H - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * H)));
  const i = y * W + x;
  return bits[i >> 3] & (1 << (i & 7)) ? 1 : 0;
};

const CHARS = " .·:-=+*≡#%@";
const BG = "#e2f3f0", INK = "#b2d4ce", MID = "#4b7282", TEXT = "#00405a", ACC = "#f7931e";
const cell = 13, cols = Math.ceil(1200 / (cell * 0.62)), rows = Math.ceil(630 / cell);
const cw = 1200 / cols;
const cx = 880, cy = 330, R = 300;
const yaw = 1.2, tilt = 0.38;
const L = (() => { const v = [-0.35, 0.45, 0.9]; const m = Math.hypot(...v); return v.map((a) => a / m); })();

let glyphs = "";
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const px = (c + 0.5) * cw, py = (r + 0.5) * cell;
    const dx = (px - cx) / R, dy = -(py - cy) / R;
    const d2 = dx * dx + dy * dy;
    if (d2 >= 1) continue;
    const nz = Math.sqrt(1 - d2);
    // rotX(tilt) * rotY(yaw) * n
    const x1 = Math.cos(yaw) * dx + Math.sin(yaw) * nz;
    const z1 = -Math.sin(yaw) * dx + Math.cos(yaw) * nz;
    const y2 = Math.cos(tilt) * dy - Math.sin(tilt) * z1;
    const z2 = Math.sin(tilt) * dy + Math.cos(tilt) * z1;
    const lat = Math.asin(Math.max(-1, Math.min(1, y2)));
    const lon = Math.atan2(z2, x1);
    const diff = Math.max(0, dx * L[0] + dy * L[1] + nz * L[2]);
    const isLand = land(lon, lat);
    let b = isLand ? 0.3 + 0.66 * diff ** 0.8 : 0.04 + 0.14 * diff;
    const sp = Math.PI / 12;
    const mLon = Math.abs(((lon / sp + 0.5) % 1 + 1) % 1 - 0.5) * sp * Math.cos(lat);
    const mLat = Math.abs(((lat / sp + 0.5) % 1 + 1) % 1 - 0.5) * sp;
    if (!isLand && (mLon < 0.025 || mLat < 0.025)) b += 0.2;
    b = Math.min(1, b);
    const idx = Math.round(b * (CHARS.length - 1));
    if (idx === 0) continue;
    const col = b > 0.85 ? ACC : b > 0.25 ? MID : INK;
    glyphs += `<text x="${px.toFixed(1)}" y="${(py + 4).toFixed(1)}" fill="${col}">${CHARS[idx]}</text>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="${BG}"/>
<g font-family="Consolas, 'DejaVu Sans Mono', monospace" font-size="11" text-anchor="middle">${glyphs}</g>
<rect width="760" height="630" fill="url(#fade)"/>
<defs><linearGradient id="fade" x1="0" x2="1"><stop offset="0.55" stop-color="${BG}"/><stop offset="1" stop-color="${BG}" stop-opacity="0"/></linearGradient></defs>
<circle cx="72" cy="114" r="4" fill="${ACC}"/>
<text x="88" y="119" font-family="Consolas, monospace" font-size="15" letter-spacing="1.5" fill="${MID}">OPEN TO INFRA ROLES AND CONTRACTS</text>
<text x="66" y="250" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-weight="700" font-size="88" fill="${TEXT}">Abdul Hadi</text>
<text x="70" y="318" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-weight="700" font-size="34" fill="${ACC}">Cloud · DevOps · AI infrastructure</text>
<text x="70" y="400" font-family="'Segoe UI', Arial, sans-serif" font-style="italic" font-size="26" fill="${TEXT}">Kubernetes, AWS, Azure, private clouds</text>
<text x="70" y="436" font-family="'Segoe UI', Arial, sans-serif" font-style="italic" font-size="26" fill="${TEXT}">and the pipelines that ship to them.</text>
<line x1="70" y1="540" x2="1130" y2="540" stroke="#c2ddd8"/>
<text x="70" y="580" font-family="Consolas, monospace" font-size="16" letter-spacing="1.2" fill="${MID}">CKA · AWS SOLUTIONS ARCHITECT · AZURE</text>
<text x="1130" y="580" text-anchor="end" font-family="Consolas, monospace" font-size="16" letter-spacing="1.2" fill="${MID}">ABDULHADI1010.GITHUB.IO</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/og.png");
console.log("wrote public/og.png");
