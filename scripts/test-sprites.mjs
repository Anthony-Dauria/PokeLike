// Vérifie les deux sources de sprites :
//   1. cuisson du modèle 3D quand aucun pack n'est installé ;
//   2. images du joueur quand `public/sprites/` en contient.
// Le pack utilisé ici est FACTICE (silhouettes colorées générées par gen-test-sprites.mjs).
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
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
await new Promise((r) => server.listen(4180, r));

const OUT = 'screenshots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}), args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function run(label) {
  const page = await browser.newPage({ viewport: { width: 412, height: 890 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/sprites\//.test(m.text() + m.location().url)) errors.push('CONSOLE: ' + m.text()); });
  await page.goto('http://localhost:4180/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.pokelike.newGameQuick('Pack', 'brasillon'));
  await page.waitForTimeout(1400);
  // Pikachu (n°25) est dans le pack factice : il valide aussi la vue de dos.
  await page.evaluate(() => window.pokelike.debugGiveLead('pikachu', 20));
  await page.evaluate(() => window.pokelike.debugWild('pidgey', 12));
  await page.waitForTimeout(2600);
  const src = await page.evaluate(() => window.pokelike.debugSpriteSource());
  await page.screenshot({ path: `${OUT}/50-sprites-${label}.png` });
  await page.close();
  return { src, errors };
}

// 1. sans pack
await rm('dist/sprites', { recursive: true, force: true });
const sans = await run('sans-pack');
console.log('sans pack   →', JSON.stringify(sans.src), sans.errors.length ? 'ERREURS: ' + sans.errors.join(' | ') : '');

// 2. avec un pack factice
execFileSync(process.execPath, ['scripts/gen-test-sprites.mjs'], { stdio: 'inherit' });
await cp('public/sprites', 'dist/sprites', { recursive: true });
const avec = await run('avec-pack');
console.log('avec pack   →', JSON.stringify(avec.src), avec.errors.length ? 'ERREURS: ' + avec.errors.join(' | ') : '');

// ménage : on ne laisse traîner aucun pack
await rm('dist/sprites', { recursive: true, force: true });
for (const f of ['1.png', '16.png', '25.png', 'index.json']) await rm(join('public/sprites', f), { force: true });
await rm('public/sprites/back', { recursive: true, force: true });

const ok = sans.src.foe === 'bake' && sans.src.mine === 'bake'
  && avec.src.foe === 'pack' && avec.src.mine === 'pack'
  && !sans.errors.length && !avec.errors.length;
if (!ok) console.log('attendu : sans={bake,bake} avec={pack,pack}');
console.log(ok ? 'SPRITES OK — cuisson et pack tous deux utilisés' : 'SPRITES ÉCHEC');
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
