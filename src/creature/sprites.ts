import * as THREE from 'three';
import type { Species } from '../data/species';
import { addOutline, buildCreature } from './model';

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

/**
 * Recadre une image sur ses pixels opaques. Les packs cadrent en général dans un
 * carré fixe avec beaucoup de vide autour : sans ce rognage, une petite espèce
 * flotte au-dessus de la plateforme et paraît deux fois trop petite.
 */
async function trimAlpha(bmp: ImageBitmap): Promise<{ bmp: ImageBitmap; aspect: number; px: number; frame: number }> {
  const frame = bmp.height || FRAME_REF;
  const plein = { bmp, aspect: bmp.width / bmp.height || 1, px: FRAME_REF, frame };
  const ctx = ctx2d(bmp.width, bmp.height);
  if (!ctx) return plein;
  try {
    ctx.drawImage(bmp, 0, 0);
    const { data, width: w, height: h } = ctx.getImageData(0, 0, bmp.width, bmp.height);
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
    if (x1 < x0 || y1 < y0) return plein;                       // image entièrement vide
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    if (cw === w && ch === h) return plein;                     // déjà au plus juste
    const cut = await createImageBitmap(bmp, x0, y0, cw, ch);
    bmp.close();
    return { bmp: cut, aspect: cw / ch, px: (ch / frame) * FRAME_REF, frame };
  } catch { return plein; }                                     // canvas indisponible ou souillé
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
  private packMiss = new Set<string>();
  /** Liste éventuelle fournie par le pack ; `null` = pas de manifeste. */
  private manifest: Promise<Set<number> | null> | null = null;
  /** Sondages infructueux consécutifs : au-delà, on considère qu'il n'y a pas de pack. */
  private misses = 0;
  private packOff = false;
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

  /** Lit `sprites/index.json` une seule fois, s'il existe. */
  private loadManifest(): Promise<Set<number> | null> {
    this.manifest ??= (async () => {
      try {
        const res = await fetch('./sprites/index.json', { cache: 'force-cache' });
        if (!res.ok) return null;
        const raw: unknown = await res.json();
        const list = Array.isArray(raw) ? raw : (raw as { dex?: number[] })?.dex;
        return Array.isArray(list) ? new Set(list.map(Number)) : null;
      } catch { return null; }
    })();
    return this.manifest;
  }

  /**
   * Cherche une image fournie par le joueur. Résout `null` s'il n'y en a pas.
   * `back/<dex>.png` est optionnel : on retombe sur la vue de face.
   */
  async pack(sp: Species, facing: Facing): Promise<PackSprite | null> {
    if (sp.custom || this.packOff) return null;    // espèces maison : pas de pack attendu
    const listed = await this.loadManifest();
    if (listed && !listed.has(sp.dex)) return null;
    for (const path of facing === 'back'
      ? [`./sprites/back/${sp.dex}.png`, `./sprites/${sp.dex}.png`]
      : [`./sprites/${sp.dex}.png`]) {
      const hit = this.packHit.get(path);
      if (hit) return hit;
      if (this.packMiss.has(path)) continue;
      try {
        const res = await fetch(path, { cache: 'force-cache' });
        // Un service worker peut répondre autre chose qu'une image : on vérifie le type.
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) {
          this.packMiss.add(path);
          // Sans manifeste, trois échecs d'affilée signifient « aucun pack installé ».
          if (!listed && ++this.misses >= 3) this.packOff = true;
          continue;
        }
        const { bmp, aspect, px, frame } = await trimAlpha(await createImageBitmap(await res.blob()));
        const tex = new THREE.Texture(bmp);
        tex.colorSpace = THREE.SRGBColorSpace;
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
        this.misses = 0;
        return hit;
      } catch {
        this.packMiss.add(path);
        if (!listed && ++this.misses >= 3) this.packOff = true;
      }
    }
    return null;
  }

  dispose() {
    for (const b of this.cache.values()) b.target?.dispose();
    for (const p of this.packHit.values()) p.tex.dispose();
    this.cache.clear();
    this.order = [];
  }
}
