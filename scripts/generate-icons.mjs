/**
 * Liga Zaltbommel PWA ikonlarını bağımlılık olmadan üretir (192x192, 512x512 + maskable).
 * Çalıştırmak için: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT_DIR = 'public/icons';
const GREEN = [15, 107, 79];
const DARK = [15, 26, 21];
const WHITE = [247, 251, 248];
const GOLD = [216, 167, 53];
const SS = 3; // supersampling

/* --- geometri yardımcıları --- */

const star = (cx, cy, outer, inner, rot) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = rot + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

function inPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distToPolyline(x, y, points) {
  let d = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    d = Math.min(d, distToSegment(x, y, points[i], points[i + 1]));
  }
  return d;
}

function inRoundedRect(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius);
  const cy = Math.min(Math.max(y, radius), size - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

function inRect(x, y, left, top, right, bottom) {
  return x >= left && x <= right && y >= top && y <= bottom;
}

function shield(size, inset) {
  return [
    [inset, size * 0.23],
    [size - inset, size * 0.23],
    [size - inset, size * 0.56],
    [size * 0.79, size * 0.78],
    [size * 0.5, size * 0.88],
    [size * 0.21, size * 0.78],
    [inset, size * 0.56],
  ];
}

function inStroke(x, y, points, width, closed = false) {
  const polyline = closed ? [...points, points[0]] : points;
  return distToPolyline(x, y, polyline) <= width / 2;
}

function inCircleStroke(x, y, cx, cy, r, width) {
  return Math.abs(Math.hypot(x - cx, y - cy) - r) <= width / 2;
}

function inMonogramL(x, y, size) {
  const l = size * 0.28;
  const r = size * 0.52;
  const t = size * 0.36;
  const b = size * 0.72;
  const w = size * 0.075;
  return inRect(x, y, l, t, l + w, b) || inRect(x, y, l, b - w, r, b);
}

function inMonogramZ(x, y, size) {
  const l = size * 0.56;
  const r = size * 0.84;
  const t = size * 0.36;
  const b = size * 0.72;
  const w = size * 0.075;
  const diag = distToSegment(x, y, [r, t + w / 2], [l, b - w / 2]) <= w * 0.72;
  return inRect(x, y, l, t, r, t + w) || inRect(x, y, l, b - w, r, b) || diag;
}

/* --- tek pikselin rengi --- */

function shade(x, y, size, maskable) {
  const radius = maskable ? size / 2 : size * 0.19;

  if (!inRoundedRect(x, y, size, radius)) return null; // şeffaf

  const outerShield = shield(size, maskable ? size * 0.22 : size * 0.19);
  const innerShield = shield(size, maskable ? size * 0.28 : size * 0.25);
  const starShape = star(size * 0.74, size * 0.18, size * 0.065, size * 0.028, -Math.PI / 2);

  if (inPolygon(x, y, starShape)) return GOLD;
  if (inMonogramL(x, y, size) || inMonogramZ(x, y, size)) return WHITE;
  if (inStroke(x, y, [[size * 0.36, size * 0.76], [size * 0.5, size * 0.81], [size * 0.64, size * 0.76]], size * 0.035)) {
    return GOLD;
  }
  if (inStroke(x, y, innerShield, size * 0.026, true)) return WHITE;
  if (distToSegment(x, y, [size * 0.5, size * 0.25], [size * 0.5, size * 0.82]) <= size * 0.011) {
    return WHITE;
  }
  if (inCircleStroke(x, y, size * 0.5, size * 0.53, size * 0.1, size * 0.02)) return WHITE;
  if (inPolygon(x, y, outerShield)) return GREEN;

  return DARK;
}

/* --- PNG kodlayıcı --- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --- render --- */

function render(size, maskable) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const color = shade(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, maskable);
          if (color) {
            r += color[0];
            g += color[1];
            b += color[2];
            a += 255;
          }
        }
      }
      const samples = SS * SS;
      const i = (y * size + x) * 4;
      const covered = a / 255;
      pixels[i] = covered ? Math.round(r / covered) : 0;
      pixels[i + 1] = covered ? Math.round(g / covered) : 0;
      pixels[i + 2] = covered ? Math.round(b / covered) : 0;
      pixels[i + 3] = Math.round(a / samples);
    }
  }
  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
]) {
  writeFileSync(`${OUT_DIR}/${name}`, render(size, maskable));
  console.log(`${OUT_DIR}/${name} (${size}x${size})`);
}
