import * as THREE from 'three';
import { TYPE_COLOR } from '../data/types';
import type { Species } from '../data/species';
import { RNG, hashStr } from '../engine/rng';
import { toonGradient } from '../engine/renderer';

/* ---- géométries partagées (jamais libérées) ---- */
const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const SPHERE_LO = new THREE.SphereGeometry(1, 10, 8);
const BOX = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
const CONE = new THREE.ConeGeometry(1, 1, 10);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const CAPSULE = new THREE.CapsuleGeometry(1, 1, 4, 10);
const TORUS = new THREE.TorusGeometry(1, .22, 8, 20);
for (const g of [SPHERE, SPHERE_LO, BOX, CONE, CYL, CAPSULE, TORUS]) g.userData.shared = true;

function mat(color: number | string, opts: THREE.MeshToonMaterialParameters = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });
}

function shade(hex: string, amt: number): number {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 1.06), Math.max(0.05, Math.min(0.95, hsl.l + amt)));
  return c.getHex();
}

function part(geo: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number], scl: [number, number, number], rot?: [number, number, number]) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...pos);
  mesh.scale.set(...scl);
  if (rot) mesh.rotation.set(...rot);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export interface CreatureRig {
  group: THREE.Object3D;
  bob: THREE.Object3D[];
  limbs: THREE.Object3D[];
  height: number;
}

/* ---------------- contour façon dessin animé ---------------- */
const OUTLINE_VERT = /* glsl */`
  uniform float uThickness;
  void main() {
    // Décalage en espace vue : l'épaisseur reste constante même si les pièces
    // du modèle ont des échelles très différentes.
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    mv.xyz += n * uThickness;
    gl_Position = projectionMatrix * mv;
  }
`;
const OUTLINE_FRAG = /* glsl */`
  uniform vec3 uColor;
  void main() { gl_FragColor = vec4(uColor, 1.0); }
`;

/** Duplique le modèle en coque inversée : donne un liseré sombre très lisible. */
export function addOutline(rig: CreatureRig, thickness = 0.05, color = 0x141824) {
  const shell = new THREE.Group();
  const outlineMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { uThickness: { value: thickness }, uColor: { value: new THREE.Color(color) } },
    vertexShader: OUTLINE_VERT, fragmentShader: OUTLINE_FRAG, fog: false,
  });
  rig.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mm = m.material as THREE.Material & { transparent?: boolean };
    if (mm?.transparent) return;              // pas de contour sur les parties translucides
    const clone = new THREE.Mesh(m.geometry, outlineMat);
    m.updateMatrix();
    clone.applyMatrix4(m.matrix);
    // reporte la hiérarchie parente éventuelle
    let p = m.parent;
    while (p && p !== rig.group) { p.updateMatrix(); clone.applyMatrix4(p.matrix); p = p.parent; }
    shell.add(clone);
  });
  shell.renderOrder = -1;
  rig.group.add(shell);
}

/* ---------------- créatures ---------------- */
export function buildCreature(sp: Species, shiny = false): CreatureRig {
  const rng = new RNG(hashStr(sp.id));
  const base = TYPE_COLOR[sp.types[0]];
  const accentHex = TYPE_COLOR[sp.types[1] ?? sp.types[0]];
  const hueShift = shiny ? .5 : 0;
  const bodyHex = shiftHueStr(base, hueShift + rng.next() * .04 - .02);
  const body = mat(bodyHex);
  const belly = mat(shade(bodyHex, .26));
  const accent = mat(shiftHue(accentHex, hueShift + .04));
  const dark = mat(shade(bodyHex, -.2));
  const eyeW = mat(0xf8fcff);
  const eyeB = mat(0x0d121c);
  const gloss = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const g = new THREE.Group();
  const bob: THREE.Object3D[] = [];
  const limbs: THREE.Object3D[] = [];
  const f = new Set(sp.feats);
  let height = 1;

  const addEyes = (y: number, z: number, r = .11, spread = .17) => {
    for (const s of [-1, 1]) {
      g.add(part(SPHERE, eyeW, [s * spread, y, z], [r, r * 1.18, r * .68]));
      g.add(part(SPHERE_LO, eyeB, [s * spread, y, z + r * .34], [r * .54, r * .66, r * .42]));
      g.add(part(SPHERE_LO, gloss, [s * spread - r * .22, y + r * .34, z + r * .46], [r * .2, r * .2, r * .14]));
    }
  };
  const addBrows = (y: number, z: number, spread: number, tilt: number) => {
    for (const s of [-1, 1]) g.add(part(BOX, dark, [s * spread, y, z], [.1, .028, .05], [0, 0, s * tilt]));
  };

  switch (sp.shape) {
    case 'quad': {
      const torso = part(SPHERE, body, [0, .54, 0], [.43, .35, .56]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .40, .06], [.35, .23, .47]));
      const head = part(SPHERE, body, [0, .78, .46], [.32, .3, .3]);
      g.add(head); bob.push(head);
      g.add(part(SPHERE, belly, [0, .70, .64], [.19, .15, .17]));      // museau
      g.add(part(CONE, accent, [0, .70, .76], [.1, .16, .1], [Math.PI / 2, 0, 0]));
      g.add(part(SPHERE_LO, eyeB, [0, .74, .74], [.05, .04, .05]));    // truffe
      addEyes(.85, .68, .075, .15);
      addBrows(.94, .66, .15, .3);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = part(CAPSULE, dark, [sx * .28, .2, sz * .33], [.085, .13, .085]);
        g.add(leg); limbs.push(leg);
        g.add(part(SPHERE_LO, dark, [sx * .28, .06, sz * .33 + .04], [.11, .07, .13]));
      }
      height = 1.1;
      break;
    }
    case 'biped': {
      const torso = part(CAPSULE, body, [0, .74, 0], [.33, .22, .3]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .68, .17], [.25, .3, .19]));
      const head = part(SPHERE, body, [0, 1.2, .03], [.3, .3, .3]);
      g.add(head); bob.push(head);
      g.add(part(SPHERE, belly, [0, 1.13, .24], [.16, .12, .13]));
      addEyes(1.26, .26, .08, .14);
      addBrows(1.37, .24, .14, .34);
      g.add(part(CONE, accent, [0, 1.14, .32], [.07, .13, .07], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) {
        const arm = part(CAPSULE, body, [s * .38, .8, 0], [.075, .13, .075], [0, 0, s * .28]);
        g.add(arm); limbs.push(arm);
        g.add(part(SPHERE_LO, dark, [s * .45, .58, .02], [.1, .1, .1]));
        const leg = part(CAPSULE, dark, [s * .17, .28, 0], [.095, .18, .095]);
        g.add(leg); limbs.push(leg);
        g.add(part(SPHERE_LO, dark, [s * .17, .07, .06], [.12, .07, .16]));
      }
      height = 1.55;
      break;
    }
    case 'serpent': {
      let y = .32, z = 0, r = .31;
      for (let i = 0; i < 9; i++) {
        const seg = part(SPHERE, i % 2 ? body : belly, [0, y, z], [r, r * .92, r]);
        g.add(seg); if (i < 3) bob.push(seg);
        y += .13; z -= .12; r *= .92;
      }
      const head = part(SPHERE, body, [0, y + .05, z + .07], [.29, .26, .32]);
      g.add(head); bob.push(head);
      g.add(part(SPHERE, belly, [0, y - .01, z + .3], [.17, .12, .16]));
      addEyes(y + .12, z + .3, .075, .14);
      addBrows(y + .22, z + .28, .14, .35);
      g.add(part(CONE, accent, [0, y, z + .38], [.09, .16, .09], [Math.PI / 2, 0, 0]));
      height = y + .32;
      break;
    }
    case 'bird': {
      const torso = part(SPHERE, body, [0, .72, 0], [.33, .4, .35]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .64, .19], [.25, .29, .22]));
      const head = part(SPHERE, body, [0, 1.14, .05], [.26, .25, .26]);
      g.add(head); bob.push(head);
      addEyes(1.19, .25, .075, .13);
      g.add(part(CONE, mat(0xf7c948), [0, 1.09, .32], [.085, .2, .085], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) {
        const leg = part(CYL, mat(0xdca548), [s * .13, .21, 0], [.045, .42, .045]);
        g.add(leg); limbs.push(leg);
        for (let t = -1; t <= 1; t++)
          g.add(part(BOX, mat(0xdca548), [s * .13 + t * .05, .015, .07], [.03, .03, .13]));
      }
      // plumage de queue
      for (let i = -1; i <= 1; i++)
        g.add(part(CONE, accent, [i * .1, .68, -.36], [.07, .3, .04], [1.35, 0, i * .35]));
      height = 1.45;
      break;
    }
    case 'blob': {
      const torso = part(SPHERE, body, [0, .44, 0], [.53, .44, .51]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .31, .23], [.37, .27, .31]));
      addEyes(.58, .43, .095, .18);
      addBrows(.72, .4, .18, .28);
      g.add(part(SPHERE_LO, dark, [0, .42, .5], [.07, .035, .04]));
      height = 1;
      break;
    }
    case 'insect': {
      const th = part(SPHERE, body, [0, .52, -.12], [.29, .27, .35]);
      g.add(th); bob.push(th);
      g.add(part(SPHERE, dark, [0, .5, .28], [.25, .23, .25]));
      const head = part(SPHERE, body, [0, .56, .56], [.21, .21, .21]);
      g.add(head); bob.push(head);
      addEyes(.6, .72, .085, .12);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const leg = part(CAPSULE, dark, [s * .31, .26, -.22 + i * .29], [.03, .1, .03], [0, 0, s * .55]);
        g.add(leg); limbs.push(leg);
      }
      for (const s of [-1, 1]) {
        g.add(part(CYL, accent, [s * .1, .76, .62], [.018, .22, .018], [-.6, 0, s * .5]));
        g.add(part(SPHERE_LO, accent, [s * .21, .95, .74], [.045, .045, .045]));
      }
      height = 1.05;
      break;
    }
    case 'fish': {
      const torso = part(SPHERE, body, [0, .54, 0], [.31, .4, .54]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .43, .13], [.23, .25, .4]));
      addEyes(.7, .39, .085, .17);
      g.add(part(CONE, accent, [0, .56, -.62], [.28, .36, .09], [Math.PI / 2, 0, 0]));
      g.add(part(CONE, accent, [0, .95, -.04], [.15, .27, .05]));
      for (const s of [-1, 1])
        g.add(part(CONE, accent, [s * .3, .5, .06], [.15, .22, .04], [0, 0, s * 1.35]));
      g.add(part(SPHERE_LO, dark, [0, .5, .5], [.07, .04, .04]));
      height = 1.1;
      break;
    }
    case 'ghost': {
      const bodyT = mat(bodyHex, { transparent: true, opacity: .94 });
      const torso = part(SPHERE, bodyT, [0, .82, 0], [.38, .42, .36]);
      g.add(torso); bob.push(torso);
      const tail = part(CONE, mat(bodyHex, { transparent: true, opacity: .72 }), [0, .3, 0], [.36, .54, .34], [Math.PI, 0, 0]);
      g.add(tail); bob.push(tail);
      // franges spectrales
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const w = part(CONE, mat(bodyHex, { transparent: true, opacity: .55 }),
          [Math.cos(a) * .22, .16, Math.sin(a) * .2], [.09, .26, .09], [Math.PI, 0, 0]);
        g.add(w); limbs.push(w);
      }
      addEyes(.94, .32, .1, .16);
      addBrows(1.08, .3, .16, .4);
      for (const s of [-1, 1]) {
        const arm = part(SPHERE, bodyT, [s * .46, .86, .04], [.11, .11, .11]);
        g.add(arm); limbs.push(arm);
      }
      height = 1.35;
      break;
    }
    case 'golem': {
      const torso = part(BOX, body, [0, .66, 0], [.64, .58, .52]);
      g.add(torso); bob.push(torso);
      g.add(part(BOX, belly, [0, .58, .28], [.4, .32, .04]));
      const head = part(BOX, dark, [0, 1.1, .02], [.38, .32, .36]);
      g.add(head); bob.push(head);
      addEyes(1.12, .21, .07, .12);
      for (const s of [-1, 1]) {
        const arm = part(BOX, body, [s * .5, .64, 0], [.21, .42, .23]);
        g.add(arm); limbs.push(arm);
        g.add(part(BOX, dark, [s * .5, .4, .02], [.24, .16, .26]));
        const leg = part(BOX, dark, [s * .23, .19, 0], [.23, .38, .27]);
        g.add(leg); limbs.push(leg);
      }
      height = 1.4;
      break;
    }
    case 'plantoid': {
      const torso = part(SPHERE, body, [0, .52, 0], [.37, .44, .37]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .44, .22], [.24, .26, .18]));
      addEyes(.62, .32, .085, .15);
      addBrows(.75, .3, .15, .3);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const leaf = part(CONE, accent, [Math.cos(a) * .23, .97, Math.sin(a) * .23], [.14, .36, .05],
          [Math.cos(a) * .75, -a, Math.sin(a) * .75]);
        g.add(leaf); limbs.push(leaf);
      }
      g.add(part(CYL, mat(shade(TYPE_COLOR.Plante, -.18)), [0, .84, 0], [.05, .12, .05]));
      for (const s of [-1, 1]) {
        const leg = part(CAPSULE, dark, [s * .16, .18, 0], [.075, .09, .075]);
        g.add(leg); limbs.push(leg);
        g.add(part(SPHERE_LO, dark, [s * .16, .05, .05], [.1, .06, .13]));
      }
      height = 1.4;
      break;
    }
  }

  /* ---- attributs ---- */
  if (f.has('wings')) {
    const wingMat = mat(shade(accentHex, .14), { transparent: true, opacity: .96, side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.add(part(CONE, wingMat, [0, 0, 0], [.34, .5, .05], [Math.PI / 2, 0, 0]));
      wing.add(part(CONE, wingMat, [s * .12, -.1, -.12], [.2, .34, .04], [Math.PI / 2, 0, s * .5]));
      wing.position.set(s * .5, height * .62, -.12);
      wing.rotation.z = s * -.85;
      wing.rotation.y = s * .3;
      wing.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
      g.add(wing); limbs.push(wing);
    }
  }
  if (f.has('horn')) {
    g.add(part(CONE, mat(shade(accentHex, .3)), [0, height * .93, .05], [.065, .3, .065], [-.2, 0, 0]));
    for (const s of [-1, 1])
      g.add(part(CONE, mat(shade(accentHex, .3)), [s * .17, height * .87, .01], [.045, .2, .045], [0, 0, s * .45]));
  }
  if (f.has('ears')) {
    for (const s of [-1, 1]) {
      g.add(part(CONE, body, [s * .18, height * .87, .03], [.09, .23, .07], [0, 0, s * .32]));
      g.add(part(CONE, accent, [s * .18, height * .855, .05], [.055, .15, .04], [0, 0, s * .32]));
    }
  }
  if (f.has('tail')) {
    const tail = new THREE.Group();
    tail.add(part(CAPSULE, body, [0, 0, 0], [.075, .16, .075], [1.15, 0, 0]));
    tail.add(part(CONE, accent, [0, .16, -.32], [.11, .26, .11], [-1.15, 0, 0]));
    tail.position.set(0, height * .38, -.5);
    tail.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
    g.add(tail); limbs.push(tail);
  }
  if (f.has('fins')) {
    const finMat = mat(shade(accentHex, .12), { side: THREE.DoubleSide });
    for (const s of [-1, 1])
      g.add(part(CONE, finMat, [s * .37, height * .42, 0], [.19, .3, .035], [0, 0, s * 1.32]));
  }
  if (f.has('spikes')) {
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      g.add(part(CONE, mat(shade(accentHex, -.08)),
        [0, height * (.5 + t * .42), -.2 + t * .12], [.055 + (1 - t) * .02, .17, .055], [-.35, 0, 0]));
    }
  }
  if (f.has('crest')) {
    for (let i = 0; i < 4; i++)
      g.add(part(CONE, accent, [0, height * (.86 + i * .035), -.02 - i * .1], [.065, .22 - i * .04, .035], [-.55, 0, 0]));
  }
  if (f.has('claws')) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++)
      g.add(part(CONE, mat(0xf4f6fa), [s * (.34 + i * .045), height * .22, .18 - i * .085], [.028, .1, .028], [-1.25, 0, 0]));
  }
  if (f.has('shell')) {
    g.add(part(SPHERE, mat(shade(accentHex, -.14)), [0, height * .58, -.13], [.46, .36, .42]));
    for (let i = 0; i < 3; i++)
      g.add(part(TORUS, mat(shade(accentHex, -.26)), [0, height * .58, -.13], [.3 + i * .07, .3 + i * .07, .3], [1.35, 0, 0]));
  }
  if (f.has('aura')) {
    const aura = part(TORUS, new THREE.MeshBasicMaterial({ color: shade(accentHex, .34), transparent: true, opacity: .45 }),
      [0, height * .6, 0], [.62, .62, .62], [Math.PI / 2.2, 0, 0]);
    aura.castShadow = false;
    g.add(aura); limbs.push(aura);
  }
  if (sp.legend) {
    const halo = part(TORUS, new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: .6 }),
      [0, height * 1.08, 0], [.44, .44, .44], [Math.PI / 2, 0, 0]);
    halo.castShadow = false;
    g.add(halo); limbs.push(halo);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spark = part(SPHERE_LO, new THREE.MeshBasicMaterial({ color: 0xfff2c4, transparent: true, opacity: .8 }),
        [Math.cos(a) * .62, height * .55, Math.sin(a) * .62], [.05, .05, .05]);
      spark.castShadow = false;
      g.add(spark); limbs.push(spark);
    }
  }

  g.scale.setScalar(sp.scale);
  return { group: g, bob, limbs, height: height * sp.scale };
}

function shiftHueStr(hex: string, amt: number): string {
  if (!amt) return hex;
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL((hsl.h + amt + 1) % 1, hsl.s, hsl.l);
  return '#' + c.getHexString();
}
function shiftHue(hex: string, amt: number): number {
  return new THREE.Color(shiftHueStr(hex, amt)).getHex();
}

/* ---------------- personnages ---------------- */
export function buildHuman(shirt: number, skin = 0xf2c9a0, hair = 0x3a2a20, cap?: number): CreatureRig {
  const g = new THREE.Group();
  const bob: THREE.Object3D[] = [];
  const limbs: THREE.Object3D[] = [];
  const body = mat(shirt), sk = mat(skin), hr = mat(hair);
  const pants = mat(0x2c3e57), shoe = mat(0x1d2634);

  const torso = part(CAPSULE, body, [0, .55, 0], [.19, .1, .15]);
  g.add(torso); bob.push(torso);
  g.add(part(BOX, mat(0x22304a), [0, .38, 0], [.34, .08, .25]));           // ceinture
  const head = part(SPHERE, sk, [0, .89, 0], [.2, .21, .2]);
  g.add(head); bob.push(head);
  g.add(part(SPHERE, hr, [0, .95, -.03], [.205, .14, .205]));              // cheveux
  g.add(part(SPHERE, hr, [0, .87, -.16], [.17, .13, .1]));                 // nuque
  if (cap !== undefined) {
    g.add(part(SPHERE, mat(cap), [0, .99, -.01], [.222, .14, .222]));
    g.add(part(BOX, mat(cap), [0, .965, .18], [.2, .03, .16]));            // visière
    g.add(part(SPHERE_LO, mat(0xf6f8fc), [0, 1.02, .12], [.05, .04, .04]));
  }
  for (const s of [-1, 1]) {
    g.add(part(SPHERE_LO, mat(0x11161f), [s * .075, .9, .19], [.032, .042, .02]));   // yeux
    const arm = part(CAPSULE, body, [s * .235, .52, 0], [.052, .17, .052], [0, 0, s * .09]);
    g.add(arm); limbs.push(arm);
    g.add(part(SPHERE_LO, sk, [s * .255, .33, .01], [.058, .07, .058]));             // main
    const leg = part(CAPSULE, pants, [s * .1, .22, 0], [.068, .13, .068]);
    g.add(leg); limbs.push(leg);
    g.add(part(BOX, shoe, [s * .1, .04, .03], [.12, .07, .2]));                      // chaussure
  }
  // sac à dos
  g.add(part(BOX, mat(0xc4564e), [0, .58, -.16], [.26, .28, .12]));
  g.add(part(BOX, mat(0x8f3f3a), [0, .5, -.23], [.18, .1, .04]));

  return { group: g, bob, limbs, height: 1.1 };
}

/** Animation d'inactivité / de marche partagée. */
export function animateRig(rig: CreatureRig, t: number, walk = 0) {
  for (let i = 0; i < rig.bob.length; i++) {
    const o = rig.bob[i];
    const base = (o.userData.baseY ??= o.position.y);
    o.position.y = base + Math.sin(t * 2.4 + i * .7) * (walk > 0 ? .03 : .022);
  }
  for (let i = 0; i < rig.limbs.length; i++) {
    const o = rig.limbs[i];
    const baseR = (o.userData.baseRX ??= o.rotation.x);
    o.rotation.x = baseR + Math.sin(t * (walk > 0 ? 9 : 1.8) + i * Math.PI) * (walk > 0 ? .55 : .09);
  }
}
