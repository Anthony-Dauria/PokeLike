import * as THREE from 'three';
import { T, WALKABLE, type Ent, type GameMap } from './mapgen';
import { drawnTile, tileTexture, type TileFamily } from './tiletex';
import { billboardGeometry, sprite2d, spriteMaterial, TILT } from './sprites2d';
import { state } from '../game/state';
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

/** Rayon de collision du joueur, en cases : assez fin pour passer un couloir d'une case. */
const RADIUS = .34;
/** Vitesse de marche et de course, en cases par seconde. */
const SPEED = 4.0, SPEED_RUN = 6.4;
/** En dessous, on considère le stick au repos. */
const DEADZONE = .12;

export class Overworld {
  scene = new THREE.Scene();
  map!: GameMap;
  px = 0; py = 0;
  facing = 0;
  /** Orientation continue, en radians, dans la convention de `faceAngle`. */
  heading = 0;
  private walking = false;
  /** Distance parcourue depuis le dernier « pas » compté. */
  private stepDist = 0;
  /** Distance parcourue dans les hautes herbes depuis le dernier tirage. */
  private grassDist = 0;
  /** Case occupée à la frame précédente : portes et sorties ne se déclenchent qu'au changement. */
  private lastTile = -1;
  /** Cases prises par du mobilier posé au décor : infranchissables, sans toucher à la carte. */
  private meubles = new Set<number>();
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

  get busy() { return false; }

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

    this.meubles.clear();
    this.buildTerrain(map, pal);
    this.buildProps(map, pal);
    if (!map.indoor) this.buildHorizon(map, pal);
    if (pal.clouds && !map.indoor) this.buildClouds(map, pal);
    this.buildActors(map);

    // Apparence du joueur selon le sexe choisi au début de la partie.
    this.player = state.gender === 'f'
      ? buildHuman(0xe0518a, 0xf2c9a0, 0x8a4326, 0xf6f8fc, true)
      : buildHuman(0x2a7fd4, 0xf2c9a0, 0x2b1d16, 0xe8434e);
    this.scene.add(this.player.group);
    this.px = spawn[0]; this.py = spawn[1];
    this.setFacing(facing);
    this.nudgeIntoPlace();
    this.lastTile = this.tileIndex(this.px, this.py);
    this.stepDist = this.grassDist = 0;
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

    /* --- un maillage par matière : chacune porte son motif pixel, répété à la
           case. Les UV suivent les coordonnées du monde, donc les motifs se
           raccordent d'une tuile à l'autre sans couture. --- */
    const matiere = (t: number): TileFamily =>
      t === T.EAU ? 'eau'
        : t === T.SABLE ? 'sable'
          : t === T.CHEMIN || t === T.SORTIE ? 'chemin'
            : t === T.MUR || t === T.OBSTACLE ? 'roche'
              : t === T.TAPIS || t === T.COMPTOIR ? 'sol'
                // T.SOL, c'est le terrain nu : de la pelouse dehors, du carrelage dedans.
                // T.HERBE désigne les hautes herbes, pas le sol ordinaire.
                : map.indoor ? 'sol' : 'herbe';

    const dessins = SOLS_DESSINES[map.biome] ?? {};
    interface Lot { pos: number[]; col: number[]; uv: number[]; idx: number[] }
    const lots = new Map<TileFamily, Lot>();
    const tmpCol = new THREE.Color();
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = map.tiles[y * W + x];
        const fam = matiere(t);
        let lot = lots.get(fam);
        if (!lot) { lot = { pos: [], col: [], uv: [], idx: [] }; lots.set(fam, lot); }
        const v = lot.pos.length / 3;
        // Seule l'eau descend : décaler les chemins créerait une fissure visible avec leurs voisins.
        const flatY = t === T.EAU ? -.86 : null;   // lit du plan d'eau, bien en dessous
        // Un sol dessiné est une tuile complète : on lui donne des UV de 0 à 1 sur
        // la case, retournées au hasard pour que la répétition ne saute pas aux
        // yeux. Un motif procédural, lui, se raccorde d'une case à l'autre et
        // suit donc les coordonnées du monde.
        const dessine = !!dessins[fam];
        const fx = dessine && ((x * 73 + y * 31) & 1) ? 1 : 0;
        const fy = dessine && ((x * 17 + y * 91) & 2) ? 1 : 0;
        const gris = dessine ? ao(x, y) : 0;
        for (const [cx, cy] of corners) {
          const co = ((y + cy) * CW + (x + cx));
          lot.pos.push(x - .5 + cx, flatY ?? corner[co], y - .5 + cy);
          if (dessine) {
            // Léger rognage : le carré source a ses propres bords assombris, qui
            // dessineraient une grille à chaque jointure de cases.
            const u = INSET + cx * (1 - 2 * INSET), v = INSET + cy * (1 - 2 * INSET);
            lot.uv.push(fx ? 1 - u : u, fy ? v : 1 - v);
            lot.col.push(gris, gris, gris);
          } else {
            lot.uv.push(x - .5 + cx, -(y - .5 + cy));
            blended(x, y, cx, cy, tmpCol);
            lot.col.push(tmpCol.r, tmpCol.g, tmpCol.b);
          }
        }
        lot.idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
      }
    }

    for (const [fam, lot] of lots) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(lot.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(lot.col, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(lot.uv, 2));
      geo.setIndex(lot.idx);
      geo.computeVertexNormals();
      const dessin = dessins[fam];
      const tex = dessin ? drawnTile(dessin) : tileTexture(fam);
      const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient() });
      // Motif procédural : niveaux de gris proches du blanc, il assombrit le
      // détail sans toucher à la teinte. Sol dessiné : il porte déjà sa couleur.
      if (tex) mat.map = tex;
      const ground = new THREE.Mesh(geo, mat);
      ground.receiveShadow = true;
      this.scene.add(ground);
    }

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
      } else if (this.arbresDessines(obs, rng)) {
        // Arbres dessinés : rien d'autre à construire, cf. addArbres.
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

    /* -- bâtiments dessinés --
       Chaque porte identifie un édifice : on remonte à ses murs par propagation,
       on pose un panneau à sa taille, et ces tuiles sortent du rendu en boîtes.
       La collision, elle, ne change pas : les murs restent infranchissables. */
    const murBati = new Set<number>();
    const portesDessinees = new Set<number>();
    if (!map.indoor) {
      for (const e of map.ents) {
        if (e.kind !== 'door') continue;
        const tuiles = this.batimentTiles(map, e.x, e.y);
        if (!tuiles.length) continue;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [tx, ty] of tuiles) {
          murBati.add(ty * map.w + tx);
          x0 = Math.min(x0, tx); x1 = Math.max(x1, tx);
          y0 = Math.min(y0, ty); y1 = Math.max(y1, ty);
        }
        this.addBatiment(nomBatiment(e.to, e.label), x0, y0, x1, y1);
        portesDessinees.add(e.y * map.w + e.x);
      }
    }

    /* -- murs restants : intérieurs et clôtures, toujours en volumes -- */
    const mur = (tiles[T.MUR] ?? []).filter(([x, y]) => !murBati.has(y * map.w + x));
    if (mur.length) {
      const wallCol = map.indoor ? 0xb9c3d4 : 0xe2d6bf;
      // Bardage et tuiles : le nombre de répétitions suit les dimensions du volume,
      // sinon le motif s'étire sur les faces hautes.
      const wallMat = toon(wallCol);
      const wallTex = tileTexture('mur', 1, 2.2);
      if (wallTex) wallMat.map = wallTex;
      const roofMat = toon(map.indoor ? (map.accent ?? 0x6b5240) : 0xc4564e);
      const roofTex = tileTexture('toit');
      if (roofTex) roofMat.map = roofTex;
      const im = inst(new THREE.BoxGeometry(1, 2.2, 1), wallMat, mur.length);
      const roof = inst(new THREE.BoxGeometry(1.1, .42, 1.1), roofMat, mur.length);
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

    /* -- mobilier dessiné, le long du mur du fond des intérieurs -- */
    if (map.indoor) this.meublerInterieur(map, rng);

    /* -- portes & sorties -- */
    for (const e of map.ents) {
      if (e.kind === 'door') {
        // Le dessin du bâtiment contient déjà sa porte : inutile d'en poser une.
        if (portesDessinees.has(e.y * map.w + e.x)) continue;
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

  /**
   * Murs formant le bâtiment auquel appartient une porte. On part des voisins de
   * la porte et on propage sur les T.MUR contigus : le générateur pose les
   * édifices en rectangles pleins, la propagation suffit donc à les cerner.
   */
  private batimentTiles(map: GameMap, dx: number, dy: number): [number, number][] {
    const vu = new Set<number>();
    const out: [number, number][] = [];
    const pile: [number, number][] = [];
    const pousse = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) return;
      const k = y * map.w + x;
      if (vu.has(k) || map.tiles[k] !== T.MUR) return;
      vu.add(k); pile.push([x, y]);
    };
    for (const [ox, oy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1]]) pousse(dx + ox, dy + oy);
    while (pile.length) {
      const [x, y] = pile.pop()!;
      out.push([x, y]);
      pousse(x - 1, y); pousse(x + 1, y); pousse(x, y - 1); pousse(x, y + 1);
    }
    // La porte occupe une tuile du rectangle : on la compte pour le cadrage.
    out.push([dx, dy]);
    return out;
  }

  /**
   * Arbres en panneaux dessinés, groupés par essence en maillages instanciés :
   * une centaine d'arbres tient ainsi en trois appels de rendu au lieu de cent.
   * Retourne false si les images manquent, auquel cas l'appelant garde ses cônes.
   */
  private arbresDessines(obs: [number, number][], rng: RNG): boolean {
    const essences = ['sapin', 'arbre-fonce', 'arbre-clair'];
    if (!essences.every((n) => sprite2d(n).ready)) {
      // Premier chargement : on demande les images et on laisse les cônes pour
      // cette carte. La suivante, elles seront en cache.
      for (const n of essences) sprite2d(n, () => {});
      return false;
    }
    const lots: [number, number][][] = essences.map(() => []);
    for (const t of obs) lots[rng.int(essences.length)].push(t);
    essences.forEach((nom, k) => {
      const tuiles = lots[k];
      if (!tuiles.length) return;
      const s = sprite2d(nom);
      const im = new THREE.InstancedMesh(billboardGeometry(), spriteMaterial(s), tuiles.length);
      const d = new THREE.Object3D();
      tuiles.forEach(([x, y], i) => {
        const h = 2.1 + rng.next() * .7;
        d.position.set(x + (rng.next() - .5) * .28, 0, y + .18);
        d.rotation.set(TILT, 0, 0);
        d.scale.set(h * s.aspect, h, 1);
        d.updateMatrix();
        im.setMatrixAt(i, d.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      this.scene.add(im);
    });
    return true;
  }

  /**
   * Garnit le mur du fond d'un intérieur avec du mobilier dessiné. Les pièces
   * restent générées : on ne fait qu'habiller la première rangée libre, celle qui
   * longe le mur, en laissant partout ailleurs le passage.
   *
   * Les cases occupées deviennent infranchissables par `meubles`, sans modifier
   * la carte elle-même : elle est partagée et servirait telle quelle au retour.
   */
  private meublerInterieur(map: GameMap, rng: RNG) {
    // Les noms portent leur sous-dossier : sprite2d lit public/monde/<nom>.png.
    const choix = ['props/casier', 'props/machine', 'props/etagere', 'props/distributeur',
      'props/plante', 'props/plante-2', 'props/caisses'];
    if (!choix.every((n) => sprite2d(n).ready)) { for (const n of choix) sprite2d(n, () => {}); return; }

    // Cases longeant un mur : la rangée du fond, puis les deux murs latéraux. Le
    // fond est souvent pris par le comptoir, les côtés restent visibles et libres.
    const cases: [number, number][] = [];
    for (let x = 1; x < map.w - 1; x++) cases.push([x, 2]);
    for (let y = 3; y < map.h - 2; y++) { cases.push([1, y]); cases.push([map.w - 2, y]); }

    const pris: { nom: string; x: number; y: number }[] = [];
    for (const [x, y] of cases) {
      const t = map.tiles[y * map.w + x];
      if (!WALKABLE.has(t) || t === T.PORTE || t === T.COMPTOIR) continue;
      // On laisse libres les abords d'une entité : comptoir, PNJ, escalier, objet.
      if (map.ents.some((e) => Math.abs(e.x - x) <= 1 && Math.abs(e.y - y) <= 1)) continue;
      // Pas deux meubles côte à côte, pour ne pas murer un passage.
      if (pris.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= 1)) continue;
      if (!rng.chance(.5)) continue;
      pris.push({ nom: choix[rng.int(choix.length)], x, y });
    }
    for (const { nom, x, y } of pris) {
      const s = sprite2d(nom);
      const mesh = new THREE.Mesh(billboardGeometry(), spriteMaterial(s));
      const h = 1.15;
      mesh.position.set(x, 0, y + .1);
      mesh.rotation.x = TILT;
      mesh.scale.set(h * (s.aspect || 1), h, 1);
      this.scene.add(mesh);
      this.meubles.add(y * map.w + x);
    }
  }

  /** Pose le panneau d'un bâtiment sur l'emprise donnée. */
  private addBatiment(nom: string, x0: number, _y0: number, x1: number, y1: number) {
    const s = sprite2d(nom);
    const mesh = new THREE.Mesh(billboardGeometry(), spriteMaterial(s));
    // Base sur la façade avant : incliné vers la caméra, le panneau recouvre
    // ensuite toute la profondeur de l'emprise.
    mesh.position.set((x0 + x1) / 2, 0, y1 + .2);
    mesh.rotation.x = TILT;
    const ajuste = () => {
      // Le panneau couvre l'emprise, sans plus : incliné vers la caméra il paraît
      // déjà plus haut qu'un mur droit de même taille.
      const larg = (x1 - x0 + 1) + .2;
      mesh.scale.set(larg, larg / (s.aspect || 1), 1);
    };
    ajuste();
    // Le rapport n'est connu qu'au chargement : on recadre à l'arrivée de l'image.
    sprite2d(nom, ajuste);
    this.scene.add(mesh);
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
    if (this.meubles.has(y * this.map.w + x)) return true;
    const e = this.entAt(x, y);
    return !!e && e.kind !== 'exit';
  }

  /**
   * Décale le joueur si son cercle mord un obstacle. Les points d'apparition sont
   * donnés à la case ; avec un rayon, un angle de mur peut les rendre invalides.
   */
  private nudgeIntoPlace() {
    if (this.fits(this.px, this.py)) return;
    for (const r of [.25, .5]) {
      for (const [ox, oy] of [[0, -r], [0, r], [-r, 0], [r, 0], [-r, -r], [r, -r], [-r, r], [r, r]]) {
        if (this.fits(this.px + ox, this.py + oy)) { this.px += ox; this.py += oy; return; }
      }
    }
  }

  /** Index de la case sous une position continue. */
  private tileIndex(x: number, y: number): number {
    return Math.round(y) * this.map.w + Math.round(x);
  }

  /**
   * Le joueur tient-il à cette position ? On teste les quatre coins de son cercle :
   * en déplacement libre, il faut empêcher de traverser un angle de mur en biais.
   */
  private fits(x: number, y: number): boolean {
    for (const ox of [-RADIUS, RADIUS]) {
      for (const oy of [-RADIUS, RADIUS]) {
        if (this.blocked(Math.round(x + ox), Math.round(y + oy))) return false;
      }
    }
    return true;
  }

  /** Vecteur unitaire de l'orientation courante (x = est, y = sud). */
  private aim(): [number, number] {
    return [-Math.sin(this.heading), Math.cos(this.heading)];
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
    const [dx, dy] = this.aim();
    return [Math.round(this.px + dx * .85), Math.round(this.py + dy * .85)];
  }

  /**
   * Entité devant le joueur (interaction A). En déplacement libre on ne peut plus
   * exiger l'alignement parfait d'une grille : on prend l'entité la plus proche
   * dans un cône devant soi, et on retombe sur la case visée pour les comptoirs.
   */
  front(): Ent | undefined {
    const [dx, dy] = this.aim();
    let best: Ent | undefined, bestD = Infinity;
    for (const a of this.actors) {
      const e = a.ent;
      if (e.kind === 'exit') continue;
      const vx = e.x - this.px, vy = e.y - this.py;
      const d = Math.hypot(vx, vy);
      if (d > 1.8 || d < 1e-4) continue;
      // cos > .45 ≈ un cône de ±63°, assez large pour rester agréable au pouce.
      if ((vx * dx + vy * dy) / d < .45) continue;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) return best;
    const [x, y] = this.facingTile();
    if (this.tileAt(x, y) === T.COMPTOIR) {
      const near = this.actors.find((a) => (a.ent.kind === 'heal' || a.ent.kind === 'shop') && Math.abs(a.ent.x - x) <= 2 && Math.abs(a.ent.y - y) <= 2);
      return near?.ent;
    }
    return undefined;
  }

  private syncPlayer() {
    this.player.group.position.set(this.px, 0, this.py);
    this.player.group.rotation.y = this.heading;
  }

  /** Oriente le joueur depuis un indice de direction (0 sud, 1 ouest, 2 nord, 3 est). */
  setFacing(f: number) {
    this.facing = f;
    this.heading = faceAngle(f);
    if (this.player) this.player.group.rotation.y = this.heading;
  }

  /** Recule le joueur d'un pas (sortie bloquée). */
  pushBack() {
    const [dx, dy] = this.aim();
    for (const d of [.6, 1, 1.4]) {
      const nx = this.px - dx * d, ny = this.py - dy * d;
      if (this.fits(nx, ny)) { this.px = nx; this.py = ny; break; }
    }
    this.lastTile = this.tileIndex(this.px, this.py);
    this.player.group.position.set(this.px, 0, this.py);
  }

  /** Téléporte le joueur sur une case. */
  place(x: number, y: number, facing = this.facing) {
    this.px = x; this.py = y;
    this.setFacing(facing);
    // La case d'arrivée ne doit pas redéclencher la porte qu'on vient d'emprunter.
    this.lastTile = this.tileIndex(x, y);
    this.stepDist = this.grassDist = 0;
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

    if (!this.paused) this.walk(dt, dir, run);

    animateRig(this.player, t, this.walking ? 1 : 0);
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

  /**
   * Déplacement libre : le joueur suit exactement la direction poussée, à 360°.
   * La collision est résolue axe par axe, ce qui fait glisser le long des murs
   * au lieu de s'y bloquer net quand on pousse en biais.
   */
  private walk(dt: number, dir: { x: number; y: number }, run: boolean) {
    const mag = Math.hypot(dir.x, dir.y);
    if (mag < DEADZONE) { this.walking = false; return; }

    // Le stick dose la vitesse ; poussé à fond, il fait courir, ce qui donne enfin
    // la course au tactile (au clavier, c'est Maj).
    const fast = run || mag > .92;
    const sp = (fast ? SPEED_RUN : SPEED) * Math.min(1, mag) * dt;
    const ux = dir.x / mag, uy = dir.y / mag;
    const fromX = this.px, fromY = this.py;
    if (this.fits(this.px + ux * sp, this.py)) this.px += ux * sp;
    if (this.fits(this.px, this.py + uy * sp)) this.py += uy * sp;

    // On tourne vers la direction poussée par le plus court chemin.
    const cible = Math.atan2(-ux, uy);
    let d = cible - this.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.heading += d * Math.min(1, dt * 14);
    this.facing = facingOf(this.heading);
    this.player.group.rotation.y = this.heading;

    const moved = Math.hypot(this.px - fromX, this.py - fromY);
    this.walking = moved > 1e-5;
    this.player.group.position.set(this.px, Math.abs(Math.sin(this.clock * 9)) * (this.walking ? .04 : 0), this.py);
    if (!this.walking) return;
    this.advance(moved);
  }

  /** Conséquences d'une distance parcourue : pas, herbes hautes, changement de case. */
  private advance(moved: number) {
    this.stepDist += moved;
    if (this.stepDist >= 1) { this.stepDist %= 1; this.hooks.onStep(); }

    const tx = Math.round(this.px), ty = Math.round(this.py);
    if (this.tileAt(tx, ty) === T.HERBE) {
      // Un tirage par case parcourue : même fréquence qu'avec l'ancien pas à pas.
      this.grassDist += moved;
      if (this.grassDist >= 1) { this.grassDist %= 1; this.hooks.onEncounterTile(); return; }
    } else this.grassDist = 0;

    const idx = ty * this.map.w + tx;
    if (idx === this.lastTile) return;
    this.lastTile = idx;
    this.onEnterTile(tx, ty);
    this.checkSight();
  }

  /** Portes et sorties : uniquement au moment où l'on change de case. */
  private onEnterTile(x: number, y: number) {
    const exitEnt = this.map.ents.find((e) => e.kind === 'exit' && e.x === x && e.y === y);
    if (this.tileAt(x, y) === T.PORTE) {
      const door = this.map.ents.find((e) => e.kind === 'door' && e.x === x && e.y === y);
      if (door && door.kind === 'door') { this.hooks.onDoor(door.to); return; }
    }
    if (exitEnt && exitEnt.kind === 'exit') this.hooks.onExit(exitEnt.to, exitEnt);
  }

  private checkSight() {
    for (const a of this.actors) {
      const e = a.ent;
      if (e.kind !== 'trainer' || this.beaten.has(entKey(this.map, e))) continue;
      const [dx, dy] = DIRV[e.face];
      for (let k = 1; k <= e.sight; k++) {
        const cx = e.x + dx * k, cy = e.y + dy * k;
        if (!WALKABLE.has(this.tileAt(cx, cy))) break;
        if (cx === Math.round(this.px) && cy === Math.round(this.py)) { this.hooks.onTrainerSight(e); return; }
      }
    }
  }
}

/** Part rognée de chaque bord d'un sol dessiné, pour masquer sa bordure propre. */
const INSET = .045;

/**
 * Sols dessinés selon le biome. Là où une image existe, elle remplace le motif
 * procédural : elle apporte sa propre couleur, donc la teinte de palette est
 * abandonnée pour cette matière et seule l'occlusion module encore la surface.
 * Les biomes absents gardent les motifs en niveaux de gris, qui eux se teintent.
 */
const SOLS_DESSINES: Record<string, Partial<Record<TileFamily, string>>> = {
  grotte: { sol: 'roche-brune', herbe: 'roche-brune', chemin: 'roche-brune', roche: 'brique-grise' },
  volcan: { herbe: 'roche-brune', sol: 'roche-brune', chemin: 'roche-brune', eau: 'lave', roche: 'brique-grise' },
  // Ni « neige » ni « interieur » : la glace bleue transforme une route enneigée en
  // lac, et aucun de ces sols n'est un carrelage de bâtiment. Le motif procédural
  // garde l'avantage de prendre la couleur du biome ou du lieu.
};

/** Quel dessin de bâtiment employer pour une porte donnée. */
function nomBatiment(to: string, label: string): string {
  if (/:center$/.test(to)) return 'centre';
  if (/:shop$/.test(to)) return 'mart';
  if (/^gym:/.test(to) || /^league:/.test(to)) return 'arene';
  if (/bibli|école|ecole|savant|étude/i.test(label)) return 'bibliotheque';
  if (/phare/i.test(label)) return 'phare';
  // Les maisons alternent pour éviter des rues entièrement identiques.
  const n = Number(/house(\d+)$/.exec(to)?.[1] ?? 0);
  return n % 3 === 1 ? 'bibliotheque' : 'maison';
}

export function faceAngle(f: number): number {
  return [0, Math.PI / 2, Math.PI, -Math.PI / 2][f] ?? 0;
}

/** Indice de direction le plus proche d'une orientation continue. */
export function facingOf(rad: number): number {
  return ((Math.round(rad / (Math.PI / 2)) % 4) + 4) % 4;
}

export function entKey(map: GameMap, e: Ent): string {
  const id = 'id' in e ? (e as { id: string }).id : `${e.kind}@${e.x},${e.y}`;
  return `${map.id}|${id}`;
}
