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
  // --- érosion du liseré de « sticker » ---
  // La planche entoure chaque sujet d'un contour clair très peu saturé. Conservé,
  // il dessine un halo blanc autour de chaque sprite une fois en jeu. On absorbe
  // donc dans le fond les pixels clairs et gris qui le touchent, sur deux passes :
  // assez pour le liseré, trop peu pour entamer une surface blanche du dessin.
  for (let passe = 0; passe < 2; passe++) {
    const ajout = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const q = y * W + x;
        if (fond[q]) continue;
        const i = q * 4;
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        if (mn < 190 || mx - mn > 40) continue;
        if (fond[q - 1] || fond[q + 1] || fond[q - W] || fond[q + W]) ajout.push(q);
      }
    }
    for (const q of ajout) fond[q] = 1;
  }

  for (let q = 0; q < W * H; q++) if (fond[q]) d[q * 4 + 3] = 0;
  // --- débordement de couleur sous la transparence ---
  // Les pixels devenus transparents gardent leur blanc d'origine ; le filtrage le
  // mélange aux bords du sujet. On repeint l'anneau avec la couleur des voisins.
  let bord = new Uint8Array(W * H);
  for (let q = 0; q < W * H; q++) bord[q] = d[q * 4 + 3] > 0 ? 1 : 0;
  for (let passe = 0; passe < 4; passe++) {
    const suivant = new Uint8Array(bord);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const q = y * W + x;
        if (bord[q]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const [ox, oy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const nq = ny * W + nx;
          if (!bord[nq]) continue;
          r += d[nq * 4]; g += d[nq * 4 + 1]; b += d[nq * 4 + 2]; n++;
        }
        if (!n) continue;
        d[q * 4] = Math.round(r / n); d[q * 4 + 1] = Math.round(g / n); d[q * 4 + 2] = Math.round(b / n);
        suivant[q] = 1;
      }
    }
    bord = suivant;
  }
  sx.putImageData(img, 0, 0);

  const out = [];
  for (const it of spec.items) {
    const s = it.scale ?? spec.scale ?? 1;
    const dw = Math.max(1, Math.round(it.w * s)), dh = Math.max(1, Math.round(it.h * s));
    // « tight » : cadre collé au sujet, pour les décors dimensionnés par le code.
    const serre = it.tight ?? spec.tight;
    const pad = spec.pad ?? 2;
    const fw = serre ? dw + pad * 2 : (it.frameW ?? spec.frameW);
    const fh = serre ? dh + pad * 2 : (it.frameH ?? spec.frameH);
    const c = new OffscreenCanvas(fw, fh); const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = true;
    cx.imageSmoothingQuality = 'high';
    // Centré horizontalement, calé en bas : le sprite pose sur le sol.
    const ancre = serre ? 'centre' : (it.anchor ?? spec.anchor ?? 'bas');
    const px = Math.round((fw - dw) / 2);
    const py = ancre === 'centre' ? Math.round((fh - dh) / 2) : fh - dh - pad;
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
