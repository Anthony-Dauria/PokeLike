/*
 * Repère les sujets d'une planche. Deux modes selon le fond :
 *   --clair (défaut) : fond blanc, on cherche ce qui ne l'est pas ;
 *   --sombre         : fond noir, on cherche ce qui est lumineux.
 * Dilatation avant étiquetage pour recoller les morceaux détachés.
 */
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const file = args[0];
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? +args[i + 1] : d; };
const sombre = args.includes('--sombre');
const dilate = val('--dilate', 6), minArea = val('--min', 900), seuil = val('--seuil', sombre ? 90 : 244);
const b64 = (await readFile(file)).toString('base64');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
const res = await page.evaluate(async ({ b64, dilate, minArea, seuil, sombre }) => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const W = bmp.width, H = bmp.height;
  const c = new OffscreenCanvas(W, H); const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;

  const ink = new Uint8Array(W * H);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    if (d[i + 3] < 24) continue;
    const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
    ink[p] = sombre ? (lum > seuil ? 1 : 0) : (lum < seuil ? 1 : 0);
  }
  const tmp = new Uint8Array(W * H), dil = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    let v = 0;
    for (let k = -dilate; k <= dilate && !v; k++) { const nx = xx + k; if (nx >= 0 && nx < W && ink[y * W + nx]) v = 1; }
    tmp[y * W + xx] = v;
  }
  for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
    let v = 0;
    for (let k = -dilate; k <= dilate && !v; k++) { const ny = y + k; if (ny >= 0 && ny < H && tmp[ny * W + xx]) v = 1; }
    dil[y * W + xx] = v;
  }
  const seen = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  const boxes = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (!dil[p0] || seen[p0]) continue;
    let sp = 0; stack[sp++] = p0; seen[p0] = 1;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, encre = 0;
    while (sp) {
      const p = stack[--sp];
      const px = p % W, py = (p / W) | 0;
      if (ink[p]) encre++;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const np = ny * W + nx;
        if (dil[np] && !seen[np]) { seen[np] = 1; stack[sp++] = np; }
      }
    }
    if (encre >= minArea) boxes.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, encre });
  }
  return { W, H, boxes };
}, { b64, dilate, minArea, seuil, sombre });
await browser.close();
console.log(JSON.stringify(res));
