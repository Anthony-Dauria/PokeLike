// Cherche la taille du « gros pixel » de la planche : pour chaque facteur k, on
// mesure la proportion de pixels identiques à celui du coin de leur bloc k×k.
// Le plus grand k qui reste quasi parfait est l'échelle native du dessin.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const b64 = (await readFile(process.argv[2])).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('about:blank');
console.log(await page.evaluate(async (b64) => {
  const bmp = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const W = bmp.width, H = bmp.height;
  const c = new OffscreenCanvas(W, H); const x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  const at = (px, py) => { const i = (py * W + px) * 4; return (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; };
  const out = [];
  for (let k = 1; k <= 8; k++) {
    let same = 0, tot = 0;
    for (let y = 0; y < H; y += 1) for (let px = 0; px < W; px += 1) {
      const bx = Math.floor(px / k) * k, by = Math.floor(y / k) * k;
      tot++; if (at(px, y) === at(bx, by)) same++;
    }
    out.push(`k=${k} : ${(same / tot * 100).toFixed(2)} %`);
  }
  return out.join('\n');
}, b64));
await browser.close();
