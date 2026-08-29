import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/manifest+json', '.md':'text/markdown' };
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
await new Promise((r) => server.listen(4216, r));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 890 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto('http://localhost:4216/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// intro complète : sexe → nom → professeur → starters
await page.click('[data-act="new"]');
await page.waitForTimeout(700);
await page.locator('#overlay button.card').nth(1).click();
await page.waitForTimeout(600);
await page.locator('#overlay input').fill('Flora');
await page.locator('#overlay .btn').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'screenshots/90-prof.png' });
for (let i = 0; i < 10; i++) {
  if (!(await page.locator('#dialogue').isVisible())) break;
  try { await page.locator('#dlg-text').click({ timeout: 1200 }); } catch { break; }
  await page.waitForTimeout(450);
}
await page.waitForTimeout(600);
await page.screenshot({ path: 'screenshots/91-starters.png' });

// on prend le starter feu puis on lance un combat
await page.locator('#overlay button.card').first().click();
await page.waitForTimeout(700);
const oui = page.locator('#dlg-choices .btn').first();
if (await oui.count()) { await oui.click(); await page.waitForTimeout(700); }
for (let i = 0; i < 8; i++) {
  if (!(await page.locator('#dialogue').isVisible())) break;
  try { await page.locator('#dlg-text').click({ timeout: 1200 }); } catch { break; }
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1500);
await page.evaluate(() => window.pokelike.debugGiveLead('pyrodrakon', 40));
await page.evaluate(() => window.pokelike.debugWild('nocteracine', 40));
await page.waitForTimeout(3500);
for (let i = 0; i < 8; i++) { try { if (!(await page.locator('#bt-log').isVisible())) break; await page.locator('#bt-log').click({ timeout: 800 }); } catch {} await page.waitForTimeout(200); }
await page.waitForTimeout(1500);
console.log('source:', JSON.stringify(await page.evaluate(() => window.pokelike.debugSpriteSource())));
await page.screenshot({ path: 'screenshots/92-combat-valmore.png' });
await browser.close(); server.close();
