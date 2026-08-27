import * as THREE from 'three';
import { T, WALKABLE, type Ent, type GameMap } from './mapgen';
import { animateRig, buildHuman, type CreatureRig } from '../creature/model';
import { RNG, hashStr } from '../engine/rng';
import { addLights, disposeObject, disposeScene } from '../engine/renderer';

export const DIRV: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]]; // S, O, N, E

interface Palette { ground: number; path: number; water: number; prop: 'tree' | 'rock' | 'cactus' | 'snowtree' | 'crystal'; propColor: number; trunk: number; grass: number; sky: number; fog: number; flower: number[]; light?: number }

const PAL: Record<string, Palette> = {
  plaine: { ground: 0x5fa851, path: 0xc9b184, water: 0x3d8fd4, prop: 'tree', propColor: 0x2f7a3c, trunk: 0x6b4a2f, grass: 0x3f8c3a, sky: 0x9ed2ff, fog: 0xbfe0f5, flower: [0xff7ba0, 0xffd166, 0xa88fff] },
  foret: { ground: 0x3f8f47, path: 0xa8925f, water: 0x357fb8, prop: 'tree', propColor: 0x1f5f30, trunk: 0x54381f, grass: 0x2d7134, sky: 0x8fc7e8, fog: 0x9fc9b8, flower: [0xffe083, 0xff9ecb, 0xc0ff8f] },
  montagne: { ground: 0x8a9078, path: 0xb3a68a, water: 0x4a8fc0, prop: 'rock', propColor: 0x77786e, trunk: 0x55564f, grass: 0x6d8a55, sky: 0xa9c8e0, fog: 0xc0cbd6, flower: [0xffd9a0, 0xdedede, 0xffb3b3] },
  plage: { ground: 0xe3d3a0, path: 0xd8c48a, water: 0x2f9fd8, prop: 'tree', propColor: 0x3f9a55, trunk: 0x8a6a3f, grass: 0x8fbf5f, sky: 0x8ed8ff, fog: 0xcfeaf7, flower: [0xffd166, 0xff9f6e, 0xfff0a0] },
  desert: { ground: 0xe0c07a, path: 0xcaa860, water: 0x3fa0c8, prop: 'cactus', propColor: 0x4f8f4a, trunk: 0x9a7a45, grass: 0xb9a55c, sky: 0xffd9a0, fog: 0xf0d5a0, flower: [0xff8f5e, 0xffe0a0, 0xd8a0ff] },
  neige: { ground: 0xe6eef7, path: 0xc9d6e4, water: 0x6fb8e0, prop: 'snowtree', propColor: 0xdfe9f2, trunk: 0x4a5a6a, grass: 0xbcd0e0, sky: 0xdfeeff, fog: 0xe8f2fb, flower: [0xa0d8ff, 0xffffff, 0xcfe8ff] },
  volcan: { ground: 0x6b4b45, path: 0x3f2e2c, water: 0xff6a2a, prop: 'rock', propColor: 0x4a3532, trunk: 0x2f2220, grass: 0x8a4a35, sky: 0xffa070, fog: 0xd07a55, flower: [0xff6a3a, 0xffc04a, 0xff9060] },
  marais: { ground: 0x4f6b4a, path: 0x7a7150, water: 0x3f5a4a, prop: 'tree', propColor: 0x3a5a3a, trunk: 0x3f3226, grass: 0x486b40, sky: 0x8fa8a0, fog: 0x7f958c, flower: [0xa0ff8f, 0xd0c060, 0x9f8fff] },
  ville: { ground: 0x77a75f, path: 0xcfc3aa, water: 0x3d8fd4, prop: 'tree', propColor: 0x2f7a3c, trunk: 0x6b4a2f, grass: 0x4f8f45, sky: 0x9ed2ff, fog: 0xc5dff0, flower: [0xff7ba0, 0xffd166, 0xa88fff] },
  grotte: { ground: 0x5d5c6b, path: 0x6d6c7b, water: 0x3f5f8f, prop: 'crystal', propColor: 0x7a7690, trunk: 0x3a3945, grass: 0x53645a, sky: 0x1a1c26, fog: 0x2b2f40, flower: [0x8fd0ff, 0xb0a0ff, 0x70e0c0], light: 0xa8bcd8 },
  sommet: { ground: 0xe6eef7, path: 0xc9d6e4, water: 0x6fb8e0, prop: 'rock', propColor: 0x8d97a8, trunk: 0x4a5a6a, grass: 0xbcd0e0, sky: 0xcfe4ff, fog: 0xdfeaf7, flower: [0xa0d8ff, 0xffffff, 0xcfe8ff] },
  interieur: { ground: 0xd6ac82, path: 0xc39a6f, water: 0x3d8fd4, prop: 'rock', propColor: 0x8b6b52, trunk: 0x6b4a2f, grass: 0x7a9a5a, sky: 0x232838, fog: 0x232838, flower: [0xffd166, 0xff9ecb, 0xa0d8ff], light: 0xffeccf },
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
  private water: THREE.Mesh[] = [];
  private grassTuft: THREE.InstancedMesh | null = null;
  private clock = 0;
  private camTarget = new THREE.Vector3();
  paused = false;
  loaded = false;
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
    this.water = [];
    this.grassTuft = null;
    const pal = PAL[map.biome] ?? PAL.plaine;
    this.scene.background = new THREE.Color(pal.sky);
    this.scene.fog = new THREE.Fog(pal.fog, map.indoor ? 30 : 20, map.indoor ? 70 : 52);
    addLights(this.scene, pal.light ?? pal.sky, pal.ground, map.indoor ? 0xfff0d8 : 0xffffff);

    this.buildTerrain(map, pal);
    this.buildProps(map, pal);
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
  private tileColor(t: number, pal: Palette, jitter: number): THREE.Color {
    let base: number;
    switch (t) {
      case T.CHEMIN: base = pal.path; break;
      case T.SABLE: base = pal.ground; break;
      case T.EAU: base = pal.water; break;
      case T.HERBE: base = pal.grass; break;
      case T.TAPIS: base = pal.ground; break;
      case T.SORTIE: base = pal.path; break;
      case T.FLEUR: base = pal.ground; break;
      default: base = pal.ground;
    }
    const c = new THREE.Color(base);
    const k = 1 + (jitter - .5) * .12;
    c.multiplyScalar(k);
    return c;
  }

  private buildTerrain(map: GameMap, pal: Palette) {
    const rng = new RNG(hashStr(map.id) + 5);
    const n = map.w * map.h;
    const pos = new Float32Array(n * 4 * 3);
    const col = new Float32Array(n * 4 * 3);
    const idx = new Uint32Array(n * 6);
    let v = 0, f = 0;
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y * map.w + x];
        const h = t === T.EAU ? -.16 : t === T.CHEMIN || t === T.SORTIE ? .015 : 0;
        const c = this.tileColor(t, pal, rng.next());
        const base = v * 3;
        const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
        corners.forEach(([cx, cy], i) => {
          pos[base + i * 3] = x - .5 + cx;
          pos[base + i * 3 + 1] = h;
          pos[base + i * 3 + 2] = y - .5 + cy;
          col[base + i * 3] = c.r; col[base + i * 3 + 1] = c.g; col[base + i * 3 + 2] = c.b;
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
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.scene.add(mesh);

    // Terrain de remplissage : évite de voir le vide au-delà des bords.
    const pad = map.biome === 'interieur' ? 8 : 70;
    const skirt = new THREE.Mesh(
      new THREE.BoxGeometry(map.w + pad, 4, map.h + pad),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.ground).multiplyScalar(map.biome === 'interieur' ? .55 : .82) }),
    );
    skirt.position.set(map.w / 2 - .5, -2.001, map.h / 2 - .5);   // sommet affleurant le sol
    this.scene.add(skirt);
  }

  private buildProps(map: GameMap, pal: Palette) {
    const rng = new RNG(hashStr(map.id) + 77);
    const tiles: Record<number, [number, number][]> = {};
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
      const t = map.tiles[y * map.w + x];
      (tiles[t] ??= []).push([x, y]);
    }
    const dummy = new THREE.Object3D();
    const inst = (geo: THREE.BufferGeometry, m: THREE.Material, count: number) => {
      const im = new THREE.InstancedMesh(geo, m, count);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.scene.add(im);
      return im;
    };

    /* -- obstacles -- */
    const obs = tiles[T.OBSTACLE] ?? [];
    if (obs.length) {
      if (pal.prop === 'rock' || pal.prop === 'crystal') {
        const im = inst(new THREE.IcosahedronGeometry(.62, 0), new THREE.MeshLambertMaterial({ color: pal.propColor, flatShading: true }), obs.length);
        obs.forEach(([x, y], i) => {
          dummy.position.set(x, .3 + rng.next() * .25, y);
          dummy.rotation.set(rng.next(), rng.next() * 6, rng.next());
          const s = .8 + rng.next() * .6;
          dummy.scale.set(s, s * (pal.prop === 'crystal' ? 1.5 : .9), s);
          dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
      } else if (pal.prop === 'cactus') {
        const im = inst(new THREE.CylinderGeometry(.24, .28, 1.5, 7), new THREE.MeshLambertMaterial({ color: pal.propColor }), obs.length);
        obs.forEach(([x, y], i) => {
          dummy.position.set(x, .75, y); dummy.rotation.set(0, rng.next() * 6, 0);
          const s = .8 + rng.next() * .5; dummy.scale.set(1, s, 1);
          dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        });
        im.instanceMatrix.needsUpdate = true;
      } else {
        const trunk = inst(new THREE.CylinderGeometry(.13, .17, 1, 6), new THREE.MeshLambertMaterial({ color: pal.trunk }), obs.length);
        const crown = inst(new THREE.ConeGeometry(.62, 1.5, 7), new THREE.MeshLambertMaterial({ color: pal.propColor, flatShading: true }), obs.length * 2);
        obs.forEach(([x, y], i) => {
          const s = .85 + rng.next() * .4;
          dummy.position.set(x, .5 * s, y); dummy.scale.set(s, s, s); dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
          dummy.position.set(x, 1.15 * s, y); dummy.rotation.set(0, rng.next() * 6, 0);
          dummy.updateMatrix(); crown.setMatrixAt(i * 2, dummy.matrix);
          dummy.position.set(x, 1.72 * s, y); dummy.scale.set(s * .7, s * .8, s * .7);
          dummy.updateMatrix(); crown.setMatrixAt(i * 2 + 1, dummy.matrix);
        });
        trunk.instanceMatrix.needsUpdate = true; crown.instanceMatrix.needsUpdate = true;
      }
    }

    /* -- herbes hautes -- */
    const gr = tiles[T.HERBE] ?? [];
    if (gr.length) {
      const im = inst(new THREE.ConeGeometry(.2, .55, 4), new THREE.MeshLambertMaterial({ color: pal.grass, flatShading: true }), gr.length * 3);
      gr.forEach(([x, y], i) => {
        for (let k = 0; k < 3; k++) {
          dummy.position.set(x + (rng.next() - .5) * .7, .26, y + (rng.next() - .5) * .7);
          dummy.rotation.set(0, rng.next() * 6, (rng.next() - .5) * .25);
          const s = .8 + rng.next() * .5; dummy.scale.set(s, s, s);
          dummy.updateMatrix(); im.setMatrixAt(i * 3 + k, dummy.matrix);
        }
      });
      im.instanceMatrix.needsUpdate = true;
      this.grassTuft = im;
    }

    /* -- fleurs -- */
    const fl = tiles[T.FLEUR] ?? [];
    if (fl.length) {
      pal.flower.forEach((cHex, ci) => {
        const sub = fl.filter((_, i) => i % pal.flower.length === ci);
        if (!sub.length) return;
        const im = inst(new THREE.SphereGeometry(.13, 6, 5), new THREE.MeshLambertMaterial({ color: cHex }), sub.length * 2);
        sub.forEach(([x, y], i) => {
          for (let k = 0; k < 2; k++) {
            dummy.position.set(x + (rng.next() - .5) * .6, .16, y + (rng.next() - .5) * .6);
            dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(.8 + rng.next() * .5);
            dummy.updateMatrix(); im.setMatrixAt(i * 2 + k, dummy.matrix);
          }
        });
        im.instanceMatrix.needsUpdate = true;
      });
    }

    /* -- eau animée -- */
    const wa = tiles[T.EAU] ?? [];
    if (wa.length) {
      const im = inst(new THREE.BoxGeometry(1, .3, 1), new THREE.MeshLambertMaterial({ color: pal.water, transparent: true, opacity: .88 }), wa.length);
      wa.forEach(([x, y], i) => {
        dummy.position.set(x, -.14, y); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      im.userData.waterTiles = wa;
      this.water.push(im as unknown as THREE.Mesh);
    }

    /* -- murs / bâtiments -- */
    const mur = tiles[T.MUR] ?? [];
    if (mur.length) {
      const wallCol = map.indoor ? 0x9a7f68 : 0xd9cbb4;
      const im = inst(new THREE.BoxGeometry(1, 2.2, 1), new THREE.MeshLambertMaterial({ color: wallCol }), mur.length);
      const roof = inst(new THREE.BoxGeometry(1.08, .38, 1.08), new THREE.MeshLambertMaterial({ color: map.indoor ? 0x6b5240 : 0xc4564e }), mur.length);
      // Façades sud : on pose une fenêtre sur les murs qui donnent sur l'extérieur.
      const front = map.indoor ? [] : mur.filter(([x, y]) => y + 1 < map.h && map.tiles[(y + 1) * map.w + x] !== T.MUR);
      const win = front.length ? inst(new THREE.BoxGeometry(.52, .5, .1), new THREE.MeshLambertMaterial({ color: 0x8fd0ff }), front.length) : null;
      mur.forEach(([x, y], i) => {
        dummy.position.set(x, 1.1, y); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        dummy.position.set(x, 2.36, y);
        dummy.updateMatrix(); roof.setMatrixAt(i, dummy.matrix);
      });
      front.forEach(([x, y], i) => {
        if (!win) return;
        dummy.position.set(x, 1.45, y + .51); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); win.setMatrixAt(i, dummy.matrix);
      });
      if (win) win.instanceMatrix.needsUpdate = true;
      im.instanceMatrix.needsUpdate = true; roof.instanceMatrix.needsUpdate = true;
    }

    /* -- comptoirs -- */
    const cpt = tiles[T.COMPTOIR] ?? [];
    if (cpt.length) {
      const im = inst(new THREE.BoxGeometry(1, .9, 1), new THREE.MeshLambertMaterial({ color: 0xd8b06a }), cpt.length);
      cpt.forEach(([x, y], i) => {
        dummy.position.set(x, .45, y); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    }

    /* -- portes -- */
    for (const e of map.ents) {
      if (e.kind === 'door') {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, .25), new THREE.MeshLambertMaterial({ color: 0x5b3f2c }));
        frame.position.set(e.x, .95, e.y - .45);
        this.scene.add(frame);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(.78, 1.5, .1), new THREE.MeshLambertMaterial({ color: 0xf0d9a0 }));
        panel.position.set(e.x, .8, e.y - .3);
        this.scene.add(panel);
        const awning = new THREE.Mesh(new THREE.BoxGeometry(1.5, .16, .7), new THREE.MeshLambertMaterial({ color: 0x2a7fd4 }));
        awning.position.set(e.x, 1.95, e.y - .2);
        this.scene.add(awning);
      }
      if (e.kind === 'exit' && !map.indoor) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(.55, .09, 6, 12, Math.PI),
          new THREE.MeshLambertMaterial({ color: 0xf0e6c8 }));
        m.position.set(e.x, .05, e.y);
        m.rotation.set(0, e.dir === 'e' || e.dir === 'w' ? Math.PI / 2 : 0, 0);
        this.scene.add(m);
      }
    }
  }

  private buildActors(map: GameMap) {
    this.actors = [];
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
        case 'static': rig = null; break;
        case 'item': {
          const ball = new THREE.Group();
          const top = new THREE.Mesh(new THREE.SphereGeometry(.26, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe8434e }));
          const bot = new THREE.Mesh(new THREE.SphereGeometry(.26, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf2f5fa }));
          ball.add(top, bot);
          ball.position.set(e.x, .34, e.y);
          this.scene.add(ball);
          this.actors.push({ ent: e, rig: { group: ball, bob: [ball], limbs: [], height: .5 } });
          continue;
        }
        case 'sign': {
          const post = new THREE.Group();
          post.add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .7, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2f })));
          const board = new THREE.Mesh(new THREE.BoxGeometry(.8, .5, .1), new THREE.MeshLambertMaterial({ color: 0xc9a97a }));
          board.position.y = .55; post.add(board);
          post.position.set(e.x, .35, e.y);
          this.scene.add(post);
          this.actors.push({ ent: e, rig: { group: post, bob: [], limbs: [], height: .9 } });
          continue;
        }
        case 'pc': {
          const pc = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.1, .6), new THREE.MeshLambertMaterial({ color: 0x35507a }));
          pc.position.set(e.x, .55, e.y);
          this.scene.add(pc);
          this.actors.push({ ent: e, rig: { group: pc, bob: [], limbs: [], height: 1.1 } });
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

  /* ---------------- boucle ---------------- */
  update(dt: number, dir: { x: number; y: number }, run: boolean, cam: THREE.PerspectiveCamera) {
    if (!this.loaded) return;
    this.clock += dt;
    const t = this.clock;

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
            this.fromX + (this.toX - this.fromX) * k, Math.sin(k * Math.PI) * .04,
            this.fromY + (this.toY - this.fromY) * k,
          );
        }
      } else if (Math.abs(dir.x) > .3 || Math.abs(dir.y) > .3) {
        const f = Math.abs(dir.x) > Math.abs(dir.y) ? (dir.x < 0 ? 1 : 3) : (dir.y < 0 ? 2 : 0);
        if (f !== this.facing) { this.setFacing(f); }
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
      else if (a.ent.kind === 'item') { a.rig.group.rotation.y = t * 1.4; a.rig.group.position.y = .34 + Math.sin(t * 2) * .07; }
    }
    for (const w of this.water) w.position.y = Math.sin(t * 1.6) * .045;
    if (this.grassTuft) this.grassTuft.rotation.z = Math.sin(t * 1.1) * .012;

    // caméra suiveuse
    const p = this.player.group.position;
    this.camTarget.lerp(new THREE.Vector3(p.x, 0, p.z), 1 - Math.pow(.001, dt));
    const dist = this.map.indoor ? 7.4 : 9.2;
    const hgt = this.map.indoor ? 7.2 : 8.6;
    cam.position.set(this.camTarget.x, hgt, this.camTarget.z + dist);
    cam.lookAt(this.camTarget.x, .8, this.camTarget.z - 1.2);
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
}

export function faceAngle(f: number): number {
  return [0, Math.PI / 2, Math.PI, -Math.PI / 2][f] ?? 0;
}

export function entKey(map: GameMap, e: Ent): string {
  const id = 'id' in e ? (e as { id: string }).id : `${e.kind}@${e.x},${e.y}`;
  return `${map.id}|${id}`;
}
