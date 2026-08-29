// Fabrique un petit pack de sprites FACTICES pour vérifier le chargeur.
// Aucune image Pokémon : de simples silhouettes colorées avec le numéro en clair.
// Sortie dans public/sprites/ (ignoré par git).
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Chiffres 3×5 pour écrire le numéro sur le sprite.
const GLYPHS = {
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'],
};

function draw(size, hue, label, back) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  const cx = size / 2, cy = size * .58, rx = size * .3, ry = size * .34;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
    if (d > 1.18) continue;
    if (d > 1) { set(x, y, 20, 24, 36); continue; }          // contour
    const k = back ? .55 : 1;
    set(x, y, Math.round(hue[0] * k), Math.round(hue[1] * k), Math.round(hue[2] * k));
  }
  // numéro en haut
  const txt = String(label);
  const sc = Math.max(2, Math.floor(size / 40));
  let ox = Math.round(cx - (txt.length * 4 * sc) / 2);
  for (const ch of txt) {
    const gph = GLYPHS[ch] ?? GLYPHS[0];
    gph.forEach((row, ry2) => [...row].forEach((c, rx2) => {
      if (c !== '1') return;
      for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++)
        set(ox + rx2 * sc + a, Math.round(size * .12) + ry2 * sc + b, 245, 248, 252);
    }));
    ox += 4 * sc;
  }
  return px;
}

/*
 * Par défaut : pack national factice dans public/sprites (numéros).
 * Avec --out <dir> --ids a,b : images nommées par identifiant, pour vérifier le
 * dossier versionné des espèces de Valmore. La destination est explicite afin que
 * le test puisse écrire dans dist/ sans jamais toucher aux vraies images.
 */
const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const out = arg('--out') ?? 'public/sprites';
const ids = arg('--ids');

mkdirSync(`${out}/back`, { recursive: true });
if (ids) {
  const liste = ids.split(',');
  liste.forEach((id, i) => {
    const hue = [[232, 118, 58], [90, 170, 230], [120, 200, 120]][i % 3];
    writeFileSync(`${out}/${id}.png`, encodePNG(96, draw(96, hue, i + 1, false)));
    writeFileSync(`${out}/back/${id}.png`, encodePNG(96, draw(96, hue, i + 1, true)));
  });
  writeFileSync(`${out}/index.json`, JSON.stringify({ ids: liste }, null, 2));
  console.log(`images factices écrites dans ${out} : ${liste.join(', ')}`);
} else {
  const PACK = [
    [16, [232, 168, 90]],   // Roucool
    [25, [247, 208, 44]],   // Pikachu
    [1, [127, 200, 168]],   // Bulbizarre
  ];
  for (const [dex, hue] of PACK) {
    writeFileSync(`${out}/${dex}.png`, encodePNG(96, draw(96, hue, dex, false)));
    writeFileSync(`${out}/back/${dex}.png`, encodePNG(96, draw(96, hue, dex, true)));
  }
  writeFileSync(`${out}/index.json`, JSON.stringify({ dex: PACK.map(([d]) => d) }, null, 2));
  console.log(`pack factice écrit : ${PACK.length} espèces (face + dos) + index.json`);
}
