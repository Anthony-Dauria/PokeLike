import * as THREE from 'three';
import { TYPE_COLOR } from '../data/types';
import type { Species } from '../data/species';
import { RNG, hashStr } from '../engine/rng';

const SPHERE = new THREE.SphereGeometry(1, 12, 10);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CONE = new THREE.ConeGeometry(1, 1, 8);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const TORUS = new THREE.TorusGeometry(1, .25, 6, 14);
// Ces géométries sont réutilisées par tous les modèles : jamais libérées.
for (const g of [SPHERE, BOX, CONE, CYL, TORUS]) g.userData.shared = true;

function mat(color: number | string, opts: THREE.MeshLambertMaterialParameters = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

function shade(hex: string, amt: number): number {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.max(0.05, Math.min(0.95, hsl.l + amt)));
  return c.getHex();
}

function part(geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], scl: [number, number, number], rot?: [number, number, number]) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...pos);
  mesh.scale.set(...scl);
  if (rot) mesh.rotation.set(...rot);
  mesh.castShadow = true;
  return mesh;
}

export interface CreatureRig {
  group: THREE.Object3D;
  bob: THREE.Object3D[];
  limbs: THREE.Object3D[];
  height: number;
}

/** Construit un modèle 3D stylisé à partir de l'espèce (aucun asset externe). */
export function buildCreature(sp: Species, shiny = false): CreatureRig {
  const rng = new RNG(hashStr(sp.id));
  const base = TYPE_COLOR[sp.types[0]];
  const accentHex = TYPE_COLOR[sp.types[1] ?? sp.types[0]];
  const hueShift = shiny ? .5 : 0;
  const body = mat(shiftHue(base, hueShift + rng.next() * .04 - .02));
  const belly = mat(shade(shiftHueStr(base, hueShift), .22));
  const accent = mat(shiftHue(accentHex, hueShift + .04));
  const dark = mat(shade(shiftHueStr(base, hueShift), -.22));
  const eyeW = mat(0xf6fbff);
  const eyeB = mat(0x101820);

  const g = new THREE.Group();
  const bob: THREE.Object3D[] = [];
  const limbs: THREE.Object3D[] = [];
  const f = new Set(sp.feats);
  let height = 1;

  const addEyes = (y: number, z: number, sx = .11, spread = .17) => {
    for (const s of [-1, 1]) {
      g.add(part(SPHERE, eyeW, [s * spread, y, z], [sx, sx * 1.15, sx * .6]));
      g.add(part(SPHERE, eyeB, [s * spread, y, z + sx * .35], [sx * .5, sx * .6, sx * .4]));
    }
  };

  switch (sp.shape) {
    case 'quad': {
      const torso = part(SPHERE, body, [0, .52, 0], [.42, .34, .55]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .40, .06], [.34, .22, .46]));
      const head = part(SPHERE, body, [0, .74, .48], [.3, .28, .29]);
      g.add(head); bob.push(head);
      g.add(part(CONE, accent, [0, .68, .74], [.14, .22, .14], [Math.PI / 2, 0, 0]));
      addEyes(.80, .70, .07, .14);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = part(CYL, dark, [sx * .27, .17, sz * .32], [.09, .34, .09]);
        g.add(leg); limbs.push(leg);
      }
      height = 1.05;
      break;
    }
    case 'biped': {
      const torso = part(SPHERE, body, [0, .72, 0], [.34, .42, .3]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .66, .16], [.26, .3, .2]));
      const head = part(SPHERE, body, [0, 1.16, .04], [.28, .28, .28]);
      g.add(head); bob.push(head);
      addEyes(1.20, .27, .075, .13);
      g.add(part(CONE, accent, [0, 1.12, .28], [.09, .16, .09], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) {
        const arm = part(CYL, body, [s * .38, .78, 0], [.08, .3, .08], [0, 0, s * .3]);
        g.add(arm); limbs.push(arm);
        const leg = part(CYL, dark, [s * .17, .24, 0], [.1, .48, .1]);
        g.add(leg); limbs.push(leg);
      }
      height = 1.5;
      break;
    }
    case 'serpent': {
      let y = .3, z = 0, r = .3;
      for (let i = 0; i < 8; i++) {
        const seg = part(SPHERE, i % 2 ? body : belly, [0, y, z], [r, r * .9, r]);
        g.add(seg); if (i < 3) bob.push(seg);
        y += .14; z -= .12; r *= .9;
      }
      const head = part(SPHERE, body, [0, y + .06, z + .06], [.28, .25, .3]);
      g.add(head); bob.push(head);
      addEyes(y + .12, z + .28, .07, .13);
      g.add(part(CONE, accent, [0, y + .02, z + .34], [.11, .2, .11], [Math.PI / 2, 0, 0]));
      height = y + .3;
      break;
    }
    case 'bird': {
      const torso = part(SPHERE, body, [0, .7, 0], [.32, .38, .34]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .62, .18], [.24, .28, .22]));
      const head = part(SPHERE, body, [0, 1.1, .06], [.24, .23, .24]);
      g.add(head); bob.push(head);
      addEyes(1.14, .26, .07, .12);
      g.add(part(CONE, mat(0xf5c542), [0, 1.06, .3], [.09, .2, .09], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) {
        const leg = part(CYL, mat(0xd9a441), [s * .13, .2, 0], [.05, .4, .05]);
        g.add(leg); limbs.push(leg);
      }
      height = 1.4;
      break;
    }
    case 'blob': {
      const torso = part(SPHERE, body, [0, .42, 0], [.52, .42, .5]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .3, .22], [.36, .26, .3]));
      addEyes(.56, .42, .09, .17);
      height = .95;
      break;
    }
    case 'insect': {
      const th = part(SPHERE, body, [0, .5, -.1], [.28, .26, .34]);
      g.add(th); bob.push(th);
      g.add(part(SPHERE, dark, [0, .48, .3], [.24, .22, .24]));
      const head = part(SPHERE, body, [0, .54, .56], [.2, .2, .2]);
      g.add(head); bob.push(head);
      addEyes(.58, .72, .07, .11);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const leg = part(CYL, dark, [s * .3, .24, -.2 + i * .28], [.035, .28, .035], [0, 0, s * .5]);
        g.add(leg); limbs.push(leg);
      }
      for (const s of [-1, 1]) g.add(part(CYL, accent, [s * .1, .74, .62], [.02, .22, .02], [-.6, 0, s * .5]));
      height = 1;
      break;
    }
    case 'fish': {
      const torso = part(SPHERE, body, [0, .52, 0], [.3, .38, .52]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .42, .12], [.22, .24, .38]));
      addEyes(.66, .38, .08, .16);
      g.add(part(CONE, accent, [0, .55, -.6], [.26, .34, .1], [Math.PI / 2, 0, 0]));
      g.add(part(CONE, accent, [0, .92, -.05], [.16, .26, .06], [0, 0, 0]));
      height = 1.05;
      break;
    }
    case 'ghost': {
      const torso = part(SPHERE, mat(body.color.getHex(), { transparent: true, opacity: .93 }), [0, .78, 0], [.36, .4, .34]);
      g.add(torso); bob.push(torso);
      const tailG = part(CONE, mat(body.color.getHex(), { transparent: true, opacity: .7 }), [0, .3, 0], [.34, .5, .32], [Math.PI, 0, 0]);
      g.add(tailG); bob.push(tailG);
      addEyes(.9, .3, .09, .15);
      g.add(part(TORUS, accent, [0, .78, 0], [.44, .44, .44], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) {
        const arm = part(SPHERE, body, [s * .44, .82, .04], [.11, .11, .11]);
        g.add(arm); limbs.push(arm);
      }
      height = 1.3;
      break;
    }
    case 'golem': {
      const torso = part(BOX, body, [0, .62, 0], [.62, .56, .5]);
      g.add(torso); bob.push(torso);
      const head = part(BOX, dark, [0, 1.04, .02], [.36, .3, .34]);
      g.add(head); bob.push(head);
      addEyes(1.06, .2, .07, .12);
      for (const s of [-1, 1]) {
        const arm = part(BOX, body, [s * .48, .6, 0], [.2, .4, .22]);
        g.add(arm); limbs.push(arm);
        const leg = part(BOX, dark, [s * .22, .18, 0], [.22, .36, .26]);
        g.add(leg); limbs.push(leg);
      }
      height = 1.35;
      break;
    }
    case 'plantoid': {
      const torso = part(SPHERE, body, [0, .5, 0], [.36, .42, .36]);
      g.add(torso); bob.push(torso);
      addEyes(.6, .3, .08, .14);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        g.add(part(CONE, accent, [Math.cos(a) * .22, .95, Math.sin(a) * .22], [.13, .34, .05], [Math.cos(a) * .7, -a, Math.sin(a) * .7]));
      }
      for (const s of [-1, 1]) {
        const leg = part(CYL, dark, [s * .15, .16, 0], [.08, .32, .08]);
        g.add(leg); limbs.push(leg);
      }
      height = 1.35;
      break;
    }
  }

  /* ---- attributs ---- */
  if (f.has('wings')) {
    for (const s of [-1, 1]) {
      const wing = part(CONE, mat(shade(accentHex, .12), { transparent: true, opacity: .95, side: THREE.DoubleSide }),
        [s * .5, height * .62, -.12], [.36, .5, .06], [Math.PI / 2, 0, s * -.9]);
      g.add(wing); limbs.push(wing);
    }
  }
  if (f.has('horn')) {
    g.add(part(CONE, mat(shade(accentHex, .28)), [0, height * .92, .06], [.07, .3, .07]));
    if (rng.chance(.5)) for (const s of [-1, 1])
      g.add(part(CONE, mat(shade(accentHex, .28)), [s * .16, height * .86, .02], [.05, .2, .05], [0, 0, s * .4]));
  }
  if (f.has('ears')) {
    for (const s of [-1, 1])
      g.add(part(CONE, body, [s * .17, height * .88, .04], [.09, .22, .07], [0, 0, s * .35]));
  }
  if (f.has('tail')) {
    const tail = part(CONE, accent, [0, height * .35, -.55], [.11, .42, .11], [-1.25, 0, 0]);
    g.add(tail); limbs.push(tail);
  }
  if (f.has('fins')) {
    for (const s of [-1, 1])
      g.add(part(CONE, mat(shade(accentHex, .1), { side: THREE.DoubleSide }), [s * .36, height * .42, .0], [.2, .28, .04], [0, 0, s * 1.3]));
  }
  if (f.has('spikes')) {
    for (let i = 0; i < 5; i++)
      g.add(part(CONE, mat(shade(accentHex, -.1)), [0, height * (.5 + i * .09), -.18 + i * .05], [.06, .16, .06], [-.3, 0, 0]));
  }
  if (f.has('crest')) {
    for (let i = 0; i < 3; i++)
      g.add(part(CONE, accent, [0, height * (.88 + i * .04), -.04 - i * .1], [.07, .2 - i * .04, .04], [-.5, 0, 0]));
  }
  if (f.has('claws')) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++)
      g.add(part(CONE, mat(0xf2f2f2), [s * (.36 + i * .04), height * .28, .16 - i * .08], [.03, .1, .03], [-1.2, 0, 0]));
  }
  if (f.has('shell')) {
    g.add(part(SPHERE, mat(shade(accentHex, -.12), { flatShading: true }), [0, height * .58, -.12], [.44, .34, .4]));
  }
  if (f.has('aura')) {
    const aura = part(TORUS, mat(shade(accentHex, .3), { transparent: true, opacity: .5 }), [0, height * .6, 0], [.6, .6, .6], [Math.PI / 2.2, 0, 0]);
    g.add(aura); limbs.push(aura);
  }
  if (sp.legend) {
    const halo = part(TORUS, mat(0xffe9a8, { transparent: true, opacity: .55 }), [0, height * 1.06, 0], [.42, .42, .42], [Math.PI / 2, 0, 0]);
    g.add(halo); limbs.push(halo);
  }

  const s = sp.scale;
  g.scale.setScalar(s);
  return { group: g, bob, limbs, height: height * s };
}

function shiftHueStr(hex: string, amt: number): string {
  if (!amt) return hex;
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL((hsl.h + amt) % 1, hsl.s, hsl.l);
  return '#' + c.getHexString();
}
function shiftHue(hex: string, amt: number): number {
  return new THREE.Color(shiftHueStr(hex, amt)).getHex();
}

/** Petit personnage humanoïde (joueur, dresseurs, PNJ). */
export function buildHuman(shirt: number, skin = 0xf2c9a0, hair = 0x3a2a20, cap?: number): CreatureRig {
  const g = new THREE.Group();
  const bob: THREE.Object3D[] = [];
  const limbs: THREE.Object3D[] = [];
  const body = mat(shirt), sk = mat(skin), hr = mat(hair), pants = mat(0x2c3e57);

  const torso = part(BOX, body, [0, .52, 0], [.34, .38, .24]);
  g.add(torso); bob.push(torso);
  const head = part(SPHERE, sk, [0, .88, 0], [.21, .22, .21]);
  g.add(head); bob.push(head);
  g.add(part(SPHERE, hr, [0, .95, -.03], [.205, .12, .205]));
  if (cap !== undefined) {
    g.add(part(SPHERE, mat(cap), [0, 1.01, -.01], [.222, .13, .222]));
    g.add(part(BOX, mat(cap), [0, .985, .18], [.2, .028, .16]));
  }
  for (const s of [-1, 1]) {
    g.add(part(SPHERE, mat(0x101820), [s * .075, .89, .19], [.034, .045, .022]));
    const arm = part(BOX, sk, [s * .23, .5, 0], [.1, .34, .12]);
    g.add(arm); limbs.push(arm);
    const leg = part(BOX, pants, [s * .1, .18, 0], [.13, .36, .14]);
    g.add(leg); limbs.push(leg);
  }
  return { group: g, bob, limbs, height: 1.05 };
}

/** Animation d'inactivité partagée. */
export function animateRig(rig: CreatureRig, t: number, walk = 0) {
  for (let i = 0; i < rig.bob.length; i++) {
    const o = rig.bob[i];
    const base = (o.userData.baseY ??= o.position.y);
    o.position.y = base + Math.sin(t * 2.4 + i * .7) * .022;
  }
  for (let i = 0; i < rig.limbs.length; i++) {
    const o = rig.limbs[i];
    const baseR = (o.userData.baseRX ??= o.rotation.x);
    o.rotation.x = baseR + Math.sin(t * (walk > 0 ? 9 : 1.8) + i * Math.PI) * (walk > 0 ? .5 : .08);
  }
}
