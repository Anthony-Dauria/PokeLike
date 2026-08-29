import * as THREE from 'three';

/**
 * Décors dessinés, affichés en panneaux dans la scène 3D.
 *
 * Les images vivent dans `public/monde/`. Elles sont chargées une fois et
 * partagées : le rapport largeur/hauteur n'est connu qu'après le chargement, si
 * bien que les tailles sont corrigées par rappel plutôt que devinées à l'avance.
 */

export interface Sprite2D {
  tex: THREE.Texture;
  /** largeur / hauteur de l'image ; 1 tant qu'elle n'est pas arrivée. */
  aspect: number;
  ready: boolean;
}

const cache = new Map<string, Sprite2D>();
const attente = new Map<string, (() => void)[]>();
const loader = new THREE.TextureLoader();

/**
 * Inclinaison des panneaux, en radians. La caméra du monde plonge d'environ 37° ;
 * en penchant les panneaux d'autant, ils lui font face et le dessin s'affiche sans
 * déformation, tout en pivotant sur leur base qui reste posée au sol.
 */
export const TILT = -Math.atan2(7.8, 10.4);

/** Charge (ou retrouve) une image de décor. `onReady` est rappelé à l'arrivée. */
export function sprite2d(name: string, onReady?: () => void): Sprite2D {
  let s = cache.get(name);
  if (!s) {
    s = { tex: new THREE.Texture(), aspect: 1, ready: false };
    cache.set(name, s);
    const cible = s.tex;
    loader.load(`./monde/${name}.png`, (tex) => {
      // On remplit la texture déjà distribuée au lieu d'en substituer une autre :
      // les matériaux créés avant le chargement pointent dessus.
      cible.image = tex.image;
      cible.colorSpace = THREE.SRGBColorSpace;
      cible.magFilter = THREE.LinearFilter;
      cible.minFilter = THREE.LinearMipmapLinearFilter;
      cible.generateMipmaps = true;
      cible.needsUpdate = true;
      s!.aspect = (tex.image?.width ?? 1) / (tex.image?.height ?? 1);
      s!.ready = true;
      for (const f of attente.get(name) ?? []) f();
      attente.delete(name);
    }, undefined, () => { s!.ready = false; });   // image absente : l'appelant garde son rendu 3D
  }
  if (onReady) {
    if (s.ready) onReady();
    else attente.set(name, [...(attente.get(name) ?? []), onReady]);
  }
  return s;
}

/** Matériau d'un panneau : non éclairé, mais soumis au brouillard comme le reste. */
export function spriteMaterial(s: Sprite2D): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: s.tex, transparent: true, alphaTest: .45, toneMapped: false, fog: true,
  });
}

/** Panneau unitaire dont la base repose sur l'origine. */
export function billboardGeometry(): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(1, 1);
  g.translate(0, .5, 0);
  return g;
}
