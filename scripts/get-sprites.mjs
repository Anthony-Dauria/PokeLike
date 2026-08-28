#!/usr/bin/env node
/**
 * Importe un pack de sprites dans `public/sprites/` depuis une source que VOUS
 * fournissez. Aucune adresse n'est codée en dur : le dépôt ne distribue et ne
 * télécharge aucune image Pokémon de lui-même.
 *
 *   node scripts/get-sprites.mjs --from "https://…/{dex}.png"
 *                               [--back "https://…/back/{dex}.png"]
 *                               [--out public/sprites] [--only 1-151,25]
 *                               [--concurrency 6] [--force] [--dry-run]
 *   node scripts/get-sprites.mjs --index-only     # régénère juste index.json
 *
 * Jetons disponibles dans les gabarits : {dex} {dex3} {id} {name}
 *   {dex}  numéro national (1, 25, 493…)
 *   {dex3} le même sur 3 chiffres (001, 025, 493)
 *   {id}   identifiant anglais en minuscules (bulbasaur, kommo-o…)
 *   {name} nom français (Bulbizarre) — encodé pour l'URL
 *
 * Le dossier de sortie est ignoré par git : ce que vous importez reste chez vous.
 */
import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEX_FILE = path.join(ROOT, 'src/data/pokedex.gen.ts');

/* -------------------- arguments -------------------- */

function parseArgs(argv) {
  const o = { out: 'public/sprites', concurrency: 6 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`option ${a} : valeur manquante`);
      return v;
    };
    switch (a) {
      case '--from': case '-f': o.from = val(); break;
      case '--back': case '-b': o.back = val(); break;
      case '--out': case '-o': o.out = val(); break;
      case '--only': o.only = val(); break;
      case '--concurrency': case '-c': o.concurrency = Math.max(1, +val() || 6); break;
      case '--force': o.force = true; break;
      case '--dry-run': o.dry = true; break;
      case '--index-only': o.indexOnly = true; break;
      case '--help': case '-h': o.help = true; break;
      default: throw new Error(`option inconnue : ${a}`);
    }
  }
  return o;
}

/** « 1-151,25,493 » → Set{1..151, 25, 493} */
function parseRanges(s) {
  const keep = new Set();
  for (const part of s.split(',')) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`--only : segment illisible « ${part} »`);
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b); n++) keep.add(n);
  }
  return keep;
}

/* -------------------- roster -------------------- */

/** Lit le Pokédex généré sans passer par TypeScript. */
async function roster() {
  const src = await readFile(DEX_FILE, 'utf8');
  const out = [];
  const re = /\{ dex: (\d+), id: "([^"]+)", name: "([^"]+)"/g;
  for (let m; (m = re.exec(src));) out.push({ dex: +m[1], id: m[2], name: m[3] });
  if (!out.length) throw new Error(`aucune espèce lue dans ${DEX_FILE} — lancez d'abord « npm run pokedex »`);
  return out;
}

const fill = (tpl, sp) => tpl
  .replaceAll('{dex3}', String(sp.dex).padStart(3, '0'))
  .replaceAll('{dex}', String(sp.dex))
  .replaceAll('{id}', sp.id)
  .replaceAll('{name}', encodeURIComponent(sp.name));

/* -------------------- téléchargement -------------------- */

const PNG = [0x89, 0x50, 0x4e, 0x47];

/** Un GET, avec deux reprises sur erreur réseau. Retourne un Buffer PNG ou null. */
async function grab(url) {
  for (let essai = 0; essai < 3; essai++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.status === 404) return null;              // espèce absente du pack : normal
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!PNG.every((b, i) => buf[i] === b)) throw new Error('la réponse n’est pas un PNG');
      return buf;
    } catch (e) {
      if (essai === 2) throw e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** essai));
    }
  }
  return null;
}

/** Exécute `job` sur chaque élément, `n` en parallèle. */
async function pool(items, n, job) {
  const it = items[Symbol.iterator]();
  const run = async () => { for (let x = it.next(); !x.done; x = it.next()) await job(x.value); };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, run));
}

/* -------------------- index.json -------------------- */

/** Liste les numéros réellement présents dans le dossier. */
async function presents(dir) {
  if (!existsSync(dir)) return [];
  const noms = await readdir(dir);
  return noms
    .map((f) => /^(\d+)\.png$/.exec(f))
    .filter(Boolean)
    .map((m) => +m[1])
    .sort((a, b) => a - b);
}

async function writeIndex(outDir) {
  const dex = await presents(outDir);
  await writeFile(path.join(outDir, 'index.json'), JSON.stringify({ dex }) + '\n');
  return dex;
}

/* -------------------- principal -------------------- */

const USAGE = `
Importe un pack de sprites depuis une source que vous fournissez.

  node scripts/get-sprites.mjs --from "<gabarit d'URL>" [options]

Options
  -f, --from <url>       gabarit de la vue de face (obligatoire)
  -b, --back <url>       gabarit de la vue de dos (facultatif)
  -o, --out <dossier>    destination (défaut : public/sprites)
      --only <plages>    limite aux numéros donnés, ex. « 1-151,448 »
  -c, --concurrency <n>  requêtes simultanées (défaut : 6)
      --force            retélécharge même si le fichier existe
      --dry-run          affiche les URL sans rien télécharger
      --index-only       régénère seulement index.json
  -h, --help             cette aide

Jetons : {dex} {dex3} {id} {name}

Exemple (source fictive) :
  node scripts/get-sprites.mjs --from "https://mon-pack.exemple/front/{dex}.png" \\
                               --back "https://mon-pack.exemple/back/{dex}.png"

Les sprites des jeux Pokémon appartiennent à Nintendo / Game Freak / Creatures :
ce dépôt n'en distribue aucun et ne connaît aucune adresse de téléchargement.
Assurez-vous d'avoir le droit d'utiliser la source que vous indiquez.
`.trim();

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); }
  catch (e) { console.error(`✗ ${e.message}\n\n${USAGE}`); process.exit(2); }

  if (o.help) { console.log(USAGE); return; }

  const outDir = path.resolve(ROOT, o.out);
  const backDir = path.join(outDir, 'back');

  if (o.indexOnly) {
    const dex = await writeIndex(outDir);
    console.log(`index.json écrit : ${dex.length} sprite(s) recensé(s).`);
    return;
  }

  if (!o.from) { console.error(`✗ --from est obligatoire.\n\n${USAGE}`); process.exit(2); }
  if (!/\{(dex3?|id|name)\}/.test(o.from)) {
    console.error('✗ --from ne contient aucun jeton ({dex}, {dex3}, {id} ou {name}) : toutes les espèces pointeraient vers la même image.');
    process.exit(2);
  }

  const keep = o.only ? parseRanges(o.only) : null;
  const liste = (await roster()).filter((sp) => sp.dex < 1101 && (!keep || keep.has(sp.dex)));
  if (!liste.length) { console.error('✗ --only ne retient aucune espèce du roster.'); process.exit(2); }

  if (o.dry) {
    for (const sp of liste.slice(0, 10)) console.log(`${String(sp.dex).padStart(4)}  ${fill(o.from, sp)}`);
    if (liste.length > 10) console.log(`… et ${liste.length - 10} autres.`);
    return;
  }

  await mkdir(outDir, { recursive: true });
  if (o.back) await mkdir(backDir, { recursive: true });

  const bilan = { ok: 0, dos: 0, absent: [], erreur: [], garde: 0 };
  let faits = 0;

  const tick = () => {
    faits++;
    if (process.stdout.isTTY) process.stdout.write(`\r  ${faits}/${liste.length}…`);
  };

  await pool(liste, o.concurrency, async (sp) => {
    const face = path.join(outDir, `${sp.dex}.png`);
    try {
      if (!o.force && existsSync(face) && (await stat(face)).size > 0) bilan.garde++;
      else {
        const buf = await grab(fill(o.from, sp));
        if (!buf) { bilan.absent.push(sp.dex); tick(); return; }
        await writeFile(face, buf);
        bilan.ok++;
      }
      if (o.back) {
        const dos = path.join(backDir, `${sp.dex}.png`);
        if (o.force || !existsSync(dos)) {
          const buf = await grab(fill(o.back, sp));
          if (buf) { await writeFile(dos, buf); bilan.dos++; }
        } else bilan.dos++;
      }
    } catch (e) {
      bilan.erreur.push(`${sp.dex} ${sp.name} : ${e.message}`);
    }
    tick();
  });

  if (process.stdout.isTTY) process.stdout.write('\r');
  const dex = await writeIndex(outDir);

  console.log(`\nPack : ${outDir}`);
  console.log(`  téléchargés   ${bilan.ok}`);
  if (bilan.garde) console.log(`  déjà présents ${bilan.garde}   (--force pour les remplacer)`);
  if (o.back) console.log(`  vues de dos   ${bilan.dos}`);
  console.log(`  couverture    ${dex.length}/${liste.length} espèces (${Math.round(dex.length / liste.length * 100)} %)`);
  if (bilan.absent.length) console.log(`  introuvables  ${bilan.absent.length} (404) : ${bilan.absent.slice(0, 12).join(', ')}${bilan.absent.length > 12 ? '…' : ''}`);
  for (const e of bilan.erreur.slice(0, 8)) console.log(`  ✗ ${e}`);
  if (bilan.erreur.length > 8) console.log(`  ✗ … et ${bilan.erreur.length - 8} autres erreurs`);
  console.log('\nindex.json à jour. Relancez « npm run build » (ou rechargez le serveur de dev) pour voir le pack en jeu.');
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exit(1); });
