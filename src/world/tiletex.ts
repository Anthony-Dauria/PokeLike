import * as THREE from 'three';
import { RNG } from '../engine/rng';

/**
 * Motifs de sol dessinés en code, façon pixel art de l'ère DS.
 *
 * Ils sont volontairement en niveaux de gris, centrés près du blanc : le terrain
 * garde ses couleurs de sommets (palette du biome, occlusion, bruit) et la texture
 * ne fait que les moduler. Un seul motif d'herbe sert donc à tous les biomes, du
 * pré tempéré à la lande volcanique, sans jamais jurer avec leur teinte.
 */

/** Côté d'un motif, en pixels. Une tuile du monde couvre exactement ce carré. */
const N = 32;

export type TileFamily = 'herbe' | 'chemin' | 'sable' | 'eau' | 'sol' | 'roche' | 'mur' | 'toit';

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] | null {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const x = c.getContext('2d');
  return x ? [c, x] : null;
}

/** Niveau de gris opaque. */
const g = (v: number) => `rgb(${v},${v},${v})`;

/**
 * Pose un rectangle en enroulant les bords. On redessine la même forme décalée
 * d'un motif : ce qui dépasse à droite ou en bas réapparaît à gauche ou en haut.
 * Sans cela, tout trait touchant un bord laisse une couture visible à chaque case.
 */
function put(ctx: CanvasRenderingContext2D, x: number, y: number, v: number, w = 1, h = 1) {
  ctx.fillStyle = g(v);
  const x0 = ((x % N) + N) % N, y0 = ((y % N) + N) % N;
  for (const ox of [0, -N]) {
    for (const oy of [0, -N]) ctx.fillRect(x0 + ox, y0 + oy, w, h);
  }
}

function herbe(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(255);
  ctx.fillRect(0, 0, N, N);
  // Touffes : de courts traits verticaux, plus sombres à la base.
  for (let i = 0; i < 110; i++) {
    const x = Math.floor(rng.next() * N), y = Math.floor(rng.next() * N);
    const h = 2 + Math.floor(rng.next() * 3);
    put(ctx, x, y, 232 - Math.floor(rng.next() * 18), 1, h);
    if (rng.next() < .35) put(ctx, x + 1, y + h - 1, 244, 1, 1);
  }
  // Quelques plaques claires, pour casser la régularité vue de haut.
  for (let i = 0; i < 14; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 250, 3, 2);
  }
}

function chemin(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(250);
  ctx.fillRect(0, 0, N, N);
  // Grain de terre battue.
  for (let i = 0; i < 260; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 228 + Math.floor(rng.next() * 22));
  }
  // Cailloux : un point clair cerné d'une ombre, ça suffit à lire le relief.
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rng.next() * N), y = Math.floor(rng.next() * N);
    put(ctx, x, y, 255, 2, 2);
    put(ctx, x, y + 2, 210, 2, 1);
  }
}

function sable(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(252);
  ctx.fillRect(0, 0, N, N);
  for (let i = 0; i < 220; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 236 + Math.floor(rng.next() * 16));
  }
  // Ondulations douces laissées par le vent.
  for (let y = 0; y < N; y += 6) {
    for (let x = 0; x < N; x++) {
      put(ctx, x, y + Math.round(Math.sin((x / N) * Math.PI * 2) * 1.6), 240, 1, 1);
    }
  }
}

function eau(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = g(255);
  ctx.fillRect(0, 0, N, N);
  // Bandes d'écume horizontales, décalées en sinus : l'œil y lit un clapot.
  for (let y = 0; y < N; y++) {
    const d = Math.round(Math.sin((y / N) * Math.PI * 4) * 3);
    for (let x = 0; x < N; x++) {
      const v = (y % 8 === 0) ? 236 : (y % 8 === 4) ? 246 : 255;
      if (v !== 255) put(ctx, x + d, y, v);
    }
  }
}

function sol(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(255);
  ctx.fillRect(0, 0, N, N);
  // Carrelage : joints en creux et un léger salissement au centre des dalles.
  for (let i = 0; i < N; i++) {
    put(ctx, i, 0, 226); put(ctx, 0, i, 226);
    put(ctx, i, N / 2, 234); put(ctx, N / 2, i, 234);
  }
  for (let i = 0; i < 40; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 248);
  }
}

function roche(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(250);
  ctx.fillRect(0, 0, N, N);
  // Appareil de pierres décalé d'une assise à l'autre.
  const hh = 8;
  for (let r = 0; r * hh < N; r++) {
    const dec = (r % 2) * 8;
    for (let x = 0; x < N; x++) put(ctx, x, r * hh, 224);
    for (let c = 0; c * 16 < N; c++) {
      for (let y = 0; y < hh; y++) put(ctx, c * 16 + dec, r * hh + y, 224);
    }
  }
  for (let i = 0; i < 90; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 238 + Math.floor(rng.next() * 14));
  }
}

function mur(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(255);
  ctx.fillRect(0, 0, N, N);
  // Bardage horizontal : une ombre fine sous chaque planche suffit à donner le relief.
  for (let y = 0; y < N; y += 8) {
    for (let x = 0; x < N; x++) { put(ctx, x, y, 228); put(ctx, x, y + 1, 246); }
  }
  for (let i = 0; i < 70; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 244 + Math.floor(rng.next() * 11));
  }
}

function toit(ctx: CanvasRenderingContext2D, rng: RNG) {
  ctx.fillStyle = g(255);
  ctx.fillRect(0, 0, N, N);
  // Tuiles en écaille : rangées décalées, bord bas plus sombre.
  const hh = 8, ww = 10;
  for (let r = 0; r * hh < N; r++) {
    const dec = (r % 2) * (ww / 2);
    for (let x = 0; x < N; x++) put(ctx, x, r * hh + hh - 1, 214);
    for (let c = -1; c * ww < N; c++) {
      for (let y = 0; y < hh - 1; y++) put(ctx, c * ww + dec, r * hh + y, 232);
    }
    for (let x = 0; x < N; x++) put(ctx, x, r * hh, 250);
  }
  for (let i = 0; i < 50; i++) {
    put(ctx, Math.floor(rng.next() * N), Math.floor(rng.next() * N), 240 + Math.floor(rng.next() * 12));
  }
}

const PEINTRES: Record<TileFamily, (ctx: CanvasRenderingContext2D, rng: RNG) => void> = {
  herbe, chemin, sable, sol, roche, mur, toit,
  eau: (ctx) => eau(ctx),
};

/* -------------------- sols dessinés -------------------- */

const dessins = new Map<string, THREE.Texture>();
const chargeur = new THREE.TextureLoader();

/**
 * Sol dessiné, chargé depuis `public/monde/sols/`. Contrairement aux motifs
 * procéduraux, il porte sa propre couleur : l'appelant ne doit donc pas le
 * teinter par la palette du biome, sous peine de doubler la couleur.
 *
 * La texture est remplie sur place au chargement plutôt que remplacée, pour que
 * les matériaux créés avant l'arrivée de l'image la voient apparaître.
 */
export function drawnTile(name: string): THREE.Texture {
  let t = dessins.get(name);
  if (t) return t;
  t = new THREE.Texture();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  dessins.set(name, t);
  const cible = t;
  chargeur.load(`./monde/sols/${name}.png`, (src) => {
    cible.image = src.image;
    cible.colorSpace = THREE.SRGBColorSpace;
    cible.magFilter = THREE.LinearFilter;
    cible.minFilter = THREE.LinearMipmapLinearFilter;
    cible.generateMipmaps = true;
    cible.needsUpdate = true;
  });
  return t;
}

const cache = new Map<string, THREE.Texture | null>();

/**
 * Texture répétable d'un matériau. `rx`/`ry` donnent le nombre de répétitions sur
 * la surface : une façade de 2,2 m de haut demande 2,2 répétitions verticales pour
 * garder des pixels carrés. `null` si le canvas 2D est indisponible : l'appelant
 * retombe alors sur le rendu en couleurs plates.
 */
export function tileTexture(fam: TileFamily, rx = 1, ry = 1): THREE.Texture | null {
  const cle = `${fam}|${rx}x${ry}`;
  if (cache.has(cle)) return cache.get(cle)!;
  const base = rx === 1 && ry === 1 ? null : tileTexture(fam);
  if (base) {
    const clone = base.clone();
    clone.repeat.set(rx, ry);
    clone.needsUpdate = true;
    cache.set(cle, clone);
    return clone;
  }
  const cv = canvas();
  if (!cv) { cache.set(cle, null); return null; }
  const [c, ctx] = cv;
  ctx.imageSmoothingEnabled = false;
  PEINTRES[fam](ctx, new RNG(0x9e37 + fam.length * 733 + fam.charCodeAt(0) * 17));
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  // Mipmaps au loin : sans elles, le motif scintille dès que la caméra bouge.
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(cle, tex);
  return tex;
}
