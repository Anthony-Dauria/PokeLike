/*
 * Découpe une planche en PNG individuels.
 *
 * Le fond blanc est rendu transparent par remplissage depuis les bords, et non
 * par simple test de couleur : la blouse du professeur est blanche elle aussi,
 * un test global lui aurait troué le vêtement.
 *
 * Chaque sujet est posé dans un cadre carré commun, à l'échelle globale demandée.
 * C'est ce rapport « hauteur du sujet / hauteur du cadre » qui fixe la taille en
 * jeu : garder une seule échelle pour toute la planche préserve donc exactement
 * les proportions voulues par le dessin entre les trois stades.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [, , sheet, specFile] = process.argv;
const spec = JSON.parse(await readFile(specFile, 'utf8'));
const b64 = (await readFile(sheet)).toString('base64');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
const sorties = await page.evaluate(async ({ b64, spec }) => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const W = bmp.width, H = bmp.height;
  const src = new OffscreenCanvas(W, H); const sx = src.getContext('2d');
  sx.drawImage(bmp, 0, 0);
  const img = sx.getImageData(0, 0, W, H);
  const d = img.data;

  // --- fond : remplissage depuis les bords sur les pixels quasi blancs ---
  const blanc = (p) => d[p] > 240 && d[p + 1] > 240 && d[p + 2] > 240;
  const fond = new Uint8Array(W * H);
  const pile = new Int32Array(W * H);
  let sp = 0;
  const pousse = (px, py) => {
    const q = py * W + px;
    if (fond[q] || !blanc(q * 4)) return;
    fond[q] = 1; pile[sp++] = q;
  };
  for (let x = 0; x < W; x++) { pousse(x, 0); pousse(x, H - 1); }
  for (let y = 0; y < H; y++) { pousse(0, y); pousse(W - 1, y); }
  while (sp) {
    const q = pile[--sp];
    const px = q % W, py = (q / W) | 0;
    if (px > 0) pousse(px - 1, py);
    if (px < W - 1) pousse(px + 1, py);
    if (py > 0) pousse(px, py - 1);
    if (py < H - 1) pousse(px, py + 1);
  }
  for (let q = 0; q < W * H; q++) if (fond[q]) d[q * 4 + 3] = 0;
  sx.putImageData(img, 0, 0);

  const out = [];
  for (const it of spec.items) {
    const s = it.scale ?? spec.scale ?? 1;
    const fw = it.frameW ?? spec.frameW, fh = it.frameH ?? spec.frameH;
    const dw = Math.max(1, Math.round(it.w * s)), dh = Math.max(1, Math.round(it.h * s));
    const c = new OffscreenCanvas(fw, fh); const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    // Centré horizontalement, calé en bas : le sprite pose sur le sol.
    const ancre = it.anchor ?? spec.anchor ?? 'bas';
    const px = Math.round((fw - dw) / 2);
    const py = ancre === 'centre' ? Math.round((fh - dh) / 2) : fh - dh - (spec.pad ?? 2);
    cx.drawImage(src, it.x, it.y, it.w, it.h, px, py, dw, dh);
    const blob = await c.convertToBlob({ type: 'image/png' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    out.push({ name: it.name, w: fw, h: fh, sujet: dh, data: [...buf] });
  }
  return out;
}, { b64, spec });
await browser.close();

for (const o of sorties) {
  const dest = `${spec.out}/${o.name}.png`;
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(o.data));
  console.log(`${dest.padEnd(38)} cadre ${o.w}×${o.h}  sujet ${o.sujet} px  →  ${(o.sujet / o.h * 96).toFixed(0)} px DS`);
}
