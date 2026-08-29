// Génère les icônes PNG de la PWA sans aucune dépendance externe.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Dessine une "Sphère" stylisée façon capsule de capture, sur fond nuit.
function draw(size, inset) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const R = (size / 2) * inset;
  const put = (x, y, r, g, b, a = 255) => {
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Fond : dégradé nuit
      const t = y / size;
      put(x, y, Math.round(13 + 12 * t), Math.round(27 + 22 * t), Math.round(42 + 30 * t));
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) continue;
      const shade = 1 - 0.35 * ((dx + dy) / (2 * R) + 0.5);
      let r, g, b;
      if (d > R * 0.93) { r = 20; g = 24; b = 32; }           // contour
      else if (Math.abs(dy) < R * 0.09) { r = 20; g = 24; b = 32; } // bande centrale
      else if (d < R * 0.24) {
        r = d < R * 0.15 ? 240 : 24; g = d < R * 0.15 ? 245 : 28; b = d < R * 0.15 ? 250 : 36;
      } else if (dy < 0) { r = 232; g = 68; b = 78; }          // haut rouge
      else { r = 240; g = 243; b = 248; }                      // bas blanc
      // reflet
      const hl = Math.hypot(x - (cx - R * 0.35), y - (cy - R * 0.38));
      const light = hl < R * 0.18 ? 1.25 : 1;
      put(x, y,
        Math.min(255, Math.round(r * shade * light)),
        Math.min(255, Math.round(g * shade * light)),
        Math.min(255, Math.round(b * shade * light)));
    }
  }
  return px;
}

mkdirSync('public/icons', { recursive: true });
const outs = [
  ['public/icons/icon-192.png', 192, 0.84],
  ['public/icons/icon-512.png', 512, 0.84],
  ['public/icons/icon-512-maskable.png', 512, 0.62],
  ['public/icons/apple-touch-icon.png', 180, 0.84],
  ['public/icons/favicon.png', 64, 0.86],
];
for (const [file, size, inset] of outs) {
  writeFileSync(file, encodePNG(size, draw(size, inset)));
  console.log('écrit', file, size + 'px');
}
