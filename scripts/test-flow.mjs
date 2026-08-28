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
await new Promise((r) => server.listen(4177, r));


const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 890 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errors = [];
page.on('pageerror', (e) => { errors.push('PAGEERROR: ' + e.message); console.log('PAGEERROR', e.message, e.stack); });
page.on('console', (m) => { if (m.type() === 'error') { errors.push('CONSOLE: ' + m.text()); console.log('CONSOLE', m.text()); } });
await page.goto('http://localhost:4177/index.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const adv = async (n = 20) => { for (let i = 0; i < n; i++) { try { if (!(await page.locator('#dialogue').isVisible())) break; await page.locator('#dlg-text').click({ timeout: 900 }); } catch {} await page.waitForTimeout(240); } };
const skip = async (n = 20) => { for (let i = 0; i < n; i++) { try { if (!(await page.locator('#bt-log').isVisible())) break; await page.locator('#bt-log').click({ timeout: 900 }); } catch {} await page.waitForTimeout(160); } };

await page.evaluate(() => window.pokelike.newGameQuick('Flux', 'germinuit'));
await page.waitForTimeout(1500);

// équipe surpuissante pour valider les combats scriptés
await page.evaluate(() => {
  const g = window.pokelike;
  ['nocteracine', 'abyssire', 'pyrodrakon', 'dragonite', 'togekiss'].forEach((sp) => g.debugGive(sp, 70));
});

// 0. Cohérence des données : toute espèce citée doit exister
const badRefs = await page.evaluate(() => window.pokelike.debugValidate());
console.log('DEX:', await page.evaluate(() => window.pokelike.debugDexCount()), 'espèces | références invalides:', badRefs.length);
if (badRefs.length) console.log(badRefs.slice(0, 30).join('\n'));

// 1. Toutes les cartes se génèrent-elles ?
const gen = await page.evaluate(async () => {
  const g = window.pokelike;
  const out = [];
  const ids = g.debugAllMapIds();
  for (const id of ids) {
    try { const m = g.debugBuildMap(id); out.push(`${id}:${m.w}x${m.h}:${m.ents}`); }
    catch (e) { out.push(`${id}: ERREUR ${e.message}`); }
  }
  return out;
});
const bad = gen.filter((l) => l.includes('ERREUR'));
console.log(`CARTES générées: ${gen.length}, erreurs: ${bad.length}`);
console.log('-- étape cartes OK');
if (bad.length) console.log(bad.join('\n'));

// 2. Centre de soins
await page.evaluate(() => window.pokelike.debugGoto('in:bourg-aurore:center'));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/20-centre.png` });
console.log('-- centre OK');

// 2b. Dex rempli (aperçu)
await page.evaluate(() => window.pokelike.debugSeeAll());
await page.click('#menu-btn');   // clic réel : le HUD écoute pointerdown, pas click
await page.waitForTimeout(500);
const dexCard = page.locator('#overlay button.card').nth(2);   // 0=Équipe 1=Sac 2=Dex
if (await dexCard.count()) { await dexCard.click(); await page.waitForTimeout(700); }
await page.screenshot({ path: `${OUT}/32-dex.png` });
try { await page.locator('#overlay .ov-head .round-btn').click({ timeout: 1500 }); } catch {}
await page.waitForTimeout(400);

// 3. Ville avec arène
await page.evaluate(() => window.pokelike.debugGoto('serenis'));
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/21-serenis.png` });

// 4. Intérieur d'arène
await page.evaluate(() => window.pokelike.debugGoto('gym:g1'));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/22-arene.png` });
console.log('-- arène OK');

// 5. Combat d'arène complet
await page.evaluate(() => window.pokelike.debugGym('g1'));
await page.waitForTimeout(1500);
await adv(6);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/31-combat-arene.png` });
for (let t = 0; t < 14; t++) {
  if (!(await page.locator('#battle-ui').isVisible())) break;
  // remplacement forcé après un K.O.
  if (await page.locator('#overlay').isVisible()) {
    try { await page.locator('#overlay .card:not(.dim)').first().click({ timeout: 900 }); } catch {}
    await page.waitForTimeout(500);
    await skip(14);
    continue;
  }
  if (await page.locator('#bt-menu').isVisible()) {
    try { await page.locator('#bt-menu .move-btn').first().click({ timeout: 900 }); } catch {}
    await page.waitForTimeout(250);
    try { await page.locator('#bt-menu .move-btn').first().click({ timeout: 900 }); } catch {}
    await page.waitForTimeout(300);
  }
  await skip(14);
  await page.waitForTimeout(200);
}
await page.waitForTimeout(800);
await adv(10);
await page.waitForTimeout(600);
console.log('BADGES:', await page.evaluate(() => window.pokelike.debugBadges()));
await page.screenshot({ path: `${OUT}/23-apres-arene.png` });

// 6. Grotte + zone désertique post-ligue
await page.evaluate(() => window.pokelike.debugGoto('grotte-echo'));
await page.waitForTimeout(1300);
await page.screenshot({ path: `${OUT}/24-grotte.png` });
await page.evaluate(() => window.pokelike.debugGoto('sommet-cendre'));
await page.waitForTimeout(1300);
await adv(6);
await page.screenshot({ path: `${OUT}/25-sommet.png` });

// 6a-bis. Routes (hautes herbes) et bord de mer
for (const [zone, name] of [['route2', '28-route-foret'], ['route4', '29-plage'], ['route7', '30-volcan']]) {
  await page.evaluate((z) => window.pokelike.debugGoto(z), zone);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}
console.log('-- routes OK');

// 6b. Interactions (panneau, PNJ, objet, boutique, soins)
await page.evaluate(() => window.pokelike.debugGoto('serenis'));
await page.waitForTimeout(1300);
for (const kind of ['sign', 'npc', 'door']) {
  const ok = await page.evaluate((k) => window.pokelike.debugInteract(k), kind);
  await page.waitForTimeout(600);
  await adv(4);
  console.log('  interaction', kind, ok ? 'OK' : 'absente');
  await page.waitForTimeout(300);
}
await page.evaluate(() => window.pokelike.debugGoto('in:serenis:shop'));
await page.waitForTimeout(1200);
await page.evaluate(() => window.pokelike.debugInteract('shop'));
await page.waitForTimeout(800);
console.log('  boutique ouverte:', await page.evaluate(() => !document.getElementById('overlay').hidden));
await page.screenshot({ path: `${OUT}/27-boutique.png` });
try { await page.locator('#overlay .ov-head .round-btn').click({ timeout: 1500 }); } catch {}
await page.waitForTimeout(400);

await page.evaluate(() => window.pokelike.debugGoto('in:serenis:center'));
await page.waitForTimeout(1200);
await page.evaluate(() => window.pokelike.debugInteract('heal'));
await page.waitForTimeout(700);
try { await page.locator('#dlg-choices .btn').first().click({ timeout: 1500 }); } catch {}
await adv(12);
await page.waitForTimeout(500);
await adv(8);
console.log('  soins:', await page.evaluate(() => window.pokelike.debugParty()[0]));

// 6c. Blocage par badge : Sérènis -> Route 2 sans 2e badge
await page.evaluate(() => window.pokelike.debugGoto('serenis'));
await page.waitForTimeout(1600);
console.log('  zone de départ:', await page.evaluate(() => window.pokelike.map.id));
await page.evaluate(() => window.pokelike.debugGoto('cendrebourg'));
await page.waitForTimeout(1500);
console.log('  sortie trouvée:', await page.evaluate(() => window.pokelike.debugTryExit('route3')));
await page.waitForTimeout(900);
console.log('  message de blocage:', JSON.stringify(await page.evaluate(() => document.getElementById('dialogue').hidden ? null : document.getElementById('dlg-text').textContent)));
console.log('  zone après tentative:', await page.evaluate(() => window.pokelike.map.id));
await adv(6);
// avec le badge requis, le passage doit s'ouvrir
await page.evaluate(() => { window.pokelike.debugGiveBadge('g2'); window.pokelike.debugTryExit('route3'); });
await page.waitForTimeout(1600);
console.log('  zone avec 2 badges:', await page.evaluate(() => window.pokelike.map.id));
await adv(6);

// 6d. Bascule des graphismes légers
await page.evaluate(() => { window.pokelike.debugQuality('leger'); });
await page.waitForTimeout(1200);
console.log('  qualité légère → ombres:', await page.evaluate(() => window.pokelike.debugShadows()));
await page.evaluate(() => { window.pokelike.debugQuality('haut'); });
await page.waitForTimeout(1200);
console.log('  qualité élevée → ombres:', await page.evaluate(() => window.pokelike.debugShadows()));

// 7. Sauvegarde / rechargement
await page.evaluate(() => window.pokelike.debugSave());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.click('[data-act="continue"]');
await page.waitForTimeout(2000);
console.log('APRÈS RECHARGEMENT:', await page.evaluate(() => ({ mode: window.pokelike.mode, party: window.pokelike.debugParty(), badges: window.pokelike.debugBadges() })));
await page.screenshot({ path: `${OUT}/26-recharge.png` });

console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'AUCUNE ERREUR JS');
await browser.close();
server.close();
