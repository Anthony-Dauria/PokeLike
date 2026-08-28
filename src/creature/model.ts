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
  // Couleurs propres à l'espèce quand elles existent, sinon dérivées du type.
  const baseHex = sp.body ?? TYPE_COLOR[sp.types[0]];
  const accentHex = sp.accent ?? TYPE_COLOR[sp.types[1] ?? sp.types[0]];
  const hueShift = shiny ? .5 : 0;
  const bodyHex = shiftHueStr(baseHex, hueShift);
  const body = mat(bodyHex);
  const belly = mat(shade(bodyHex, .22));
  const accent = mat(shiftHue(accentHex, hueShift));
  const dark = mat(shade(bodyHex, -.2));
  const eyeW = mat(0xf8fcff);
  const eyeB = mat(0x0d121c);
  const gloss = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const g = new THREE.Group();
  const bob: THREE.Object3D[] = [];
  const limbs: THREE.Object3D[] = [];
  const f = new Set(sp.feats);
  let height = 1;
  // La silhouette suit les statistiques : les gros PV s'épaississent,
  // la Vitesse affine et allonge. Gratuit, et ça varie sur les 217 espèces.
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const bulk = clamp((sp.base.hp - 62) / 130, -.3, .42);
  const agility = clamp((sp.base.spe - 70) / 130, -.3, .38);
  // Points d'ancrage renseignés par chaque silhouette, utilisés par les attributs.
  let head: [number, number, number] = [0, .9, .2];
  let headR = .28;
  let tail: [number, number, number] = [0, .4, -.5];

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
  const legPair = (sx: number, y: number, z: number, r: number, len: number, m = dark) => {
    for (const s of [-1, 1]) {
      const leg = part(CAPSULE, m, [s * sx, y, z], [r, len, r]);
      g.add(leg); limbs.push(leg);
      g.add(part(SPHERE_LO, m, [s * sx, y - len - r * .6, z + .05], [r * 1.4, r * .8, r * 1.7]));
    }
  };

  switch (sp.shape) {
    case 'quad': {
      const torso = part(SPHERE, body, [0, .54, 0], [.43, .35, .56]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .40, .06], [.35, .23, .47]));
      const h = part(SPHERE, body, [0, .78, .46], [.32, .3, .3]);
      g.add(h); bob.push(h);
      g.add(part(SPHERE, belly, [0, .70, .64], [.19, .15, .17]));
      g.add(part(SPHERE_LO, eyeB, [0, .74, .74], [.05, .04, .05]));
      addEyes(.85, .68, .075, .15);
      addBrows(.94, .66, .15, .3);
      for (const sz of [-1, 1]) legPair(.28, .2, sz * .33, .085, .13);
      head = [0, .78, .46]; headR = .3; tail = [0, .48, -.56];
      height = 1.1;
      break;
    }
    case 'biped': {
      const torso = part(CAPSULE, body, [0, .82, 0], [.28, .25, .26]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .76, .15], [.2, .3, .16]));
      const h = part(SPHERE, body, [0, 1.28, .03], [.27, .27, .27]);
      g.add(h); bob.push(h);
      g.add(part(SPHERE, belly, [0, 1.21, .22], [.14, .11, .12]));
      addEyes(1.34, .24, .078, .13);
      addBrows(1.45, .22, .13, .34);
      for (const s of [-1, 1]) {
        const arm = part(CAPSULE, body, [s * .33, .86, 0], [.068, .16, .068], [0, 0, s * .24]);
        g.add(arm); limbs.push(arm);
        g.add(part(SPHERE_LO, dark, [s * .39, .6, .02], [.09, .09, .09]));
      }
      legPair(.15, .3, 0, .088, .22);
      head = [0, 1.28, .03]; headR = .27; tail = [0, .62, -.36];
      height = 1.65;
      break;
    }
    case 'humanoid': {
      const torso = part(CAPSULE, body, [0, .88, 0], [.26, .3, .22]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .8, .16], [.19, .26, .14]));
      g.add(part(BOX, dark, [0, .58, 0], [.42, .09, .32]));
      const h = part(SPHERE, body, [0, 1.42, .02], [.26, .28, .26]);
      g.add(h); bob.push(h);
      addEyes(1.47, .23, .075, .13);
      addBrows(1.58, .21, .13, .3);
      for (const s of [-1, 1]) {
        const arm = part(CAPSULE, body, [s * .34, .88, 0], [.062, .2, .062], [0, 0, s * .1]);
        g.add(arm); limbs.push(arm);
        g.add(part(SPHERE_LO, accent, [s * .36, .58, .02], [.085, .095, .085]));
      }
      legPair(.15, .32, 0, .085, .22);
      head = [0, 1.42, .02]; headR = .27; tail = [0, .7, -.34];
      height = 1.8;
      break;
    }
    case 'dragon': {
      const torso = part(SPHERE, body, [0, .95, -.05], [.42, .46, .5]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .84, .22], [.3, .36, .3]));
      // cou puis tête projetée en avant
      for (let i = 0; i < 3; i++)
        g.add(part(SPHERE, body, [0, 1.3 + i * .16, .1 + i * .12], [.19 - i * .015, .18, .19 - i * .015]));
      const h = part(SPHERE, body, [0, 1.78, .5], [.26, .24, .34]);
      g.add(h); bob.push(h);
      g.add(part(SPHERE, belly, [0, 1.72, .74], [.15, .11, .18]));
      addEyes(1.86, .68, .075, .14);
      addBrows(1.96, .64, .14, .35);
      for (const s of [-1, 1]) {
        const arm = part(CAPSULE, body, [s * .42, .9, .1], [.07, .12, .07], [0, 0, s * .4]);
        g.add(arm); limbs.push(arm);
      }
      legPair(.24, .38, 0, .11, .22);
      head = [0, 1.78, .5]; headR = .3; tail = [0, .8, -.62];
      height = 2.15;
      break;
    }
    case 'serpent': {
      let y = .32, z = 0, r = .31;
      for (let i = 0; i < 9; i++) {
        const seg = part(SPHERE, i % 2 ? body : belly, [0, y, z], [r, r * .92, r]);
        g.add(seg); if (i < 3) bob.push(seg);
        y += .13; z -= .12; r *= .92;
      }
      const h = part(SPHERE, body, [0, y + .05, z + .07], [.29, .26, .32]);
      g.add(h); bob.push(h);
      g.add(part(SPHERE, belly, [0, y - .01, z + .3], [.17, .12, .16]));
      addEyes(y + .12, z + .3, .075, .14);
      addBrows(y + .22, z + .28, .14, .35);
      head = [0, y + .05, z + .07]; headR = .3; tail = [0, .34, z - 1.0];
      height = y + .32;
      break;
    }
    case 'bird': {
      const torso = part(SPHERE, body, [0, .72, 0], [.33, .4, .35]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .64, .19], [.25, .29, .22]));
      const h = part(SPHERE, body, [0, 1.14, .05], [.26, .25, .26]);
      g.add(h); bob.push(h);
      addEyes(1.19, .25, .075, .13);
      g.add(part(CONE, mat(shade(accentHex, .1)), [0, 1.09, .32], [.085, .2, .085], [Math.PI / 2, 0, 0]));
      for (const s of [-1, 1]) {
        const leg = part(CYL, mat(0xdca548), [s * .13, .21, 0], [.045, .42, .045]);
        g.add(leg); limbs.push(leg);
        for (let t = -1; t <= 1; t++)
          g.add(part(BOX, mat(0xdca548), [s * .13 + t * .05, .015, .07], [.03, .03, .13]));
      }
      for (let i = -1; i <= 1; i++)
        g.add(part(CONE, accent, [i * .1, .68, -.36], [.07, .3, .04], [1.35, 0, i * .35]));
      head = [0, 1.14, .05]; headR = .26; tail = [0, .68, -.42];
      height = 1.45;
      break;
    }
    case 'bat': {
      const torso = part(SPHERE, body, [0, .95, 0], [.3, .3, .28]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .88, .18], [.2, .18, .14]));
      addEyes(1.0, .22, .08, .13);
      // grandes oreilles caractéristiques
      for (const s of [-1, 1])
        g.add(part(CONE, body, [s * .17, 1.24, -.02], [.11, .3, .09], [0, 0, s * .35]));
      head = [0, .95, 0]; headR = .3; tail = [0, .75, -.3];
      height = 1.35;
      break;
    }
    case 'blob': {
      const torso = part(SPHERE, body, [0, .44, 0], [.53, .44, .51]);
      g.add(torso); bob.push(torso);
      g.add(part(SPHERE, belly, [0, .31, .23], [.37, .27, .31]));
      addEyes(.58, .43, .095, .18);
      addBrows(.72, .4, .18, .28);
      g.add(part(SPHERE_LO, dark, [0, .42, .5], [.07, .035, .04]));
      head = [0, .5, .2]; headR = .4; tail = [0, .3, -.5];
      height = 1;
      break;
    }
    case 'insect': {
      const th = part(SPHERE, body, [0, .52, -.12], [.29, .27, .35]);
      g.add(th); bob.push(th);
      g.add(part(SPHERE, dark, [0, .5, .28], [.25, .23, .25]));
      const h = part(SPHERE, body, [0, .56, .56], [.21, .21, .21]);
      g.add(h); bob.push(h);
      addEyes(.6, .72, .085, .12);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const leg = part(CAPSULE, dark, [s * .31, .26, -.22 + i * .29], [.03, .1, .03], [0, 0, s * .55]);
        g.add(leg); limbs.push(leg);
      }
      for (const s of [-1, 1]) {
        g.add(part(CYL, accent, [s * .1, .76, .62], [.018, .22, .018], [-.6, 0, s * .5]));
        g.add(part(SPHERE_LO, accent, [s * .21, .95, .74], [.045, .045, .045]));
      }
      head = [0, .56, .56]; headR = .22; tail = [0, .5, -.44];
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
      g.add(part(SPHERE_LO, dark, [0, .5, .5], [.07, .04, .04]));
      head = [0, .66, .3]; headR = .3; tail = [0, .56, -.62];
      height = 1.1;
      break;
    }
    case 'turtle': {
      const shell = part(SPHERE, mat(shade(accentHex, -.06)), [0, .58, -.05], [.62, .42, .6]);
      g.add(shell); bob.push(shell);
      g.add(part(SPHERE, belly, [0, .34, 0], [.55, .2, .54]));
      const h = part(SPHERE, body, [0, .68, .6], [.24, .23, .26]);
      g.add(h); bob.push(h);
      addEyes(.74, .8, .07, .12);
      for (const sz of [-1, 1]) legPair(.42, .18, sz * .3, .1, .07, body);
      head = [0, .68, .6]; headR = .25; tail = [0, .4, -.6];
      height = 1.1;
      break;
    }
    case 'ghost': {
      const bodyT = mat(bodyHex, { transparent: true, opacity: .94 });
      const torso = part(SPHERE, bodyT, [0, .82, 0], [.38, .42, .36]);
      g.add(torso); bob.push(torso);
      const tailG = part(CONE, mat(bodyHex, { transparent: true, opacity: .72 }), [0, .3, 0], [.36, .54, .34], [Math.PI, 0, 0]);
      g.add(tailG); bob.push(tailG);
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
      head = [0, .86, .1]; headR = .38; tail = [0, .4, -.4];
      height = 1.35;
      break;
    }
    case 'golem': {
      const torso = part(BOX, body, [0, .66, 0], [.64, .58, .52]);
      g.add(torso); bob.push(torso);
      g.add(part(BOX, belly, [0, .58, .28], [.4, .32, .04]));
      const h = part(BOX, dark, [0, 1.1, .02], [.38, .32, .36]);
      g.add(h); bob.push(h);
      addEyes(1.12, .21, .07, .12);
      for (const s of [-1, 1]) {
        const arm = part(BOX, body, [s * .5, .64, 0], [.21, .42, .23]);
        g.add(arm); limbs.push(arm);
        g.add(part(BOX, dark, [s * .5, .4, .02], [.24, .16, .26]));
        const leg = part(BOX, dark, [s * .23, .19, 0], [.23, .38, .27]);
        g.add(leg); limbs.push(leg);
      }
      head = [0, 1.1, .02]; headR = .32; tail = [0, .6, -.4];
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
      legPair(.16, .18, 0, .075, .09);
      head = [0, .58, .2]; headR = .35; tail = [0, .4, -.42];
      height = 1.4;
      break;
    }
  }

  /* ---- attributs ---- */
  if (f.has('wings')) {
    const wingMat = mat(shade(accentHex, -.24), { side: THREE.DoubleSide });
    const boneMat = mat(shade(accentHex, .12));
    for (const s of [-1, 1]) {
      const wing = new THREE.Group();
      wing.add(part(CONE, wingMat, [0, 0, 0], [.36, .55, .05], [Math.PI / 2, 0, 0]));
      wing.add(part(CONE, wingMat, [s * .16, -.14, -.16], [.26, .42, .04], [Math.PI / 2, 0, s * .5]));
      wing.add(part(CYL, boneMat, [0, .05, -.02], [.028, .34, .028], [Math.PI / 2, 0, s * .18]));
      wing.position.set(s * .33, height * .74, -.2);
      wing.rotation.z = s * -.55;
      wing.rotation.y = s * .95;
      wing.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
      g.add(wing); limbs.push(wing);
    }
  }
  if (f.has('horn')) {
    g.add(part(CONE, mat(shade(accentHex, .3)), [head[0], head[1] + headR * .95, head[2] - .02], [.065, .3, .065], [-.2, 0, 0]));
    for (const s of [-1, 1])
      g.add(part(CONE, mat(shade(accentHex, .3)), [head[0] + s * headR * .6, head[1] + headR * .7, head[2] - .06], [.045, .2, .045], [0, 0, s * .45]));
  }
  if (f.has('ears')) {
    for (const s of [-1, 1]) {
      g.add(part(CONE, body, [head[0] + s * headR * .6, head[1] + headR * .85, head[2] - .04], [.09, .23, .07], [0, 0, s * .32]));
      g.add(part(CONE, accent, [head[0] + s * headR * .6, head[1] + headR * .82, head[2] - .02], [.055, .15, .04], [0, 0, s * .32]));
    }
  }
  if (f.has('tuft')) {
    for (let i = 0; i < 3; i++)
      g.add(part(CONE, accent, [head[0] + (i - 1) * .07, head[1] + headR * (1.05 + (i === 1 ? .12 : 0)), head[2] - .02],
        [.035, .16, .035], [-.25, 0, (i - 1) * .5]));
  }
  if (f.has('cheeks')) {
    for (const s of [-1, 1])
      g.add(part(SPHERE, mat(shade(accentHex, .18)), [head[0] + s * headR * .78, head[1] - headR * .18, head[2] + headR * .5], [.085, .085, .05]));
  }
  if (f.has('fangs')) {
    for (const s of [-1, 1])
      g.add(part(CONE, mat(0xf6f8fc), [head[0] + s * .07, head[1] - headR * .42, head[2] + headR * .78], [.03, .09, .03], [Math.PI, 0, 0]));
  }
  if (f.has('mane')) {
    const m = mat(shade(accentHex, .1));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.add(part(CONE, m, [head[0] + Math.cos(a) * headR * .95, head[1] - headR * .55, head[2] - .06 + Math.sin(a) * headR * .8],
        [.09, .22, .09], [Math.cos(a) * .9, -a, Math.sin(a) * .9]));
    }
  }
  if (f.has('bulb')) {
    g.add(part(SPHERE, mat(shade(accentHex, .05)), [0, height * .74, -.16], [.28, .26, .28]));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + .4;
      g.add(part(CONE, accent, [Math.cos(a) * .2, height * .84, -.16 + Math.sin(a) * .2], [.14, .3, .05],
        [Math.cos(a) * .8, -a, Math.sin(a) * .8]));
    }
  }
  // Décalée sur le côté, la queue reste visible de face — comme sur les sprites d'origine.
  const tailSide = .18;
  if (f.has('flame')) {
    const anchor: [number, number, number] = f.has('tail')
      ? [tail[0] + tailSide * 1.5, tail[1] + .34, tail[2] - .3]
      : [0, height * .95, -.18];
    const flame = new THREE.Group();
    flame.add(part(CONE, new THREE.MeshBasicMaterial({ color: 0xff7a2a }), [0, 0, 0], [.19, .38, .19]));
    flame.add(part(CONE, new THREE.MeshBasicMaterial({ color: 0xffc94a }), [0, -.05, 0], [.12, .26, .12]));
    flame.add(part(CONE, new THREE.MeshBasicMaterial({ color: 0xfff2b0 }), [0, -.1, 0], [.06, .14, .06]));
    flame.position.set(...anchor);
    g.add(flame); limbs.push(flame);
  }
  if (f.has('tail')) {
    const t = new THREE.Group();
    t.add(part(CAPSULE, body, [0, 0, 0], [.075, .16, .075], [1.15, 0, 0]));
    t.add(part(CONE, accent, [0, .16, -.32], [.11, .26, .11], [-1.15, 0, 0]));
    t.position.set(tail[0] + tailSide, tail[1], tail[2]);
    t.rotation.y = -.35;
    t.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
    g.add(t); limbs.push(t);
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
      g.add(part(CONE, accent, [head[0], head[1] + headR * (.9 + i * .1), head[2] - .04 - i * .1], [.065, .24 - i * .04, .035], [-.55, 0, 0]));
  }
  if (f.has('claws')) {
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++)
      g.add(part(CONE, mat(0xf4f6fa), [s * (.34 + i * .045), height * .22, .18 - i * .085], [.028, .1, .028], [-1.25, 0, 0]));
  }
  if (f.has('shell')) {
    g.add(part(SPHERE, mat(shade(accentHex, -.14)), [0, height * .52, -.13], [.46, .36, .42]));
    for (let i = 0; i < 3; i++)
      g.add(part(TORUS, mat(shade(accentHex, -.26)), [0, height * .52, -.13], [.3 + i * .07, .3 + i * .07, .3], [1.35, 0, 0]));
  }
  if (f.has('aura')) {
    const aura = part(TORUS, new THREE.MeshBasicMaterial({ color: shade(accentHex, .34), transparent: true, opacity: .45 }),
      [0, height * .6, 0], [.62, .62, .62], [Math.PI / 2.2, 0, 0]);
    aura.castShadow = false;
    g.add(aura); limbs.push(aura);
  }
  /* ---- motifs ---- */
  const torsoY = height * .46;
  const torsoR = .4;
  if (f.has('bands')) {
    const m = mat(shade(accentHex, -.05));
    for (let i = 0; i < 3; i++)
      g.add(part(BOX, m, [0, torsoY + (i - 1) * .17, -.06], [torsoR * 1.62, .07, torsoR * 1.5]));
  }
  if (f.has('dots')) {
    const m = mat(shade(accentHex, -.02));
    for (let i = 0; i < 7; i++) {
      const a = rng.next() * Math.PI * 2;
      const u = rng.next() * 2 - 1;
      const r = torsoR * 1.02;
      g.add(part(SPHERE_LO, m,
        [Math.cos(a) * r * Math.sqrt(1 - u * u), torsoY + u * torsoR * .8, Math.sin(a) * r * Math.sqrt(1 - u * u)],
        [.07, .045, .07]));
    }
  }
  if (f.has('mask')) {
    g.add(part(BOX, mat(shade(accentHex, -.12)),
      [head[0], head[1] + headR * .12, head[2] + headR * .58], [headR * 1.5, headR * .5, headR * .5]));
  }
  if (f.has('rings')) {
    const m = mat(shade(accentHex, .16));
    for (const s of [-1, 1]) {
      g.add(part(TORUS, m, [s * .2, height * .22, 0], [.13, .13, .13], [Math.PI / 2, 0, 0]));
      g.add(part(TORUS, m, [s * .38, torsoY, 0], [.11, .11, .11], [0, 0, Math.PI / 2]));
    }
    g.add(part(TORUS, m, [head[0], head[1] + headR * .55, head[2]], [.16, .16, .16], [Math.PI / 2, 0, 0]));
  }

  if (sp.legend) {
    const halo = part(TORUS, new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: .6 }),
      [0, height * 1.04, 0], [.44, .44, .44], [Math.PI / 2, 0, 0]);
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

  const wide = 1 + bulk * .3 - agility * .12;
  const tall = 1 - bulk * .08 + agility * .16;
  g.scale.set(sp.scale * wide, sp.scale * tall, sp.scale * wide);
  return { group: g, bob, limbs, height: height * sp.scale * tall };
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
