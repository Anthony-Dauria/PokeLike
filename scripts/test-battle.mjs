import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = join('dist', normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const b = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => server.listen(4175, r));


const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 890 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => { errors.push('PAGEERROR: ' + e.message); console.log('PAGEERROR', e.message, e.stack); });
page.on('console', (m) => { if (m.type() === 'error' && !/sprites\//.test(m.text() + m.location().url)) { errors.push('CONSOLE: ' + m.text()); console.log('CONSOLE', m.text()); } });

await page.goto('http://localhost:4175/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Nouvelle partie complète depuis l'écran-titre
await page.click('[data-act="new"]');
await page.waitForTimeout(400);
const yesOverwrite = page.locator('#dlg-choices .btn').first();
if (await yesOverwrite.count()) { await yesOverwrite.click(); await page.waitForTimeout(300); }
await page.fill('#overlay input', 'Duel');
await page.click('#overlay .btn.primary');
const advance = async (n = 12) => {
  for (let i = 0; i < n; i++) {
    try {
      if (!(await page.locator('#dialogue').isVisible())) break;
      await page.locator('#dlg-text').click({ timeout: 1200 });
    } catch { /* dialogue fermé */ }
    await page.waitForTimeout(300);
  }
};
await advance();
await page.locator('#overlay .card').first().click();
await page.waitForTimeout(400);
await page.locator('#dlg-choices .btn').first().click();
await page.waitForTimeout(400);
await advance();
await page.waitForTimeout(1200);

// --- combat sauvage ---
await page.evaluate(() => window.pokelike.debugWild('pidgey', 6));
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/10-battle-intro.png` });
const skipLog = async (n = 8) => {
  for (let i = 0; i < n; i++) {
    try {
      if (!(await page.locator('#bt-log').isVisible())) break;
      await page.locator('#bt-log').click({ timeout: 1200 });
    } catch { /* le log a disparu entre-temps */ }
    await page.waitForTimeout(220);
  }
};
await skipLog(10);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/11-battle-menu.png` });

// 4 tours : Attaque -> première capacité
for (let turn = 0; turn < 6; turn++) {
  if (await page.locator('#bt-menu').isVisible()) {
    const atk = page.locator('#bt-menu .move-btn').first();
    if (await atk.count()) { await atk.click(); await page.waitForTimeout(300); }
    const mv = page.locator('#bt-menu .move-btn').first();
    if (await mv.count()) { await mv.click(); await page.waitForTimeout(400); }
  }
  await skipLog(14);
  await page.waitForTimeout(400);
  if (!(await page.locator('#battle-ui').isVisible())) break;
}
await page.screenshot({ path: `${OUT}/12-battle-mid.png` });
await page.waitForTimeout(500);
await skipLog(20);
await page.waitForTimeout(1500);

console.log('MODE après combat:', await page.evaluate(() => window.pokelike.mode));
console.log('ÉQUIPE:', await page.evaluate(() => window.pokelike.debugParty?.() ?? 'n/a'));
await page.screenshot({ path: `${OUT}/13-after-battle.png` });

console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'AUCUNE ERREUR JS');
await browser.close();
server.close();
