/*
 * Découpe une bande horizontale en colonnes, par profil d'encre puis séparation
 * sur les creux. Plus fiable que les composantes connexes quand les éléments
 * voisins se touchent presque.
 *   node art/bands.mjs <planche> <y0> <y1> [--sombre] [--gap n] [--seuil n]
 */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const a = process.argv.slice(2);
const val = (n, d) => { const i = a.indexOf(n); return i >= 0 ? +a[i + 1] : d; };
const [file, y0, y1] = a;
const sombre = a.includes('--sombre');
const gapMin = val('--gap', 8), lum = val('--lum', sombre ? 70 : 244), seuil = val('--seuil', 2);
const b64 = (await readFile(file)).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
const out = await page.evaluate(async ({ b64, y0, y1, gapMin, seuil, lum, sombre }) => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const W = bmp.width, H = bmp.height;
  const c = new OffscreenCanvas(W, H); const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  const encre = (px, py) => {
    const i = (py * W + px) * 4;
    if (d[i + 3] < 24) return false;
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    return sombre ? l > lum : l < lum;
  };
  const col = new Int32Array(W);
  for (let px = 0; px < W; px++) { let n = 0; for (let py = y0; py <= Math.min(y1, H - 1); py++) if (encre(px, py)) n++; col[px] = n; }
  const segs = [];
  let s = -1, vide = 0;
  for (let px = 0; px < W; px++) {
    if (col[px] >= seuil) { if (s < 0) s = px; vide = 0; }
    else if (s >= 0 && ++vide >= gapMin) { segs.push([s, px - vide]); s = -1; vide = 0; }
  }
  if (s >= 0) segs.push([s, W - 1]);
  return segs.map(([p, q]) => {
    let t = H, bo = -1;
    for (let py = y0; py <= Math.min(y1, H - 1); py++) {
      let vu = false;
      for (let px = p; px <= q && !vu; px++) if (encre(px, py)) vu = true;
      if (vu) { if (py < t) t = py; bo = py; }
    }
    return { x: p, y: t, w: q - p + 1, h: bo - t + 1 };
  });
}, { b64, y0: +y0, y1: +y1, gapMin, seuil, lum, sombre });
await browser.close();
console.log(JSON.stringify(out));
