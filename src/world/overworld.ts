import * as THREE from 'three';
import { T, WALKABLE, type Ent, type GameMap } from './mapgen';
import { animateRig, buildHuman, type CreatureRig } from '../creature/model';
import { RNG, hashStr } from '../engine/rng';
import { addLights, addSky, disposeObject, disposeScene, toonGradient, uTime, windify, type SceneLights } from '../engine/renderer';

export const DIRV: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]]; // S, O, N, E

type PropKind = 'tree' | 'rock' | 'cactus' | 'snowtree' | 'crystal';

interface Palette {
  ground: number; ground2: number; path: number; water: number; waterDeep: number;
  prop: PropKind; propColor: number; propColor2: number; trunk: number; grass: number; grass2: number;
  skyTop: number; skyMid: number; skyLow: number; fog: number; flower: number[];
  light?: number; clouds?: boolean;
}

const PAL: Record<string, Palette> = {
  plaine: {
    ground: 0x63ad55, ground2: 0x4f9a48, path: 0xcdb489, water: 0x3f95d8, waterDeep: 0x1f5f9e,
    prop: 'tree', propColor: 0x2f8140, propColor2: 0x3f9a4c, trunk: 0x6d4b30, grass: 0x6cc255, grass2: 0x86d067,
    skyTop: 0x3f8fd8, skyMid: 0x9ed6ff, skyLow: 0xd8f0ff, fog: 0xc4e4f7, flower: [0xff7ba0, 0xffd166, 0xa88fff], clouds: true,
  },
  foret: {
    ground: 0x3f8f47, ground2: 0x347b3d, path: 0xab9563, water: 0x387fb8, waterDeep: 0x1e5480,
    prop: 'tree', propColor: 0x1f6234, propColor2: 0x2b7a3e, trunk: 0x543a20, grass: 0x59a94b, grass2: 0x6fbc5c,
    skyTop: 0x4a92c8, skyMid: 0x9ccbe8, skyLow: 0xd6ecdc, fog: 0xa8cebb, flower: [0xffe083, 0xff9ecb, 0xc0ff8f], clouds: true,
  },
  montagne: {
    ground: 0x8d947c, ground2: 0x7c8570, path: 0xb7ab8f, water: 0x4d95c6, waterDeep: 0x27618f,
    prop: 'rock', propColor: 0x7b7c72, propColor2: 0x8b8c82, trunk: 0x55564f, grass: 0x6d8a55, grass2: 0x7c9a60,
    skyTop: 0x5b9bd0, skyMid: 0xaacce4, skyLow: 0xe0eaf2, fog: 0xc6d2dc, flower: [0xffd9a0, 0xdedede, 0xffb3b3], clouds: true,
  },
  plage: {
    ground: 0xe6d7a6, ground2: 0xd9c894, path: 0xdcc98f, water: 0x2fa6de, waterDeep: 0x1372a8,
    prop: 'tree', propColor: 0x3f9a55, propColor2: 0x4fae62, trunk: 0x8d6c40, grass: 0xa8d472, grass2: 0xb8de83,
    skyTop: 0x3fa5e8, skyMid: 0x9fe0ff, skyLow: 0xe4f8ff, fog: 0xd4eef8, flower: [0xffd166, 0xff9f6e, 0xfff0a0], clouds: true,
  },
  desert: {
    ground: 0xe4c67e, ground2: 0xd7b76e, path: 0xcdab63, water: 0x43a6cc, waterDeep: 0x1f7396,
    prop: 'cactus', propColor: 0x4f8f4a, propColor2: 0x5c9d55, trunk: 0x9a7a45, grass: 0xbca85e, grass2: 0xc7b46a,
    skyTop: 0x7fb6e0, skyMid: 0xffdda8, skyLow: 0xffeccd, fog: 0xf0d7a6, flower: [0xff8f5e, 0xffe0a0, 0xd8a0ff], clouds: true,
  },
  neige: {
    ground: 0xeaf1f9, ground2: 0xdde7f2, path: 0xccd8e6, water: 0x74bce2, waterDeep: 0x3d87b8,
    prop: 'snowtree', propColor: 0x27563f, propColor2: 0x2f6449, trunk: 0x4a5a6a, grass: 0xc2d4e2, grass2: 0xd0dfeb,
    skyTop: 0x7fa8cc, skyMid: 0xd2e6f8, skyLow: 0xf2f8ff, fog: 0xe6f0fa, flower: [0xa0d8ff, 0xffffff, 0xcfe8ff], clouds: true,
  },
  sommet: {
    ground: 0xe9f0f8, ground2: 0xd8e3ef, path: 0xc7d4e2, water: 0x74bce2, waterDeep: 0x3d87b8,
    prop: 'rock', propColor: 0x8b96a6, propColor2: 0x99a3b2, trunk: 0x4a5a6a, grass: 0xc0d2e0, grass2: 0xcedde9,
    skyTop: 0x2f5f96, skyMid: 0x9dc4e8, skyLow: 0xe8f2fb, fog: 0xdae8f5, flower: [0xa0d8ff, 0xffffff, 0xcfe8ff], clouds: true,
  },
  volcan: {
    ground: 0x6f4c44, ground2: 0x5d4039, path: 0x3f2e2c, water: 0xff6a2a, waterDeep: 0xc23c10,
    prop: 'rock', propColor: 0x4a3532, propColor2: 0x59403c, trunk: 0x2f2220, grass: 0x8a4a35, grass2: 0x9a5a40,
    skyTop: 0x7a3a4a, skyMid: 0xe07a52, skyLow: 0xffc79a, fog: 0xd08a62, flower: [0xff6a3a, 0xffc04a, 0xff9060],
  },
  marais: {
    ground: 0x536f4d, ground2: 0x466040, path: 0x7d7452, water: 0x3f5a4a, waterDeep: 0x263a30,
    prop: 'tree', propColor: 0x3a5a3a, propColor2: 0x466846, trunk: 0x3f3226, grass: 0x6d9455, grass2: 0x7fa462,
    skyTop: 0x5f7a76, skyMid: 0x93aaa2, skyLow: 0xc4d2c8, fog: 0x8ba396, flower: [0xa0ff8f, 0xd0c060, 0x9f8fff],
  },
  ville: {
    ground: 0x79ab60, ground2: 0x679a53, path: 0xd3c6ac, water: 0x3f95d8, waterDeep: 0x1f5f9e,
    prop: 'tree', propColor: 0x2f8140, propColor2: 0x3f9a4c, trunk: 0x6d4b30, grass: 0x6ec257, grass2: 0x83d16a,
    skyTop: 0x3f8fd8, skyMid: 0x9ed6ff, skyLow: 0xdcf1ff, fog: 0xcae5f6, flower: [0xff7ba0, 0xffd166, 0xa88fff], clouds: true,
  },
  grotte: {
    ground: 0x6b6a7a, ground2: 0x5e5c6d, path: 0x7a7889, water: 0x3f5f8f, waterDeep: 0x243f66,
    prop: 'crystal', propColor: 0x6f6c88, propColor2: 0x847fa4, trunk: 0x3a3945, grass: 0x5c6f63, grass2: 0x69806f,
    skyTop: 0x0f1119, skyMid: 0x161a26, skyLow: 0x252c3d, fog: 0x2b3040, flower: [0x8fd0ff, 0xb0a0ff, 0x70e0c0], light: 0xbccbe0,
  },
  interieur: {
    ground: 0xd8ae84, ground2: 0xc79a70, path: 0xc39a6f, water: 0x3d8fd4, waterDeep: 0x1f5f9e,
    prop: 'rock', propColor: 0x8b6b52, propColor2: 0x9a7a60, trunk: 0x6b4a2f, grass: 0x7a9a5a, grass2: 0x86a565,
    skyTop: 0x1d2130, skyMid: 0x232838, skyLow: 0x2b3142, fog: 0x232838, flower: [0xffd166, 0xff9ecb, 0xa0d8ff], light: 0xffeccf,
  },
};

export interface OverworldHooks {
  onExit(to: string, ent: Ent): void;
  onDoor(to: string): void;
  onInteract(ent: Ent): void;
  onEncounterTile(): void;
  onTrainerSight(ent: Ent & { kind: 'trainer' }): void;
  onStep(): void;
}

interface ActorView { ent: Ent; rig: CreatureRig }

/* Bruit de valeur lissé, déterministe : relief doux du terrain. */
function valueNoise(x: number, y: number, seed: number): number {
  const h = (a: number, b: number) => {
    let n = Math.imul(a * 374761393 + b * 668265263 + seed, 1274126177);
    n = (n ^ (n >>> 13)) >>> 0;
    return n / 4294967296;
  };
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(xf), v = s(yf);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export class Overworld {
  scene = new THREE.Scene();
  map!: GameMap;
  px = 0; py = 0;
  facing = 0;
  private moving = false;
  private moveT = 0;
  private moveDur = .21;
  private fromX = 0; private fromY = 0; private toX = 0; private toY = 0;
  private player!: CreatureRig;
  private actors: ActorView[] = [];
  private removed = new Set<string>();
  private beaten = new Set<string>();
  private clouds: THREE.Object3D | null = null;
  private lights: SceneLights | null = null;
  private clock = 0;
  private camTarget = new THREE.Vector3();
  paused = false;
  loaded = false;
  shadows = true;
  hooks: OverworldHooks;

  constructor(hooks: OverworldHooks) {
    this.hooks = hooks;
  }

  get busy() { return this.moving; }

  /** Reconstruit entièrement la scène pour une carte. */
  load(map: GameMap, spawn: [number, number], facing = 0, hidden: Set<string> = new Set(), beaten: Set<string> = new Set()) {
    disposeScene(this.scene);
    this.map = map;
    this.loaded = true;
    this.removed = hidden;
    this.beaten = beaten;
    this.scene = new THREE.Scene();
    this.clouds = null;
    const pal = PAL[map.biome] ?? PAL.plaine;
    this.scene.fog = new THREE.Fog(map.indoor ? pal.fog : pal.skyLow, map.indoor ? 24 : 22, map.indoor ? 58 : 46);
    addSky(this.scene, pal.skyTop, pal.skyMid, pal.skyLow, map.indoor ? 0.1 : 0.5);
    this.lights = addLights(this.scene, pal.light ?? pal.skyMid, pal.ground, map.indoor ? 0xffeacb : 0xfff6e0, this.shadows);

    this.buildTerrain(map, pal);
    this.buildProps(map, pal);
    if (!map.indoor) this.buildHorizon(map, pal);
    if (pal.clouds && !map.indoor) this.buildClouds(map, pal);
    this.buildActors(map);

    this.player = buildHuman(0x2a7fd4, 0xf2c9a0, 0x2b1d16, 0xe8434e);
    this.scene.add(this.player.group);
    this.px = spawn[0]; this.py = spawn[1];
    this.facing = facing;
    this.moving = false;
    this.syncPlayer();
    this.camTarget.set(this.px, 0, this.py);
  }

  /* ---------------- terrain ---------------- */
  private tileColor(t: number, pal: Palette, jitter: number, patch = .5, checker = 0, accent?: number): THREE.Color {
    let base: number;
    switch (t) {
      case T.CHEMIN: case T.SORTIE: base = pal.path; break;
      case T.SABLE: base = pal.ground2; break;
      case T.EAU: base = new THREE.Color(pal.waterDeep).multiplyScalar(.55).getHex(); break;
      case T.HERBE: base = pal.grass; break;
      case T.TAPIS: {
        // Damier d'intérieur, teinté par la couleur de l'Arène / du bâtiment.
        const a = new THREE.Color(checker ? pal.ground : pal.ground2);
        if (accent !== undefined) a.lerp(new THREE.Color(accent), checker ? .22 : .07);
        return a.multiplyScalar(1 + (jitter - .5) * .05);
      }
      case T.FLEUR: base = pal.ground2; break;
      default: base = -1;
    }
    // Les zones ouvertes fondent deux verts via un bruit doux : moins « damier ».
    const c = base < 0
      ? new THREE.Color(pal.ground).lerp(new THREE.Color(pal.ground2), patch)
      : new THREE.Color(base);
    c.multiplyScalar(1 + (jitter - .5) * .07);
    return c;
  }

  private buildTerrain(map: GameMap, pal: Palette) {
    const rng = new RNG(hashStr(map.id) + 5);
    const seed = hashStr(map.id) & 0xffff;
    const W = map.w, H = map.h;
    const tile = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? T.OBSTACLE : map.tiles[y * W + x]);
    const isFlat = (t: number) => t === T.CHEMIN || t === T.SORTIE || t === T.MUR || t === T.PORTE || t === T.COMPTOIR || t === T.TAPIS || t === T.EAU;

    /* --- champ de hauteur aux coins, partagé entre tuiles voisines --- */
    const amp = map.indoor ? 0 : map.biome === 'sommet' || map.biome === 'montagne' ? .5 : .34;
    const CW = W + 1;
    const corner = new Float32Array(CW * (H + 1));
    for (let cy = 0; cy <= H; cy++) {
      for (let cx = 0; cx <= W; cx++) {
        let flat = false;
        for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
          const t = tile(cx + dx, cy + dy);
          if (isFlat(t)) { flat = true; break; }
        }
        if (flat || amp === 0) { corner[cy * CW + cx] = 0; continue; }
        const n = valueNoise(cx * .28, cy * .28, seed) * .7 + valueNoise(cx * .09, cy * .09, seed + 7) * .3;
        corner[cy * CW + cx] = n * amp;   // toujours ≥ 0 : le sol ne passe jamais sous le remplissage
      }
    }

    /* --- occlusion douce près des obstacles --- */
    const ao = (x: number, y: number) => {
      let n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const t = tile(x + i, y + j);
        if (t === T.OBSTACLE || t === T.MUR) n++;
      }
      return 1 - Math.min(n, 5) * .052;
    };

    /* --- couleur par tuile ; lissage aux coins UNIQUEMENT entre surfaces de même famille,
           pour garder des chemins et des rives nets tout en fondant les nuances d'herbe --- */
    const famille = (t: number) => (t === T.CHEMIN || t === T.SORTIE ? 0 : t === T.EAU ? 1 : t === T.HERBE ? 3 : 2);
    const tileCol: THREE.Color[] = new Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const patch = valueNoise(x * .16, y * .16, seed + 31);
      tileCol[y * W + x] = this.tileColor(map.tiles[y * W + x], pal, rng.next(), patch, (x + y) & 1, map.accent).multiplyScalar(ao(x, y));
    }
    const blended = (x: number, y: number, cx: number, cy: number, out: THREE.Color) => {
      const here = tile(x, y);
      // Le damier des intérieurs ne doit pas être lissé, sinon il disparaît.
      if (here === T.TAPIS) return out.copy(tileCol[y * W + x]);
      const fam = famille(here);
      let r = 0, g = 0, b = 0, k = 0;
      for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
        const tx = x + cx + dx, ty = y + cy + dy;
        if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
        if (famille(map.tiles[ty * W + tx]) !== fam) continue;
        const c = tileCol[ty * W + tx];
        r += c.r; g += c.g; b += c.b; k++;
      }
      if (!k) out.copy(tileCol[y * W + x]);
      else out.setRGB(r / k, g / k, b / k);
      return out;
    };

    const n = W * H;
    const pos = new Float32Array(n * 4 * 3);
    const col = new Float32Array(n * 4 * 3);
    const idx = new Uint32Array(n * 6);
    let v = 0, f = 0;
    const tmpCol = new THREE.Color();
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = map.tiles[y * W + x];
        // Seule l'eau descend : décaler les chemins créerait une fissure visible avec leurs voisins.
        const flatY = t === T.EAU ? -.86 : null;   // lit du plan d'eau, bien en dessous
        const base = v * 3;
        corners.forEach(([cx, cy], i) => {
          const co = ((y + cy) * CW + (x + cx));
          pos[base + i * 3] = x - .5 + cx;
          pos[base + i * 3 + 1] = flatY ?? corner[co];
          pos[base + i * 3 + 2] = y - .5 + cy;
          blended(x, y, cx, cy, tmpCol);
          col[base + i * 3] = tmpCol.r; col[base + i * 3 + 1] = tmpCol.g; col[base + i * 3 + 2] = tmpCol.b;
        });
        idx[f] = v; idx[f + 1] = v + 2; idx[f + 2] = v + 1;
        idx[f + 3] = v; idx[f + 4] = v + 3; idx[f + 5] = v + 2;
        v += 4; f += 6;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() }));
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Terrain de remplissage au-delà des bords, affleurant le sol.
    const pad = map.biome === 'interieur' ? 8 : 60;
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(W + pad, 4, H + pad),
      new THREE.MeshToonMaterial({
        // Autour d'un intérieur : un aplat sombre neutre qui se confond avec le vide.
        color: map.biome === 'interieur'
          ? new THREE.Color(pal.fog).multiplyScalar(.8)
          : new THREE.Color(pal.ground).multiplyScalar(.86),
        gradientMap: toonGradient(),
      }),
    );
    skirt.position.set(W / 2 - .5, -2.03, H / 2 - .5);
    skirt.receiveShadow = true;
    this.scene.add(skirt);
  }

  /* ---------------- décors ---------------- */
  private buildProps(map: GameMap, pal: Palette) {
    const rng = new RNG(hashStr(map.id) + 77);
    const tiles: Record<number, [number, number][]> = {};
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tiles[y * map.w + x];
      (tiles[t] ??= []).push([x, y]);
    }
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    const inst = (geo: THREE.BufferGeometry, m: THREE.Material, count: number, shadow = true) => {
      const im = new THREE.InstancedMesh(geo, m, count);
      im.castShadow = shadow;
      im.receiveShadow = shadow;
      this.scene.add(im);
      return im;
    };
    // Les géométries polyédriques (dodécaèdre, cône) sont déjà facettées : pas besoin de flatShading.
    const toon = (c: number, o: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient(), ...o });
    const vary = (im: THREE.InstancedMesh, i: number, a: number, b: number, k: number) => {
      tint.setHex(a).lerp(new THREE.Color(b), k);
      im.setColorAt(i, tint);
    };

    /* -- obstacles -- */
    const obs = tiles[T.OBSTACLE] ?? [];
    if (obs.length) {
      if (pal.prop === 'crystal') {
        // Parois de grotte : colonnes rocheuses hautes qui referment le cadre,
        // avec quelques cristaux lumineux plantés dedans.
        const col = inst(new THREE.DodecahedronGeometry(.72, 0), toon(0xffffff), obs.length);
        const heights: number[] = [];
        obs.forEach(([x, y], i) => {
          const h = 2.4 + rng.next() * 1.8;
          heights.push(h);
          dummy.position.set(x, h * .42, y);
          dummy.rotation.set((rng.next() - .5) * .3, rng.next() * 6, (rng.next() - .5) * .3);
          dummy.scale.set(.8 + rng.next() * .35, h * .55, .8 + rng.next() * .35);
          dummy.updateMatrix(); col.setMatrixAt(i, dummy.matrix);
          vary(col, i, pal.propColor, pal.propColor2, rng.next());
        });
        col.instanceMatrix.needsUpdate = true;
        if (col.instanceColor) col.instanceColor.needsUpdate = true;

        const gems = obs.filter(() => rng.next() < .45);
        if (gems.length) {
          const cr = inst(new THREE.ConeGeometry(.3, 1.15, 5), toon(pal.propColor2), gems.length);
          const glow = inst(new THREE.OctahedronGeometry(.17, 0),
            new THREE.MeshBasicMaterial({ color: 0xbfe4ff, transparent: true, opacity: .8 }), gems.length, false);
          gems.forEach(([x, y], i) => {
            const base = .5 + rng.next() * 1.4;
            dummy.position.set(x + (rng.next() - .5) * .5, base, y + (rng.next() - .5) * .5);
            dummy.rotation.set((rng.next() - .5) * .5, rng.next() * 6, (rng.next() - .5) * .5);
            const s = .7 + rng.next() * .7;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix(); cr.setMatrixAt(i, dummy.matrix);
            dummy.position.set(dummy.position.x, base + .48 * s, dummy.position.z);
            dummy.rotation.set(0, rng.next() * 6, 0);
            dummy.scale.setScalar(s * .9);
            dummy.updateMatrix(); glow.setMatrixAt(i, dummy.matrix);
          });
          cr.instanceMatrix.needsUpdate = true;
          glow.instanceMatrix.needsUpdate = true;
        }
      } else if (pal.prop === 'rock') {
        const im = inst(new THREE.DodecahedronGeometry(.62, 0), toon(0xffffff), obs.length);
        obs.forEach(([x, y], i) => {
          dummy.position.set(x, .28 + rng.next() * .22, y);
          dummy.rotation.set(rng.next(), rng.next() * 6, rng.next());
          const s = .82 + rng.next() * .55;
          dummy.scale.set(s, s * .92, s);
          dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
          vary(im, i, pal.propColor, pal.propColor2, rng.next());
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      } else if (pal.prop === 'cactus') {
        const im = inst(new THREE.CapsuleGeometry(.24, 1.1, 4, 10), toon(0xffffff), obs.length);
        const arms = inst(new THREE.CapsuleGeometry(.14, .5, 4, 8), toon(pal.propColor), obs.length * 2);
        obs.forEach(([x, y], i) => {
          dummy.position.set(x, .84, y); dummy.rotation.set(0, rng.next() * 6, 0);
          const s = .85 + rng.next() * .45; dummy.scale.set(1, s, 1);
          dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
          vary(im, i, pal.propColor, pal.propColor2, rng.next());
          for (let k = 0; k < 2; k++) {
            const sx = k ? 1 : -1;
            dummy.position.set(x + sx * .3, .95 + rng.next() * .2, y);
            dummy.rotation.set(0, 0, sx * .9); dummy.scale.setScalar(.85);
            dummy.updateMatrix(); arms.setMatrixAt(i * 2 + k, dummy.matrix);
          }
        });
        im.instanceMatrix.needsUpdate = true; arms.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
      } else {
        const snowy = pal.prop === 'snowtree';
        const trunkMat = toon(pal.trunk);
        const crownMat = toon(0xffffff);
        windify(crownMat, .035, 1.1);
        const trunk = inst(new THREE.CylinderGeometry(.11, .18, 1.1, 7), trunkMat, obs.length);
        const crown = inst(new THREE.ConeGeometry(.66, 1.15, 8), crownMat, obs.length * 3);
        const snow = snowy ? inst(new THREE.ConeGeometry(.5, .55, 8), toon(0xf2f8ff), obs.length * 2) : null;
        obs.forEach(([x, y], i) => {
          const s = .82 + rng.next() * .5;
          const lean = (rng.next() - .5) * .09;
          dummy.position.set(x, .5 * s, y); dummy.scale.set(s, s, s); dummy.rotation.set(lean, rng.next() * 6, lean);
          dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
          for (let k = 0; k < 3; k++) {
            const ks = s * (1 - k * .22);
            dummy.position.set(x, (1.0 + k * .52) * s, y);
            dummy.scale.set(ks, ks * (1 - k * .1), ks);
            dummy.rotation.set(lean, rng.next() * 6, lean);
            dummy.updateMatrix(); crown.setMatrixAt(i * 3 + k, dummy.matrix);
            vary(crown, i * 3 + k, pal.propColor, pal.propColor2, rng.next() * .7 + k * .1);
          }
          if (snow) for (let k = 0; k < 2; k++) {
            const ks = s * (1 - k * .25);
            dummy.position.set(x, (1.25 + k * .52) * s, y);
            dummy.scale.set(ks, ks * .7, ks); dummy.rotation.set(lean, rng.next() * 6, lean);
            dummy.updateMatrix(); snow.setMatrixAt(i * 2 + k, dummy.matrix);
          }
        });
        trunk.instanceMatrix.needsUpdate = true;
        crown.instanceMatrix.needsUpdate = true;
        if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
        if (snow) snow.instanceMatrix.needsUpdate = true;
      }
    }

    /* -- herbes hautes -- */
    const gr = tiles[T.HERBE] ?? [];
    if (gr.length) {
      const bladeMat = toon(0xffffff);
      windify(bladeMat, .07, 1.9);
      const blade = new THREE.ConeGeometry(.075, .66, 3);
      blade.translate(0, .33, 0);
      const im = inst(blade, bladeMat, gr.length * 7, false);
      im.receiveShadow = true;
      gr.forEach(([x, y], i) => {
        for (let k = 0; k < 7; k++) {
          dummy.position.set(x + (rng.next() - .5) * .9, 0, y + (rng.next() - .5) * .9);
          dummy.rotation.set((rng.next() - .5) * .55, rng.next() * 6, (rng.next() - .5) * .55);
          const s = .8 + rng.next() * .7;
          dummy.scale.set(s, s * (.75 + rng.next() * .8), s);
          dummy.updateMatrix(); im.setMatrixAt(i * 7 + k, dummy.matrix);
          vary(im, i * 7 + k, pal.grass, pal.grass2, rng.next());
        }
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }

    /* -- fleurs (tige + corolle) -- */
    const fl = tiles[T.FLEUR] ?? [];
    if (fl.length) {
      const stemMat = toon(pal.grass);
      windify(stemMat, .05, 1.7);
      const stem = new THREE.CylinderGeometry(.02, .03, .34, 5);
      stem.translate(0, .17, 0);
      const stems = inst(stem, stemMat, fl.length * 3, false);
      pal.flower.forEach((cHex, ci) => {
        const sub = fl.filter((_, i) => i % pal.flower.length === ci);
        if (!sub.length) return;
        const headMat = toon(cHex);
        windify(headMat, .05, 1.7);
        const head = inst(new THREE.SphereGeometry(.1, 7, 6), headMat, sub.length * 3, false);
        sub.forEach(([x, y], i) => {
          for (let k = 0; k < 3; k++) {
            const ox = (rng.next() - .5) * .7, oz = (rng.next() - .5) * .7;
            dummy.position.set(x + ox, .34, y + oz); dummy.rotation.set(0, 0, 0);
            dummy.scale.setScalar(.8 + rng.next() * .5);
            dummy.updateMatrix(); head.setMatrixAt(i * 3 + k, dummy.matrix);
          }
        });
        head.instanceMatrix.needsUpdate = true;
      });
      fl.forEach(([x, y], i) => {
        for (let k = 0; k < 3; k++) {
          dummy.position.set(x + (rng.next() - .5) * .7, 0, y + (rng.next() - .5) * .7);
          dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(1);
          dummy.updateMatrix(); stems.setMatrixAt(i * 3 + k, dummy.matrix);
        }
      });
      stems.instanceMatrix.needsUpdate = true;
    }

    /* -- cailloux décoratifs -- */
    if (!map.indoor) {
      const open = (tiles[T.SOL] ?? []).concat(tiles[T.SABLE] ?? []);
      const count = Math.min(90, Math.floor(open.length * .06));
      if (count > 0) {
        const im = inst(new THREE.DodecahedronGeometry(.13, 0), toon(pal.propColor2), count);
        for (let i = 0; i < count; i++) {
          const [x, y] = open[rng.int(open.length)];
          dummy.position.set(x + (rng.next() - .5) * .7, .07, y + (rng.next() - .5) * .7);
          dummy.rotation.set(rng.next() * 6, rng.next() * 6, rng.next() * 6);
          dummy.scale.setScalar(.6 + rng.next() * .9);
          dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        }
        im.instanceMatrix.needsUpdate = true;
      }
    }

    /* -- eau animée -- */
    const wa = tiles[T.EAU] ?? [];
    if (wa.length) {
      const waterMat = new THREE.MeshToonMaterial({
        color: 0xffffff, gradientMap: toonGradient(), transparent: true, opacity: .92,
      });
      waterMat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = uTime;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            {
              #ifdef USE_INSTANCING
                vec3 wp = instanceMatrix[3].xyz;
              #else
                vec3 wp = vec3(0.0);
              #endif
              if (transformed.y > 0.0) {
                transformed.y += sin(uTime * 1.7 + wp.x * 1.5 + wp.z * 1.1) * 0.055
                              + sin(uTime * 2.4 + wp.x * 0.7 - wp.z * 1.8) * 0.035;
              }
            }`);
      };
      const im = inst(new THREE.BoxGeometry(1, .86, 1, 2, 1, 2), waterMat, wa.length, false);
      im.receiveShadow = true;
      const deep = new THREE.Color(pal.waterDeep);
      const shallow = new THREE.Color(pal.water).lerp(new THREE.Color(0xffffff), .3);
      const at = (x: number, y: number) => (x < 0 || y < 0 || x >= map.w || y >= map.h ? T.OBSTACLE : map.tiles[y * map.w + x]);
      // Profondeur = distance à la rive sur 2 anneaux : dégradé doux plutôt qu'un damier.
      const depth = (x: number, y: number) => {
        for (let r = 1; r <= 2; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
            if (at(x + dx, y + dy) !== T.EAU) return (r - 1) / 2;
          }
        }
        return 1;
      };
      wa.forEach(([x, y], i) => {
        dummy.position.set(x, -.44, y); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        // Hauts-fonds plus clairs au bord : une teinte suffit, pas besoin d'écume géométrique.
        tint.copy(shallow).lerp(deep, depth(x, y)).lerp(new THREE.Color(pal.water), .35);
        im.setColorAt(i, tint);
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }

    /* -- murs / bâtiments -- */
    const mur = tiles[T.MUR] ?? [];
    if (mur.length) {
      const wallCol = map.indoor ? 0xb9c3d4 : 0xe2d6bf;
      const im = inst(new THREE.BoxGeometry(1, 2.2, 1), toon(wallCol), mur.length);
      const roof = inst(new THREE.BoxGeometry(1.1, .42, 1.1), toon(map.indoor ? (map.accent ?? 0x6b5240) : 0xc4564e), mur.length);
      const trim = inst(new THREE.BoxGeometry(1.14, .12, 1.14), toon(map.indoor ? 0x7f8ba0 : 0x9c3f3a), mur.length);
      const plinth = map.indoor ? inst(new THREE.BoxGeometry(1.04, .28, 1.04), toon(0x8a94a8), mur.length) : null;
      // Façades sud : on pose une fenêtre sur les murs qui donnent sur l'extérieur.
      const front = map.indoor ? [] : mur.filter(([x, y]) => y + 1 < map.h && map.tiles[(y + 1) * map.w + x] !== T.MUR);
      const win = front.length ? inst(new THREE.BoxGeometry(.54, .52, .12), toon(0x9fd8ff, { emissive: 0x2a4f70 }), front.length, false) : null;
      const sill = front.length ? inst(new THREE.BoxGeometry(.66, .08, .16), toon(0xf2ead8), front.length, false) : null;
      mur.forEach(([x, y], i) => {
        dummy.position.set(x, 1.1, y); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, 2.4, y);
        dummy.updateMatrix(); roof.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, 2.17, y);
        dummy.updateMatrix(); trim.setMatrixAt(i, dummy.matrix);
        if (plinth) { dummy.position.set(x, .14, y); dummy.updateMatrix(); plinth.setMatrixAt(i, dummy.matrix); }
      });
      front.forEach(([x, y], i) => {
        if (!win || !sill) return;
        dummy.position.set(x, 1.45, y + .5); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); win.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, 1.16, y + .52);
        dummy.updateMatrix(); sill.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      roof.instanceMatrix.needsUpdate = true;
      trim.instanceMatrix.needsUpdate = true;
      if (plinth) plinth.instanceMatrix.needsUpdate = true;
      if (win) win.instanceMatrix.needsUpdate = true;
      if (sill) sill.instanceMatrix.needsUpdate = true;
    }

    /* -- halos de plafonniers (intérieurs) -- */
    if (map.indoor && map.biome === 'interieur') {
      const pools = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xfff0cf, transparent: true, opacity: .12, depthWrite: false });
      for (let y = 3; y < map.h - 2; y += 5) {
        for (let x = 3; x < map.w - 2; x += 5) {
          if (map.tiles[y * map.w + x] !== T.TAPIS) continue;
          const disc = new THREE.Mesh(new THREE.CircleGeometry(2.1, 20), mat);
          disc.rotation.x = -Math.PI / 2;
          disc.position.set(x, .012, y);
          pools.add(disc);
        }
      }
      if (pools.children.length) this.scene.add(pools);
    }

    /* -- comptoirs -- */
    const cpt = tiles[T.COMPTOIR] ?? [];
    if (cpt.length) {
      const im = inst(new THREE.BoxGeometry(1, .92, 1), toon(0xd9b573), cpt.length);
      const top = inst(new THREE.BoxGeometry(1.1, .1, 1.1), toon(0xf0e0bd), cpt.length);
      cpt.forEach(([x, y], i) => {
        dummy.position.set(x, .46, y); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, .96, y);
        dummy.updateMatrix(); top.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true; top.instanceMatrix.needsUpdate = true;
    }

    /* -- portes & sorties -- */
    for (const e of map.ents) {
      if (e.kind === 'door') {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2, .3), toon(0x5b3f2c));
        frame.position.set(e.x, 1, e.y - .45);
        frame.castShadow = true; frame.receiveShadow = true;
        this.scene.add(frame);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(.82, 1.55, .12), toon(0xf0d9a0));
        panel.position.set(e.x, .82, e.y - .29);
        this.scene.add(panel);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), toon(0xf5c542));
        knob.position.set(e.x + .28, .82, e.y - .22);
        this.scene.add(knob);
        const awning = new THREE.Mesh(new THREE.BoxGeometry(1.6, .18, .78), toon(0x2a7fd4));
        awning.position.set(e.x, 2.0, e.y - .16);
        awning.castShadow = true;
        this.scene.add(awning);
        for (const s of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.9, 6), toon(0x8f7b5e));
          post.position.set(e.x + s * .72, 1.05, e.y - .1);
          post.castShadow = true;
          this.scene.add(post);
        }
      }
      if (e.kind === 'exit' && !map.indoor) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(.62, .1, 8, 16, Math.PI), toon(0xf2e8cd));
        arch.position.set(e.x, .04, e.y);
        arch.rotation.set(0, e.dir === 'e' || e.dir === 'w' ? Math.PI / 2 : 0, 0);
        arch.castShadow = true;
        this.scene.add(arch);
      }
    }
  }

  /** Chaîne de montagnes lointaine : donne un horizon au lieu d'un aplat brumeux. */
  private buildHorizon(map: GameMap, pal: Palette) {
    const rng = new RNG(hashStr(map.id) + 909);
    const cx = map.w / 2 - .5, cz = map.h / 2 - .5;
    const near = new THREE.Color(pal.ground).lerp(new THREE.Color(pal.skyLow), .55);
    const far = new THREE.Color(pal.ground).lerp(new THREE.Color(pal.skyLow), .78);
    const geo = new THREE.ConeGeometry(1, 1, 5);
    for (let ring = 0; ring < 2; ring++) {
      const radius = 52 + ring * 22;
      const mat = new THREE.MeshBasicMaterial({ color: ring ? far : near, fog: false });
      const count = 26 + ring * 8;
      const im = new THREE.InstancedMesh(geo, mat, count);
      const d = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rng.next() * .12;
        const r = radius + rng.next() * 12;
        const h = 9 + rng.next() * 13 - ring * 2;
        d.position.set(cx + Math.cos(a) * r, h / 2 - 2, cz + Math.sin(a) * r);
        d.rotation.set(0, rng.next() * 6, 0);
        d.scale.set(9 + rng.next() * 9, h, 9 + rng.next() * 9);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      im.renderOrder = -1;
      this.scene.add(im);
    }
  }

  private buildClouds(map: GameMap, pal: Palette) {
    const rng = new RNG(hashStr(map.id) + 4242);
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .78, fog: false });
    const puff = new THREE.SphereGeometry(1, 8, 6);
    puff.userData.shared = false;
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const n = 3 + rng.int(3);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(puff, mat);
        m.position.set((k - n / 2) * (1.4 + rng.next()), rng.next() * .8, (rng.next() - .5) * 2);
        const s = 1.6 + rng.next() * 1.7;
        m.scale.set(s, s * .55, s);
        cloud.add(m);
      }
      cloud.position.set(
        map.w / 2 + (rng.next() - .5) * 150,
        17 + rng.next() * 11,
        map.h / 2 - 20 - rng.next() * 90,
      );
      cloud.userData.speed = .35 + rng.next() * .5;
      g.add(cloud);
    }
    void pal;
    this.scene.add(g);
    this.clouds = g;
  }

  private buildActors(map: GameMap) {
    this.actors = [];
    const toon = (c: number, o: THREE.MeshToonMaterialParameters = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonGradient(), ...o });
    for (const e of map.ents) {
      if (this.removed.has(entKey(map, e))) continue;
      let rig: CreatureRig | null = null;
      switch (e.kind) {
        case 'npc': rig = buildHuman(e.color & 0xffffff); break;
        case 'trainer': rig = buildHuman(0xd94f4f, 0xe8bb92, 0x1f1a16); break;
        case 'leader': rig = buildHuman(0xffd166, 0xf2c9a0, 0x241a12, 0x2a7fd4); break;
        case 'boss': rig = buildHuman(0x2b2f3a, 0xe8c9a0, 0x151515, 0xb03a3a); break;
        case 'heal': rig = buildHuman(0xff8fb0, 0xf7d7bd, 0xff5c8a); break;
        case 'shop': rig = buildHuman(0x4fb0e0, 0xe8c9a0, 0x3a2a20); break;
        case 'item': {
          const ball = new THREE.Group();
          const top = new THREE.Mesh(new THREE.SphereGeometry(.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xe8434e));
          const bot = new THREE.Mesh(new THREE.SphereGeometry(.27, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0xf2f5fa));
          const belt = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .07, 14), toon(0x1b2130));
          const btn = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .09, 10), toon(0xf6f9ff));
          btn.rotation.x = Math.PI / 2; btn.position.z = .24;
          ball.add(top, bot, belt, btn);
          ball.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
          const halo = new THREE.Mesh(new THREE.RingGeometry(.34, .48, 18), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .35, side: THREE.DoubleSide }));
          halo.rotation.x = -Math.PI / 2; halo.position.y = -.3;
          ball.add(halo);
          ball.position.set(e.x, .38, e.y);
          this.scene.add(ball);
          this.actors.push({ ent: e, rig: { group: ball, bob: [ball], limbs: [], height: .5 } });
          continue;
        }
        case 'sign': {
          const post = new THREE.Group();
          const p1 = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .8, 6), toon(0x6b4a2f));
          p1.castShadow = true;
          post.add(p1);
          const board = new THREE.Mesh(new THREE.BoxGeometry(.9, .58, .11), toon(0xc9a97a));
          board.position.y = .62; board.castShadow = true;
          const frame = new THREE.Mesh(new THREE.BoxGeometry(1, .68, .07), toon(0x8b6b45));
          frame.position.y = .62; frame.position.z = -.03;
          post.add(frame, board);
          post.position.set(e.x, .4, e.y);
          this.scene.add(post);
          this.actors.push({ ent: e, rig: { group: post, bob: [], limbs: [], height: .9 } });
          continue;
        }
        case 'pc': {
          const pc = new THREE.Group();
          const box = new THREE.Mesh(new THREE.BoxGeometry(.85, 1.15, .62), toon(0x35507a));
          box.castShadow = true; pc.add(box);
          const screen = new THREE.Mesh(new THREE.BoxGeometry(.6, .45, .06), toon(0x7fe0ff, { emissive: 0x1d5f7a }));
          screen.position.set(0, .3, .33); pc.add(screen);
          pc.position.set(e.x, .58, e.y);
          this.scene.add(pc);
          this.actors.push({ ent: e, rig: { group: pc, bob: [], limbs: [], height: 1.15 } });
          continue;
        }
        default: rig = null;
      }
      if (!rig) continue;
      rig.group.position.set(e.x, 0, e.y);
      const face = 'face' in e ? (e as { face: number }).face : 2;
      rig.group.rotation.y = faceAngle(face);
      this.scene.add(rig.group);
      this.actors.push({ ent: e, rig });
    }
  }

  /* ---------------- requêtes ---------------- */
  tileAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return T.OBSTACLE;
    return this.map.tiles[y * this.map.w + x];
  }

  entAt(x: number, y: number): Ent | undefined {
    return this.actors.find((a) => a.ent.x === x && a.ent.y === y && a.ent.kind !== 'exit')?.ent;
  }

  private blocked(x: number, y: number): boolean {
    if (!WALKABLE.has(this.tileAt(x, y))) return true;
    const e = this.entAt(x, y);
    return !!e && e.kind !== 'exit';
  }

  removeEnt(key: string) {
    this.removed.add(key);
    const i = this.actors.findIndex((a) => entKey(this.map, a.ent) === key);
    if (i >= 0) { this.scene.remove(this.actors[i].rig.group); disposeObject(this.actors[i].rig.group); this.actors.splice(i, 1); }
  }

  markBeaten(ent: Ent) {
    this.beaten.add(entKey(this.map, ent));
    const a = this.actors.find((v) => v.ent === ent);
    if (a) a.rig.group.rotation.y += Math.PI;
  }

  facingTile(): [number, number] {
    const [dx, dy] = DIRV[this.facing];
    return [this.px + dx, this.py + dy];
  }

  /** Entité devant le joueur (interaction A). */
  front(): Ent | undefined {
    const [x, y] = this.facingTile();
    const e = this.entAt(x, y);
    if (e) return e;
    const t = this.tileAt(x, y);
    if (t === T.COMPTOIR) {
      const near = this.actors.find((a) => (a.ent.kind === 'heal' || a.ent.kind === 'shop') && Math.abs(a.ent.x - x) <= 2 && Math.abs(a.ent.y - y) <= 2);
      return near?.ent;
    }
    return undefined;
  }

  private syncPlayer() {
    this.player.group.position.set(this.px, 0, this.py);
    this.player.group.rotation.y = faceAngle(this.facing);
  }

  setFacing(f: number) { this.facing = f; this.player.group.rotation.y = faceAngle(f); }

  /** Recule le joueur d'une case (sortie bloquée). */
  pushBack() {
    const [dx, dy] = DIRV[this.facing];
    const nx = this.px - dx, ny = this.py - dy;
    if (WALKABLE.has(this.tileAt(nx, ny))) { this.px = nx; this.py = ny; }
    this.player.group.position.set(this.px, 0, this.py);
  }

  /** Téléporte le joueur sur une case. */
  place(x: number, y: number, facing = this.facing) {
    this.px = x; this.py = y; this.facing = facing;
    this.moving = false;
    this.syncPlayer();
    this.camTarget.set(x, 0, y);
  }

  /** Fait avancer un dresseur vers le joueur avant le combat. */
  approach(ent: Ent) {
    const a = this.actors.find((v) => v.ent === ent);
    if (!a) return;
    const dx = Math.sign(this.px - ent.x), dy = Math.sign(this.py - ent.y);
    a.rig.group.position.set(this.px - dx, 0, this.py - dy);
    a.rig.group.rotation.y = faceAngle(dx !== 0 ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
  }

  /* ---------------- boucle ---------------- */
  update(dt: number, dir: { x: number; y: number }, run: boolean, cam: THREE.PerspectiveCamera) {
    if (!this.loaded) return;
    this.clock += dt;
    const t = this.clock;
    uTime.value = t;

    if (!this.paused) {
      if (this.moving) {
        this.moveT += dt / this.moveDur;
        if (this.moveT >= 1) {
          this.moveT = 1; this.moving = false;
          this.px = this.toX; this.py = this.toY;
          this.player.group.position.set(this.px, 0, this.py);
          this.onArrive();
        } else {
          const k = this.moveT;
          this.player.group.position.set(
            this.fromX + (this.toX - this.fromX) * k, Math.sin(k * Math.PI) * .05,
            this.fromY + (this.toY - this.fromY) * k,
          );
        }
      } else if (Math.abs(dir.x) > .3 || Math.abs(dir.y) > .3) {
        const f = Math.abs(dir.x) > Math.abs(dir.y) ? (dir.x < 0 ? 1 : 3) : (dir.y < 0 ? 2 : 0);
        if (f !== this.facing) this.setFacing(f);
        const [dx, dy] = DIRV[f];
        const nx = this.px + dx, ny = this.py + dy;
        if (!this.blocked(nx, ny)) {
          this.moving = true; this.moveT = 0;
          this.moveDur = run ? .13 : .2;
          this.fromX = this.px; this.fromY = this.py; this.toX = nx; this.toY = ny;
        }
      }
    }

    animateRig(this.player, t, this.moving ? 1 : 0);
    for (const a of this.actors) {
      if (a.ent.kind === 'npc' || a.ent.kind === 'trainer' || a.ent.kind === 'leader' || a.ent.kind === 'boss' || a.ent.kind === 'heal' || a.ent.kind === 'shop') animateRig(a.rig, t);
      else if (a.ent.kind === 'item') { a.rig.group.rotation.y = t * 1.4; a.rig.group.position.y = .38 + Math.sin(t * 2) * .08; }
    }
    if (this.clouds) {
      for (const c of this.clouds.children) {
        c.position.x += (c.userData.speed as number) * dt;
        if (c.position.x > this.map.w / 2 + 80) c.position.x = this.map.w / 2 - 80;
      }
    }

    // caméra suiveuse
    const p = this.player.group.position;
    this.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), 1 - Math.pow(.001, dt));
    const dist = this.map.indoor ? 7.4 : 9.2;
    const hgt = this.map.indoor ? 7.2 : 8.6;
    cam.position.set(this.camTarget.x, hgt, this.camTarget.z + dist);
    cam.lookAt(this.camTarget.x, .8, this.camTarget.z - 1.2);

    // le soleil suit le joueur pour garder une ombre nette
    if (this.lights?.sun.castShadow) {
      this.lights.sun.position.set(this.camTarget.x + 9, 16, this.camTarget.z + 7);
      this.lights.sun.target.position.set(this.camTarget.x, 0, this.camTarget.z);
      this.lights.sun.target.updateMatrixWorld();
    }
  }

  private onArrive() {
    this.hooks.onStep();
    const t = this.tileAt(this.px, this.py);
    const here = this.actors.find((a) => a.ent.x === this.px && a.ent.y === this.py);
    const exitEnt = this.map.ents.find((e) => e.kind === 'exit' && e.x === this.px && e.y === this.py);
    if (t === T.PORTE) {
      const door = this.map.ents.find((e) => e.kind === 'door' && e.x === this.px && e.y === this.py);
      if (door && door.kind === 'door') { this.hooks.onDoor(door.to); return; }
      if (exitEnt && exitEnt.kind === 'exit') { this.hooks.onExit(exitEnt.to, exitEnt); return; }
    }
    if (exitEnt && exitEnt.kind === 'exit') { this.hooks.onExit(exitEnt.to, exitEnt); return; }
    if (here?.ent.kind === 'item') return;
    if (t === T.HERBE) this.hooks.onEncounterTile();
    this.checkSight();
  }

  private checkSight() {
    for (const a of this.actors) {
      const e = a.ent;
      if (e.kind !== 'trainer' || this.beaten.has(entKey(this.map, e))) continue;
      const [dx, dy] = DIRV[e.face];
      for (let k = 1; k <= e.sight; k++) {
        const cx = e.x + dx * k, cy = e.y + dy * k;
        if (!WALKABLE.has(this.tileAt(cx, cy))) break;
        if (cx === this.px && cy === this.py) { this.hooks.onTrainerSight(e); return; }
      }
    }
  }
}

export function faceAngle(f: number): number {
  return [0, Math.PI / 2, Math.PI, -Math.PI / 2][f] ?? 0;
}

export function entKey(map: GameMap, e: Ent): string {
  const id = 'id' in e ? (e as { id: string }).id : `${e.kind}@${e.x},${e.y}`;
  return `${map.id}|${id}`;
}
