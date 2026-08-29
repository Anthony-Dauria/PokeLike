import * as THREE from 'three';
import type { Species } from '../data/species';
import { addOutline, buildCreature, type CreatureRig } from './model';

export type Facing = 'front' | 'back';

/** Taille des sprites cuits. Au-dessus des 96 px de la DS pour que les
 *  détails de visage survivent à la réduction finale. */
const SIZE = 192;
/** Nombre de textures gardées en mémoire vidéo (≈ 64 Ko pièce). */
const CACHE_MAX = 64;

interface Baked { tex: THREE.Texture; target: THREE.WebGLRenderTarget | null; side: number; height: number }

/**
 * Image fournie par un pack, prête à être posée sur la plateforme.
 *  - `aspect` : rapport largeur/hauteur du sujet une fois rogné ;
 *  - `px`     : hauteur du sujet ramenée à une planche de 96 px, la taille des
 *               sprites de l'ère DS. C'est elle qui fixe la taille à l'écran, de
 *               sorte qu'un pack en 256 px ne s'affiche pas 2,7 fois plus grand.
 */
export interface PackSprite { tex: THREE.Texture; aspect: number; px: number }

/** Définition de référence d'une planche de sprite (la DS travaillait en 96 px). */
const FRAME_REF = 96;

/** Dossier d'où provient l'image d'une espèce. */
type Root = 'sprites' | 'valmore';

interface Manifeste {
  /** Clés disponibles de face ; `null` = pas de manifeste, on sonde à l'aveugle. */
  face: Set<string> | null;
  /** Clés disposant d'une vue de dos ; `null` = inconnu, on tente. */
  dos: Set<string> | null;
}

interface RootState {
  dir: string;
  manifest: Promise<Manifeste> | null;
  /** Sondages infructueux consécutifs : au-delà, on cesse de demander. */
  misses: number;
  off: boolean;
}

/** Transfert d'un tampon linéaire lu sur le GPU vers un PNG affichable. */
function toDataURL(buf: Uint8Array, size: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  // La cible hors écran est linéaire et lue à l'envers : on encode en sRGB et on
  // retourne verticalement pendant la copie.
  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4;
    const dst = y * size * 4;
    for (let x = 0; x < size * 4; x += 4) {
      for (let k = 0; k < 3; k++) {
        const v = buf[src + x + k] / 255;
        const e = v <= .0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - .055;
        img.data[dst + x + k] = Math.round(Math.min(1, Math.max(0, e)) * 255);
      }
      img.data[dst + x + 3] = buf[src + x + 3];
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/** Contexte 2D jetable, hors écran si la plateforme le permet. */
function ctx2d(w: number, h: number) {
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c.getContext('2d', { willReadFrequently: true });
  } catch { return null; }
}

/** Image de pack décodée : bitmap prêt à téléverser + mesures du sujet. */
interface Prepared { bmp: ImageBitmap; aspect: number; px: number; frame: number; flipped: boolean }

/**
 * Recadre une image sur ses pixels opaques, puis la retourne verticalement.
 *
 * Le rognage : les packs cadrent dans un carré fixe avec beaucoup de vide autour ;
 * sans lui, une petite espèce flotte au-dessus de la plateforme.
 *
 * Le retournement : WebGL prend l'origine des textures en bas à gauche, alors que
 * les images vont de haut en bas. three.js corrige avec `UNPACK_FLIP_Y_WEBGL`, mais
 * ce réglage est ignoré pour les `ImageBitmap` sur WebKit — les sprites s'affichaient
 * à l'endroit sur Chrome et la tête en bas sur iPhone. En retournant nous-mêmes au
 * moment du décodage, l'orientation ne dépend plus du navigateur (`flipped` dit
 * alors à l'appelant de laisser `flipY` à faux).
 */
async function prepare(src: ImageBitmap): Promise<Prepared> {
  const frame = src.height || FRAME_REF;
  // Repli si le canvas 2D n'est pas disponible : image brute, retournée par three.js.
  const brut: Prepared = { bmp: src, aspect: src.width / src.height || 1, px: FRAME_REF, frame, flipped: false };
  const ctx = ctx2d(src.width, src.height);
  if (!ctx) return brut;
  try {
    ctx.drawImage(src, 0, 0);
    const { data, width: w, height: h } = ctx.getImageData(0, 0, src.width, src.height);
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] <= 8) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < x0 || y1 < y0) return brut;                        // image entièrement vide
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    // Recadrage et retournement en une seule passe.
    const dst = ctx2d(cw, ch);
    if (!dst) return brut;
    dst.translate(0, ch);
    dst.scale(1, -1);
    dst.drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);
    const bmp = await createImageBitmap(dst.canvas);
    src.close();
    return { bmp, aspect: cw / ch, px: (ch / frame) * FRAME_REF, frame, flipped: true };
  } catch { return brut; }                                      // canvas indisponible ou souillé
}

/**
 * Fournit une texture pour chaque espèce :
 *   1. `public/sprites/<dex>.png` si le joueur a déposé un pack (rien n'est livré avec le jeu) ;
 *   2. sinon, le modèle 3D procédural est rendu une fois hors écran et réutilisé.
 */
export class CreatureSprites {
  private cache = new Map<string, Baked>();
  private order: string[] = [];
  private packHit = new Map<string, PackSprite>();
  /** Vignettes d'interface déjà rendues, indexées par clé. */
  private portraits = new Map<string, string>();
  private packMiss = new Set<string>();
  /**
   * Deux dossiers d'images, suivis séparément :
   *  - `sprites/`, le pack des espèces nationales, que le joueur installe et que
   *    git ignore ;
   *  - `valmore/`, les dessins des 9 espèces maison, qui appartiennent au jeu et
   *    sont versionnés avec lui.
   * Un dossier vide ne doit pas faire renoncer à l'autre, d'où un état par racine.
   */
  private roots: Record<Root, RootState> = {
    sprites: { dir: './sprites', manifest: null, misses: 0, off: false },
    valmore: { dir: './valmore', manifest: null, misses: 0, off: false },
  };
  private scene = new THREE.Scene();
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 100);

  constructor(private gl: THREE.WebGLRenderer) {
    const hemi = new THREE.HemisphereLight(0xd8e8ff, 0x6a6250, .75);
    const key = new THREE.DirectionalLight(0xfff6e0, 1.1);
    key.position.set(4, 6, 8);
    const fill = new THREE.DirectionalLight(0xbcd4f0, .3);
    fill.position.set(-5, 2, -4);
    // Contre-jour : détache la silhouette et souligne le relief du dos.
    const rim = new THREE.DirectionalLight(0xdCE8ff, .55);
    rim.position.set(-3, 5, -7);
    this.scene.add(hemi, key, fill, rim);
  }

  private key(sp: Species, facing: Facing, shiny: boolean) {
    return `${sp.id}|${facing}|${shiny ? 's' : 'n'}`;
  }

  /** Rend le modèle hors écran et conserve la texture. Synchrone. */
  private bake(sp: Species, facing: Facing, shiny: boolean): Baked {
    const k = this.key(sp, facing, shiny);
    const hit = this.cache.get(k);
    if (hit) return hit;

    const rig = buildCreature(sp, shiny);
    this.scene.add(rig.group);

    // Cadre carré autour de la créature, avec une marge constante.
    const box = new THREE.Box3().setFromObject(rig.group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const side = Math.max(size.x, size.y, size.z) * 1.16 || 1;
    // Contour d'épaisseur constante à l'écran (~2,5 px sur 128), quelle que soit la taille.
    addOutline(rig, side * .02);
    // On cale le bas du cadre juste sous les pieds : le sprite pose sur la plateforme.
    center.y = box.min.y + side / 2 - side * .05;

    // Vue de trois-quarts : plus lisible qu'une face stricte sur des modèles simples.
    // De dos, on prend plus de hauteur : sinon la tête disparaît derrière le corps.
    const dir = facing === 'front'
      ? new THREE.Vector3(.28, .26, 1).normalize()
      : new THREE.Vector3(-.62, .48, -1).normalize();   // trois-quarts arrière : la tête reste lisible
    this.cam.left = -side / 2; this.cam.right = side / 2;
    this.cam.top = side / 2; this.cam.bottom = -side / 2;
    this.cam.near = .01; this.cam.far = side * 6;
    this.cam.position.copy(center).addScaledVector(dir, side * 2.2);
    this.cam.lookAt(center);
    this.cam.updateProjectionMatrix();

    const target = new THREE.WebGLRenderTarget(SIZE, SIZE, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat, samples: 0, depthBuffer: true,
    });
    target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    target.texture.generateMipmaps = false;
    target.texture.userData.src = 'bake';

    const prevTarget = this.gl.getRenderTarget();
    const prevAlpha = this.gl.getClearAlpha();
    const prevColor = new THREE.Color();
    this.gl.getClearColor(prevColor);
    this.gl.setRenderTarget(target);
    this.gl.setClearColor(0x000000, 0);
    this.gl.clear(true, true, false);
    this.gl.render(this.scene, this.cam);
    this.gl.setRenderTarget(prevTarget);
    this.gl.setClearColor(prevColor, prevAlpha);

    this.scene.remove(rig.group);

    const baked: Baked = { tex: target.texture, target, side, height: size.y || side };
    this.cache.set(k, baked);
    this.order.push(k);
    this.trim();
    return baked;
  }

  private trim() {
    while (this.order.length > CACHE_MAX) {
      const old = this.order.shift()!;
      const b = this.cache.get(old);
      if (b?.target) b.target.dispose();
      this.cache.delete(old);
    }
  }

  /** Texture immédiate (cuisson), côté du carré et hauteur réelle du modèle, en unités monde. */
  sprite(sp: Species, facing: Facing, shiny: boolean): { tex: THREE.Texture; side: number; height: number } {
    const b = this.bake(sp, facing, shiny);
    return { tex: b.tex, side: b.side, height: b.height };
  }

  /**
   * Vignette PNG (data URL) d'un gréement quelconque, pour l'interface. Le rendu
   * passe par la même cuisson hors écran que les combats : les portraits des menus
   * montrent donc exactement le modèle du jeu, sans dessin séparé à maintenir.
   *
   * `bust` cadre la tête et les épaules ; sinon on prend la silhouette entière.
   */
  portrait(key: string, make: () => CreatureRig, bust = false, size = 96): string {
    const k = `${key}|${bust ? 'b' : 'f'}|${size}`;
    const hit = this.portraits.get(k);
    if (hit) return hit;

    const rig = make();
    this.scene.add(rig.group);
    const box = new THREE.Box3().setFromObject(rig.group);
    const taille = new THREE.Vector3(), centre = new THREE.Vector3();
    box.getSize(taille); box.getCenter(centre);

    let cote: number;
    if (bust) {
      // Buste : carré calé sur le haut de la silhouette, assez serré pour que le
      // visage soit lisible dans une vignette de 78 px.
      cote = Math.max(taille.x * 1.12, taille.y * .40) || 1;
      centre.y = box.max.y - cote * .46;
    } else {
      cote = Math.max(taille.x, taille.y, taille.z) * 1.12 || 1;
      centre.y = box.min.y + cote / 2 - cote * .04;
    }
    addOutline(rig, cote * .018);

    const dir = new THREE.Vector3(.26, .1, 1).normalize();
    this.cam.left = -cote / 2; this.cam.right = cote / 2;
    this.cam.top = cote / 2; this.cam.bottom = -cote / 2;
    this.cam.near = .01; this.cam.far = cote * 8;
    this.cam.position.copy(centre).addScaledVector(dir, cote * 3);
    this.cam.lookAt(centre);
    this.cam.updateProjectionMatrix();

    const cible = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat, samples: 0, depthBuffer: true,
    });
    cible.texture.colorSpace = THREE.LinearSRGBColorSpace;

    const prevCible = this.gl.getRenderTarget();
    const prevAlpha = this.gl.getClearAlpha();
    const prevCol = new THREE.Color();
    this.gl.getClearColor(prevCol);
    this.gl.setRenderTarget(cible);
    this.gl.setClearColor(0x000000, 0);
    this.gl.clear(true, true, false);
    this.gl.render(this.scene, this.cam);

    const buf = new Uint8Array(size * size * 4);
    this.gl.readRenderTargetPixels(cible, 0, 0, size, size, buf);
    this.gl.setRenderTarget(prevCible);
    this.gl.setClearColor(prevCol, prevAlpha);
    this.scene.remove(rig.group);
    cible.dispose();

    const url = toDataURL(buf, size);
    this.portraits.set(k, url);
    return url;
  }

  /**
   * Où chercher l'image d'une espèce, et sous quel nom de fichier. Les espèces
   * maison portent leur identifiant (brasillon.png), plus lisible à la main que
   * leur numéro ; les autres gardent leur numéro national.
   */
  private locate(sp: Species): { st: RootState; key: string } {
    return sp.custom
      ? { st: this.roots.valmore, key: sp.id }
      : { st: this.roots.sprites, key: String(sp.dex) };
  }

  /**
   * Lit `<dossier>/index.json` une seule fois, s'il existe. Le champ `back` permet
   * de dire quelles espèces ont une vue de dos : sans lui, chaque combat tente un
   * fichier absent et laisse une erreur 404 dans la console.
   */
  private loadManifest(st: RootState): Promise<Manifeste> {
    st.manifest ??= (async () => {
      const vide: Manifeste = { face: null, dos: null };
      try {
        const res = await fetch(`${st.dir}/index.json`, { cache: 'force-cache' });
        if (!res.ok) return vide;
        const raw: unknown = await res.json();
        const obj = raw as { dex?: unknown[]; ids?: unknown[]; back?: unknown[] } | unknown[];
        const list = Array.isArray(obj) ? obj : [...(obj?.dex ?? []), ...(obj?.ids ?? [])];
        const dos = Array.isArray(obj) ? undefined : obj?.back;
        return {
          face: Array.isArray(list) && list.length ? new Set(list.map(String)) : null,
          dos: Array.isArray(dos) ? new Set(dos.map(String)) : null,
        };
      } catch { return vide; }
    })();
    return st.manifest;
  }

  /**
   * Chemin de l'image de face d'un pack, ou `null`. Sert aux vignettes de
   * l'interface, qui ont besoin d'une URL et non d'une texture.
   */
  async packUrl(sp: Species): Promise<string | null> {
    const { st, key } = this.locate(sp);
    if (st.off) return null;
    const man = await this.loadManifest(st);
    if (man.face && !man.face.has(key)) return null;
    const path = `${st.dir}/${key}.png`;
    if (this.packHit.has(path)) return path;
    if (this.packMiss.has(path)) return null;
    try {
      const res = await fetch(path, { cache: 'force-cache' });
      if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) return path;
    } catch { /* pas de pack */ }
    this.packMiss.add(path);
    return null;
  }

  /**
   * Cherche une image fournie par le joueur. Résout `null` s'il n'y en a pas.
   * `back/<dex>.png` est optionnel : on retombe sur la vue de face.
   */
  async pack(sp: Species, facing: Facing): Promise<PackSprite | null> {
    const { st, key } = this.locate(sp);
    if (st.off) return null;
    const man = await this.loadManifest(st);
    if (man.face && !man.face.has(key)) return null;
    // Vue de dos : on ne la demande que si le manifeste la déclare, ou faute de
    // manifeste. Sinon on passe directement à la vue de face.
    const avecDos = facing === 'back' && (!man.dos || man.dos.has(key));
    for (const path of avecDos
      ? [`${st.dir}/back/${key}.png`, `${st.dir}/${key}.png`]
      : [`${st.dir}/${key}.png`]) {
      const hit = this.packHit.get(path);
      if (hit) return hit;
      if (this.packMiss.has(path)) continue;
      try {
        const res = await fetch(path, { cache: 'force-cache' });
        // Un service worker peut répondre autre chose qu'une image : on vérifie le type.
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
          this.packMiss.add(path);
          // Sans manifeste, trois échecs d'affilée signifient « aucun pack installé ».
          if (!man.face && ++st.misses >= 3) st.off = true;
          continue;
        }
        const { bmp, aspect, px, frame, flipped } = await prepare(await createImageBitmap(await res.blob()));
        const tex = new THREE.Texture(bmp);
        tex.colorSpace = THREE.SRGBColorSpace;
        // Déjà retournée au décodage : three.js ne doit pas la retourner une seconde fois.
        tex.flipY = !flipped;
        // Une planche haute définition est réduite à l'écran : sans filtrage ni
        // mipmaps elle scintillerait. Les planches façon DS restent au plus proche.
        const gros = frame > FRAME_REF * 1.5;
        tex.magFilter = gros ? THREE.LinearFilter : THREE.NearestFilter;
        tex.minFilter = gros ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
        tex.generateMipmaps = gros;
        tex.needsUpdate = true;
        tex.userData.src = 'pack';
        const hit: PackSprite = { tex, aspect, px };
        this.packHit.set(path, hit);
        st.misses = 0;
        return hit;
      } catch {
        this.packMiss.add(path);
        if (!man.face && ++st.misses >= 3) st.off = true;
      }
    }
    return null;
  }

  dispose() {
    for (const b of this.cache.values()) b.target?.dispose();
    for (const p of this.packHit.values()) p.tex.dispose();
    this.portraits.clear();
    this.cache.clear();
    this.order = [];
  }
}
