/* Assemble des PNG en une planche de contrôle, pour les inspecter d'un coup. */
import { chromium } from 'playwright';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const dir = process.argv[2], out = process.argv[3], cols = +(process.argv[4] ?? 6), cell = +(process.argv[5] ?? 150);
const noms = (await readdir(dir)).filter((f) => f.endsWith('.png')).sort();
const imgs = [];
for (const n of noms) imgs.push([n, (await readFile(join(dir, n))).toString('base64')]);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
const b64 = await page.evaluate(async ({ imgs, cols, cell }) => {
  const rows = Math.ceil(imgs.length / cols);
  const c = new OffscreenCanvas(cols * cell, rows * (cell + 16));
  const x = c.getContext('2d');
  x.fillStyle = '#20242c'; x.fillRect(0, 0, c.width, c.height);
  x.imageSmoothingEnabled = false;
  for (let i = 0; i < imgs.length; i++) {
    const [nom, data] = imgs[i];
    const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + data)).blob());
    const cx = (i % cols) * cell, cy = Math.floor(i / cols) * (cell + 16);
    const k = Math.min((cell - 8) / bmp.width, (cell - 8) / bmp.height);
    const w = bmp.width * k, h = bmp.height * k;
    x.drawImage(bmp, cx + (cell - w) / 2, cy + (cell - h) / 2, w, h);
    x.fillStyle = '#cfe0f5'; x.font = '11px sans-serif'; x.textAlign = 'center';
    x.fillText(nom.replace('.png', ''), cx + cell / 2, cy + cell + 11);
  }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const buf = new Uint8Array(await blob.arrayBuffer());
  // Par tranches : étaler un tampon entier dans String.fromCharCode fait déborder
  // la pile dès quelques dizaines de milliers d'octets.
  let bin = '';
  for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode(...buf.subarray(i, i + 8192));
  return btoa(bin);
}, { imgs, cols, cell });
await writeFile(out, Buffer.from(b64, 'base64'));
await browser.close();
console.log(out, '—', noms.length, 'images');
