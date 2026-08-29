import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const ROOT = 'dist';
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const buf = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(4173, r));

const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 890 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => { errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'')); console.log('PAGEERROR', e.message); });
page.on('console', (m) => { if (m.type() === 'error' && !/sprites\//.test(m.text() + m.location().url)) { errors.push('CONSOLE: ' + m.text()); console.log('CONSOLE', m.text()); } });

await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); };
await shot('01-title');

// Nouvelle partie
await page.click('[data-act="new"]');
await page.waitForTimeout(500);
// choix du sexe (obligatoire, avant la saisie du nom)
await page.locator('#overlay button.card').first().click();
await page.waitForTimeout(400);
await shot('01b-genre');
// saisie du nom
await page.fill('#overlay input', 'Testeur');
await page.click('#overlay .btn.primary');
await page.waitForTimeout(400);

const advance = async (n = 10) => {
  for (let i = 0; i < n; i++) {
    if (await page.locator('#dialogue').isVisible()) { await page.locator('#dlg-text').click(); await page.waitForTimeout(320); }
    else break;
  }
};
await advance();
await shot('02-starter');

// choix du starter (premier)
const cards = page.locator('#overlay .card');
if (await cards.count()) {
  await cards.first().click();
  await page.waitForTimeout(400);
  const yes = page.locator('#dlg-choices .btn').first();
  if (await yes.count()) await yes.click();
}
await page.waitForTimeout(500);
await advance();
await page.waitForTimeout(1500);
await shot('03-overworld');

// état interne
const st = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pokelike.save.v1') || '{}');
  return { party: (s.party || []).map((m) => m.sp + ' N.' + m.lv), zone: s.zone, name: s.name };
});
console.log('SAVE:', JSON.stringify(st));

// se déplacer vers le nord pendant un moment
for (let i = 0; i < 60; i++) {
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(60); await page.keyboard.up('ArrowUp');
  await page.waitForTimeout(30);
}
await shot('04-walk');

// menu
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { if (++n < 90) requestAnimationFrame(tick); else res(Math.round((n * 1000) / (performance.now() - t0))); };
  requestAnimationFrame(tick);
}));
console.log('FPS (rendu logiciel, plancher):', fps);
console.log('Rendu:', JSON.stringify(await page.evaluate(() => window.pokelike.debugPerf())));
console.log('MODE avant menu:', await page.evaluate(() => window.pokelike?.mode));
await page.click('#menu-btn');
await page.waitForTimeout(600);
console.log('OVERLAY hidden?', await page.evaluate(() => document.getElementById('overlay').hidden), 'html len', await page.evaluate(() => document.getElementById('overlay').innerHTML.length));
await shot('05-menu');
await page.click('#overlay .ov-head .round-btn');
await page.waitForTimeout(300);

console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'AUCUNE ERREUR JS');
await browser.close();
server.close();
