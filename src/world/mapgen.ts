import { RNG, hashStr } from '../engine/rng';
import { TYPE_COLOR } from '../data/types';

/** Convertit une couleur CSS hexadécimale en entier (évite d'importer Three ici). */
const hexToInt = (hex: string) => parseInt(hex.slice(1), 16);
import { ZONE, GYM, GYM_BY_TOWN, LEAGUE, FINAL_BOSS, TRAINER_CLASSES, type Dir, type ZoneDef, type Link } from '../data/world';

/* --- codes de tuiles --- */
export const T = {
  SOL: 0, HERBE: 1, EAU: 2, OBSTACLE: 3, CHEMIN: 4,
  MUR: 5, PORTE: 6, SABLE: 7, FLEUR: 8, SORTIE: 9,
  TAPIS: 10, COMPTOIR: 11,
} as const;

export const WALKABLE = new Set<number>([T.SOL, T.HERBE, T.CHEMIN, T.SABLE, T.FLEUR, T.SORTIE, T.TAPIS, T.PORTE]);

export type Ent =
  | { kind: 'exit'; x: number; y: number; dir: Dir; to: string; link: Link }
  | { kind: 'door'; x: number; y: number; to: string; label: string }
  | { kind: 'npc'; x: number; y: number; id: string; name: string; lines: string[]; color: number; face: number }
  | { kind: 'trainer'; x: number; y: number; id: string; cls: string; name: string; team: [string, number][]; face: number; sight: number; money: number; taunt: string; beaten: string }
  | { kind: 'leader'; x: number; y: number; gymId: string }
  | { kind: 'boss'; x: number; y: number; bossId: string; face: number }
  | { kind: 'item'; x: number; y: number; id: string; itemId: string }
  | { kind: 'sign'; x: number; y: number; text: string }
  | { kind: 'heal'; x: number; y: number }
  | { kind: 'shop'; x: number; y: number; stock: string[] }
  | { kind: 'pc'; x: number; y: number }
  | { kind: 'static'; x: number; y: number; id: string; sp: string; lv: number; flag: string; text: string };

export interface GameMap {
  id: string;
  /** Teinte dominante d'un intérieur (type de l'Arène, rose des Centres…). */
  accent?: number;
  name: string;
  w: number;
  h: number;
  tiles: Uint8Array;
  ents: Ent[];
  biome: string;
  indoor: boolean;
  zoneId: string;         // zone « logique » (pour les rencontres)
  spawns: Record<string, [number, number]>;
  music: string;
}

const FIRST_NAMES = ['Léo', 'Maya', 'Tom', 'Iris', 'Noah', 'Elsa', 'Hugo', 'Zoé', 'Lina', 'Marc', 'Anaïs', 'Yuri', 'Bran', 'Célia', 'Rémi', 'Sacha', 'Nour', 'Kim'];

/* ============================================================ */
class Grid {
  w: number; h: number; t: Uint8Array;
  constructor(w: number, h: number, fill: number) {
    this.w = w; this.h = h;
    this.t = new Uint8Array(w * h).fill(fill);
  }
  idx(x: number, y: number) { return y * this.w + x; }
  in(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x: number, y: number) { return this.in(x, y) ? this.t[this.idx(x, y)] : T.OBSTACLE; }
  set(x: number, y: number, v: number) { if (this.in(x, y)) this.t[this.idx(x, y)] = v; }
  rect(x: number, y: number, w: number, h: number, v: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, v);
  }
  disc(cx: number, cy: number, r: number, v: number, skip?: (t: number) => boolean) {
    for (let j = Math.floor(cy - r); j <= cy + r; j++)
      for (let i = Math.floor(cx - r); i <= cx + r; i++)
        if (Math.hypot(i - cx, j - cy) <= r && this.in(i, j) && !(skip?.(this.get(i, j)))) this.set(i, j, v);
  }
}

/** Assure l'accessibilité d'une case en creusant un couloir en L depuis une origine. */
function carveTo(g: Grid, from: [number, number], to: [number, number], tile = T.CHEMIN) {
  let [x, y] = from;
  const [tx, ty] = to;
  while (x !== tx) { if (!WALKABLE.has(g.get(x, y))) g.set(x, y, tile); x += Math.sign(tx - x); }
  while (y !== ty) { if (!WALKABLE.has(g.get(x, y))) g.set(x, y, tile); y += Math.sign(ty - y); }
}

function reachable(g: Grid, start: [number, number]): Uint8Array {
  const seen = new Uint8Array(g.w * g.h);
  const stack = [start];
  seen[g.idx(start[0], start[1])] = 1;
  while (stack.length) {
    const [x, y] = stack.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (!g.in(nx, ny) || seen[g.idx(nx, ny)] || !WALKABLE.has(g.get(nx, ny))) continue;
      seen[g.idx(nx, ny)] = 1;
      stack.push([nx, ny]);
    }
  }
  return seen;
}

/** Garantit que toutes les positions clés sont atteignables depuis la première. */
function ensureConnected(g: Grid, points: [number, number][]) {
  if (!points.length) return;
  const root = points[0];
  for (let pass = 0; pass < 4; pass++) {
    const seen = reachable(g, root);
    let fixed = false;
    for (const p of points) {
      if (!seen[g.idx(p[0], p[1])]) { carveTo(g, root, p); fixed = true; }
    }
    if (!fixed) break;
  }
}

/* ============================================================
   EXTÉRIEURS
   ============================================================ */
const EDGE: Record<Dir, (w: number, h: number) => [number, number]> = {
  n: (w) => [Math.floor(w / 2), 0],
  s: (w, h) => [Math.floor(w / 2), h - 1],
  w: (_w, h) => [0, Math.floor(h / 2)],
  e: (w, h) => [w - 1, Math.floor(h / 2)],
};
const INWARD: Record<Dir, [number, number]> = { n: [0, 1], s: [0, -1], w: [1, 0], e: [-1, 0] };
export const OPPOSITE: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' };

function borderTile(biome: string): number {
  return biome === 'plage' ? T.EAU : T.OBSTACLE;
}

function genOutdoor(z: ZoneDef): GameMap {
  const rng = new RNG(z.seed * 7919 + 13);
  const g = new Grid(z.w, z.h, T.SOL);
  const ents: Ent[] = [];
  const spawns: Record<string, [number, number]> = {};
  const isTown = z.kind === 'town' || z.kind === 'special';

  // Bordure infranchissable (2 tuiles) + décor de biome
  const bt = borderTile(z.biome);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    if (x < 2 || y < 2 || x >= z.w - 2 || y >= z.h - 2) g.set(x, y, bt);
  }
  if (z.biome === 'desert' || z.biome === 'plage') {
    for (let y = 2; y < z.h - 2; y++) for (let x = 2; x < z.w - 2; x++) if (rng.chance(.6)) g.set(x, y, T.SABLE);
  }

  // Sorties de zone
  const exits: { dir: Dir; pos: [number, number]; link: Link }[] = [];
  for (const dir of ['n', 's', 'e', 'w'] as Dir[]) {
    const link = z.links[dir];
    if (!link) continue;
    const [ex, ey] = EDGE[dir](z.w, z.h);
    const [ix, iy] = INWARD[dir];
    for (let k = 0; k < 3; k++) g.set(ex + ix * k, ey + iy * k, k === 0 ? T.SORTIE : T.CHEMIN);
    g.set(ex + (dir === 'n' || dir === 's' ? 1 : 0), ey + (dir === 'e' || dir === 'w' ? 1 : 0), dir === 'n' || dir === 's' ? T.SORTIE : T.SORTIE);
    exits.push({ dir, pos: [ex, ey], link });
    ents.push({ kind: 'exit', x: ex, y: ey, dir, to: link.to, link });
    ents.push({ kind: 'exit', x: ex + (dir === 'n' || dir === 's' ? 1 : 0), y: ey + (dir === 'e' || dir === 'w' ? 1 : 0), dir, to: link.to, link });
    spawns['from:' + link.to] = [ex + ix * 2, ey + iy * 2];
  }

  const center: [number, number] = [Math.floor(z.w / 2), Math.floor(z.h / 2)];
  spawns['default'] = center;

  // Chemins reliant les sorties au centre
  for (const ex of exits) {
    let [x, y] = [ex.pos[0] + INWARD[ex.dir][0] * 2, ex.pos[1] + INWARD[ex.dir][1] * 2];
    const [tx, ty] = center;
    let guard = 0;
    while ((x !== tx || y !== ty) && guard++ < 600) {
      g.set(x, y, T.CHEMIN);
      g.set(x + 1, y, T.CHEMIN);
      const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
      if (dx && (!dy || rng.chance(.5))) x += dx; else if (dy) y += dy;
    }
  }
  g.rect(center[0] - 2, center[1] - 2, 5, 5, T.CHEMIN);

  const keyPoints: [number, number][] = [center];
  for (const ex of exits) keyPoints.push([ex.pos[0] + INWARD[ex.dir][0] * 2, ex.pos[1] + INWARD[ex.dir][1] * 2]);

  if (isTown) {
    /* ---- Ville : bâtiments ---- */
    const bld: { label: string; to: string }[] = [];
    if (z.center) bld.push({ label: 'Centre de Soins', to: `in:${z.id}:center` });
    if (z.shop) bld.push({ label: 'Boutique', to: `in:${z.id}:shop` });
    const gym = GYM_BY_TOWN[z.id];
    if (gym) bld.push({ label: gym.name, to: `gym:${gym.id}` });
    (z.houses ?? []).forEach((h, i) => bld.push({ label: h.name, to: `in:${z.id}:house${i}` }));
    if (z.id === 'plateau-ligue') bld.push({ label: 'Ligue de Valmore', to: 'league:0' });

    const bw = 5, bh = 4;
    // On réduit le nombre de colonnes jusqu'à obtenir un vrai espace entre les façades.
    let cols = Math.min(3, Math.max(1, bld.length));
    while (cols > 1 && Math.floor((z.w - 4 - cols * bw) / (cols + 1)) < 2) cols--;
    const gapX = Math.max(2, Math.floor((z.w - 4 - cols * bw) / (cols + 1)));
    const stepY = bh + 5;
    bld.forEach((b, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const bx = 2 + gapX + col * (bw + gapX);
      const by = 3 + row * stepY;
      if (by + bh + 2 >= z.h - 2 || bx + bw >= z.w - 2) return;
      g.rect(bx, by, bw, bh, T.MUR);
      const dx = bx + Math.floor(bw / 2), dy = by + bh - 1;
      g.set(dx, dy, T.PORTE);
      g.rect(bx - 1, by + bh, bw + 2, 2, T.CHEMIN);
      carveTo(g, center, [dx, dy + 1]);
      ents.push({ kind: 'door', x: dx, y: dy, to: b.to, label: b.label });
      keyPoints.push([dx, dy + 1]);
    });

    // Décor : quelques arbres + parterres
    for (let k = 0; k < z.w * z.h * .03; k++) {
      const x = rng.range(3, z.w - 4), y = rng.range(3, z.h - 4);
      if (g.get(x, y) === T.SOL || g.get(x, y) === T.SABLE) g.set(x, y, rng.chance(.55) ? T.OBSTACLE : T.FLEUR);
    }
    (z.signs ?? []).forEach((txt, i) => {
      const x = center[0] - 3 + i * 2, y = center[1] + 3;
      if (g.in(x, y)) { g.set(x, y, T.SOL); ents.push({ kind: 'sign', x, y, text: txt }); }
    });
    // Badauds
    const nNpc = 2 + rng.int(2);
    for (let i = 0; i < nNpc; i++) {
      const p = freeSpot(g, rng, ents);
      if (!p) break;
      ents.push({
        kind: 'npc', x: p[0], y: p[1], id: `${z.id}-npc${i}`, name: rng.pick(FIRST_NAMES),
        lines: [rng.pick(TOWN_TALK)], color: rng.int(0xffffff), face: rng.int(4),
      });
    }
  } else {
    /* ---- Route : herbes hautes, obstacles, eau ---- */
    const patches = 4 + rng.int(4);
    for (let i = 0; i < patches; i++) {
      const cx = rng.range(4, z.w - 5), cy = rng.range(4, z.h - 5);
      const r = 2 + rng.int(3);
      g.disc(cx, cy, r, T.HERBE, (t) => t === T.CHEMIN || t === T.SORTIE || t === T.OBSTACLE);
    }
    for (let k = 0; k < z.w * z.h * .1; k++) {
      const x = rng.range(2, z.w - 3), y = rng.range(2, z.h - 3);
      const t = g.get(x, y);
      if (t === T.SOL || t === T.SABLE) g.set(x, y, rng.chance(.7) ? T.OBSTACLE : T.FLEUR);
    }
    if (z.biome === 'plage' || z.biome === 'marais' || rng.chance(.35)) {
      const cx = rng.range(5, z.w - 6), cy = rng.range(5, z.h - 6);
      g.disc(cx, cy, 2 + rng.int(3), T.EAU, (t) => t === T.CHEMIN || t === T.SORTIE);
    }
    (z.signs ?? []).forEach((txt, i) => {
      const p = nearPath(g, rng);
      if (p) ents.push({ kind: 'sign', x: p[0], y: p[1] + i, text: txt });
    });
  }

  /* ---- Dresseurs ---- */
  const nT = z.trainers ?? 0;
  const pool = (z.enc ?? []).map((x) => x.sp);
  for (let i = 0; i < nT; i++) {
    const p = freeSpot(g, rng, ents);
    if (!p || !pool.length) break;
    const lv = (z.trainerLv ?? 5) + rng.range(-2, 1);
    const size = lv < 15 ? 1 + rng.int(2) : lv < 35 ? 2 + rng.int(2) : 3 + rng.int(2);
    const team: [string, number][] = [];
    for (let k = 0; k < size; k++) team.push([rng.pick(pool), Math.max(2, lv - (size - 1 - k))]);
    const cls = rng.pick(TRAINER_CLASSES);
    ents.push({
      kind: 'trainer', x: p[0], y: p[1], id: `${z.id}-t${i}`, cls, name: rng.pick(FIRST_NAMES),
      team, face: rng.int(4), sight: 3 + rng.int(2), money: lv * 28,
      taunt: rng.pick(TAUNTS), beaten: rng.pick(BEATEN),
    });
  }

  /* ---- Objets au sol ---- */
  (z.items ?? []).forEach((it, i) => {
    const p = freeSpot(g, rng, ents);
    if (p) ents.push({ kind: 'item', x: p[0], y: p[1], id: `${z.id}-i${i}`, itemId: it });
  });

  for (const e of ents) if (e.kind !== 'exit' && e.kind !== 'door') keyPoints.push([e.x, e.y]);
  ensureConnected(g, keyPoints);

  return {
    id: z.id, name: z.name, w: z.w, h: z.h, tiles: g.t, ents, biome: z.biome,
    indoor: false, zoneId: z.id, spawns, music: z.biome,
  };
}

const TOWN_TALK = [
  'Les créatures d’ici adorent les hautes herbes. Fais attention.',
  'Le Centre de Soins remet ton équipe à neuf, gratuitement !',
  'On dit qu’une créature légendaire dort quelque part par là…',
  'Un bon dresseur connaît la table des types par cœur.',
  'Tu as essayé de changer de créature en plein combat ? Ça sauve des vies.',
  'Les Sphères marchent mieux quand la cible est affaiblie ou endormie.',
];
const TAUNTS = [
  'Toi ! Tu as l’air d’avoir de bonnes créatures. On se bat !',
  'Personne ne traverse ici sans me combattre !',
  'J’ai vu ton équipe. Je peux faire mieux.',
  'Un petit duel, ça te dit ? Trop tard, c’est parti !',
];
const BEATEN = [
  'Pas mal du tout… je vais m’entraîner.',
  'Comment ? J’étais sûr de gagner !',
  'Tu mérites ta place sur cette route.',
  'La prochaine fois, je serai prêt.',
];

/* ============================================================
   GROTTES
   ============================================================ */
function genCave(z: ZoneDef): GameMap {
  const rng = new RNG(z.seed * 6131 + 7);
  const g = new Grid(z.w, z.h, T.OBSTACLE);
  for (let y = 2; y < z.h - 2; y++) for (let x = 2; x < z.w - 2; x++) g.set(x, y, rng.chance(.44) ? T.OBSTACLE : T.SOL);
  for (let it = 0; it < 4; it++) {
    const copy = g.t.slice();
    for (let y = 2; y < z.h - 2; y++) for (let x = 2; x < z.w - 2; x++) {
      let n = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++)
        if (i || j) n += copy[g.idx(Math.max(0, Math.min(z.w - 1, x + i)), Math.max(0, Math.min(z.h - 1, y + j)))] === T.OBSTACLE ? 1 : 0;
      g.set(x, y, n >= 5 ? T.OBSTACLE : T.SOL);
    }
  }

  const ents: Ent[] = [];
  const spawns: Record<string, [number, number]> = {};
  const keyPoints: [number, number][] = [];
  for (const dir of ['n', 's', 'e', 'w'] as Dir[]) {
    const link = z.links[dir];
    if (!link) continue;
    const [ex, ey] = EDGE[dir](z.w, z.h);
    const [ix, iy] = INWARD[dir];
    for (let k = 0; k < 4; k++) g.set(ex + ix * k, ey + iy * k, k === 0 ? T.SORTIE : T.SOL);
    ents.push({ kind: 'exit', x: ex, y: ey, dir, to: link.to, link });
    spawns['from:' + link.to] = [ex + ix * 2, ey + iy * 2];
    keyPoints.push([ex + ix * 2, ey + iy * 2]);
  }
  if (!keyPoints.length) keyPoints.push([Math.floor(z.w / 2), Math.floor(z.h / 2)]);
  spawns['default'] = keyPoints[0];
  ensureConnected(g, keyPoints);

  // Herbes hautes remplacées par un semis de zones de rencontre
  for (let k = 0; k < z.w * z.h * .12; k++) {
    const x = rng.range(3, z.w - 4), y = rng.range(3, z.h - 4);
    if (g.get(x, y) === T.SOL) g.set(x, y, T.HERBE);
  }

  const pool = (z.enc ?? []).map((x) => x.sp);
  for (let i = 0; i < (z.trainers ?? 0); i++) {
    const p = freeSpot(g, rng, ents);
    if (!p || !pool.length) break;
    const lv = (z.trainerLv ?? 10) + rng.range(-2, 1);
    const team: [string, number][] = [];
    const size = 2 + rng.int(2);
    for (let k = 0; k < size; k++) team.push([rng.pick(pool), Math.max(2, lv - (size - 1 - k))]);
    ents.push({
      kind: 'trainer', x: p[0], y: p[1], id: `${z.id}-t${i}`, cls: rng.pick(['Montagnard', 'Spéléologue', 'Ermite']),
      name: rng.pick(FIRST_NAMES), team, face: rng.int(4), sight: 3, money: lv * 30,
      taunt: rng.pick(TAUNTS), beaten: rng.pick(BEATEN),
    });
  }
  (z.items ?? []).forEach((it, i) => {
    const p = freeSpot(g, rng, ents);
    if (p) ents.push({ kind: 'item', x: p[0], y: p[1], id: `${z.id}-i${i}`, itemId: it });
  });
  for (const e of ents) if (e.kind !== 'exit') keyPoints.push([e.x, e.y]);
  ensureConnected(g, keyPoints);

  return { id: z.id, name: z.name, w: z.w, h: z.h, tiles: g.t, ents, biome: 'grotte', indoor: true, zoneId: z.id, spawns, music: 'grotte' };
}

/* ============================================================
   INTÉRIEURS
   ============================================================ */
function room(w: number, h: number, floor = T.TAPIS): { g: Grid; door: [number, number] } {
  const g = new Grid(w, h, floor);
  for (let x = 0; x < w; x++) { g.set(x, 0, T.MUR); g.set(x, 1, T.MUR); g.set(x, h - 1, T.MUR); }
  for (let y = 0; y < h; y++) { g.set(0, y, T.MUR); g.set(w - 1, y, T.MUR); }
  const door: [number, number] = [Math.floor(w / 2), h - 1];
  g.set(door[0], door[1], T.PORTE);
  return { g, door };
}

function genCenter(zoneId: string, name: string): GameMap {
  const { g, door } = room(13, 11);
  const ents: Ent[] = [
    { kind: 'exit', x: door[0], y: door[1], dir: 's', to: zoneId, link: { to: zoneId } },
    { kind: 'heal', x: 6, y: 3 },
    { kind: 'pc', x: 10, y: 3 },
    { kind: 'npc', x: 3, y: 6, id: 'c-npc', name: 'Voyageuse', lines: ['Le comptoir soigne toute ton équipe. Et le PC range tes créatures en trop.'], color: 0x8fd0ff, face: 2 },
  ];
  g.rect(5, 2, 4, 1, T.COMPTOIR);
  g.rect(9, 2, 3, 1, T.COMPTOIR);
  return { id: `in:${zoneId}:center`, name: `${name} — Centre de Soins`, accent: 0xff8fb0, w: 13, h: 11, tiles: g.t, ents, biome: 'interieur', indoor: true, zoneId, spawns: { default: [door[0], door[1] - 1] }, music: 'ville' };
}

function genShop(zoneId: string, name: string, stock: string[]): GameMap {
  const { g, door } = room(13, 11);
  g.rect(4, 3, 6, 1, T.COMPTOIR);
  const ents: Ent[] = [
    { kind: 'exit', x: door[0], y: door[1], dir: 's', to: zoneId, link: { to: zoneId } },
    { kind: 'shop', x: 6, y: 2, stock },
    { kind: 'npc', x: 10, y: 7, id: 's-npc', name: 'Client', lines: ['Les Sphères, c’est comme les Potions : on n’en a jamais assez.'], color: 0xffd166, face: 3 },
  ];
  return { id: `in:${zoneId}:shop`, name: `${name} — Boutique`, accent: 0x4fb0e0, w: 13, h: 11, tiles: g.t, ents, biome: 'interieur', indoor: true, zoneId, spawns: { default: [door[0], door[1] - 1] }, music: 'ville' };
}

function genHouse(zoneId: string, idx: number, label: string, lines: string[]): GameMap {
  const { g, door } = room(11, 9);
  const ents: Ent[] = [
    { kind: 'exit', x: door[0], y: door[1], dir: 's', to: zoneId, link: { to: zoneId } },
    { kind: 'npc', x: 5, y: 3, id: `${zoneId}-h${idx}`, name: label, lines, color: 0xff9f6e, face: 2 },
  ];
  return { id: `in:${zoneId}:house${idx}`, name: label, accent: 0xd8a24f, w: 11, h: 9, tiles: g.t, ents, biome: 'interieur', indoor: true, zoneId, spawns: { default: [door[0], door[1] - 1] }, music: 'ville' };
}

function genGym(gymId: string): GameMap {
  const gym = GYM[gymId];
  const rng = new RNG(hashStr(gymId) + 991);
  const w = 13, h = 19;
  const { g, door } = room(w, h, T.TAPIS);
  const ents: Ent[] = [
    { kind: 'exit', x: door[0], y: door[1], dir: 's', to: gym.town, link: { to: gym.town } },
    { kind: 'leader', x: 6, y: 3, gymId },
  ];
  // Obstacles décoratifs en damier
  for (let y = 6; y < h - 3; y += 3) {
    for (let x = 2; x < w - 2; x++) {
      if (rng.chance(.35) && x !== 6) g.set(x, y, T.MUR);
    }
  }
  const spots: [number, number][] = [[3, 8], [9, 8], [3, 13], [9, 13], [6, 11], [3, 5], [9, 5]];
  for (let i = 0; i < gym.trainers; i++) {
    const [x, y] = spots[i % spots.length];
    g.set(x, y, T.TAPIS);
    const lv = gym.trainerLv + rng.range(-1, 1);
    const team: [string, number][] = [];
    const size = 1 + rng.int(2) + (gym.order > 8 ? 1 : 0);
    const pool = gym.team.map((t) => t[0]);
    for (let k = 0; k < size; k++) team.push([rng.pick(pool), Math.max(2, lv - (size - 1 - k))]);
    ents.push({
      kind: 'trainer', x, y, id: `${gymId}-t${i}`, cls: 'Élève d’Arène', name: rng.pick(FIRST_NAMES),
      team, face: 2, sight: 4, money: lv * 40,
      taunt: `Tu veux voir ${gym.leader} ? Passe-moi sur le corps !`,
      beaten: `Bien joué… ${gym.leader} t’attend au fond.`,
    });
  }
  ents.push({ kind: 'sign', x: 4, y: h - 3, text: `${gym.name}\nChampion : ${gym.leader}\nSpécialité : ${gym.type}` });
  const key: [number, number][] = [[door[0], door[1] - 1], [6, 4], ...ents.filter((e) => e.kind === 'trainer').map((e) => [e.x, e.y] as [number, number])];
  ensureConnected(g, key);
  return { id: `gym:${gymId}`, name: gym.name, accent: hexToInt(TYPE_COLOR[gym.type]), w, h, tiles: g.t, ents, biome: 'interieur', indoor: true, zoneId: gym.town, spawns: { default: [door[0], door[1] - 1] }, music: 'arene' };
}

function genLeagueRoom(index: number): GameMap {
  const boss = LEAGUE[index];
  const w = 13, h = 15;
  const { g, door } = room(w, h, T.TAPIS);
  const back = index === 0 ? 'plateau-ligue' : `league:${index - 1}`;
  const ents: Ent[] = [
    { kind: 'exit', x: door[0], y: door[1], dir: 's', to: back, link: { to: back } },
    { kind: 'boss', x: 6, y: 3, bossId: boss.id, face: 2 },
  ];
  if (index < LEAGUE.length - 1) {
    g.set(6, 1, T.SORTIE); g.set(6, 2, T.TAPIS);
    ents.push({
      kind: 'exit', x: 6, y: 1, dir: 'n', to: `league:${index + 1}`,
      link: { to: `league:${index + 1}`, needFlag: `boss_${boss.id}`, block: 'La porte reste close. Il faut d’abord vaincre ce membre du Conseil.' },
    });
  }
  return {
    id: `league:${index}`, name: `${boss.title} — ${boss.name}`, w, h, tiles: g.t, ents,
    biome: 'interieur', indoor: true, zoneId: 'plateau-ligue',
    spawns: { default: [door[0], door[1] - 1], [`from:${back}`]: [door[0], door[1] - 1] }, music: 'arene',
  };
}

function genSummit(z: ZoneDef): GameMap {
  const g = new Grid(z.w, z.h, T.SOL);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++)
    if (x < 2 || y < 2 || x >= z.w - 2 || y >= z.h - 2) g.set(x, y, T.OBSTACLE);
  const [ex, ey] = EDGE.s(z.w, z.h);
  g.set(ex, ey, T.SORTIE);
  g.set(ex, ey - 1, T.CHEMIN);
  const link = z.links.s!;
  const ents: Ent[] = [
    { kind: 'exit', x: ex, y: ey, dir: 's', to: link.to, link },
    { kind: 'boss', x: Math.floor(z.w / 2), y: 5, bossId: FINAL_BOSS.id, face: 2 },
    { kind: 'sign', x: Math.floor(z.w / 2) - 3, y: 8, text: 'Ici s’arrête le sentier.\nCelui qui attend au sommet n’a jamais dit un mot.' },
  ];
  for (let x = 3; x < z.w - 3; x++) for (let y = 3; y < z.h - 3; y++) if ((x * 3 + y * 5) % 13 === 0) g.set(x, y, T.OBSTACLE);
  carveTo(g, [ex, ey - 1], [Math.floor(z.w / 2), 6]);
  return { id: z.id, name: z.name, w: z.w, h: z.h, tiles: g.t, ents, biome: 'sommet', indoor: false, zoneId: z.id, spawns: { default: [ex, ey - 1], [`from:${link.to}`]: [ex, ey - 1] }, music: 'boss' };
}

/* ============================================================ */
function freeSpot(g: Grid, rng: RNG, ents: Ent[]): [number, number] | null {
  for (let tries = 0; tries < 400; tries++) {
    const x = rng.range(3, g.w - 4), y = rng.range(3, g.h - 4);
    const t = g.get(x, y);
    if (t !== T.SOL && t !== T.CHEMIN && t !== T.SABLE && t !== T.TAPIS) continue;
    if (ents.some((e) => e.x === x && e.y === y)) continue;
    if (ents.some((e) => Math.abs(e.x - x) + Math.abs(e.y - y) < 3)) continue;
    return [x, y];
  }
  return null;
}

function nearPath(g: Grid, rng: RNG): [number, number] | null {
  for (let t = 0; t < 300; t++) {
    const x = rng.range(3, g.w - 4), y = rng.range(3, g.h - 4);
    if (g.get(x, y) === T.SOL && g.get(x, y + 1) === T.CHEMIN) return [x, y];
  }
  return null;
}

/* ============================================================
   POINT D'ENTRÉE
   ============================================================ */
const cache = new Map<string, GameMap>();

export function getMap(id: string): GameMap {
  const hit = cache.get(id);
  if (hit) return hit;
  const m = buildMap(id);
  cache.set(id, m);
  return m;
}

export function clearMapCache() { cache.clear(); }

function buildMap(id: string): GameMap {
  if (id.startsWith('gym:')) return genGym(id.slice(4));
  if (id.startsWith('league:')) return genLeagueRoom(Number(id.slice(7)));
  if (id.startsWith('in:')) {
    const [, zoneId, what] = id.split(':');
    const z = ZONE[zoneId];
    if (!z) throw new Error('Zone inconnue: ' + zoneId);
    if (what === 'center') return genCenter(zoneId, z.name);
    if (what === 'shop') return genShop(zoneId, z.name, z.shop ?? []);
    const idx = Number(what.replace('house', ''));
    const h = (z.houses ?? [])[idx];
    return genHouse(zoneId, idx, h?.name ?? 'Maison', h?.lines ?? ['…']);
  }
  const z = ZONE[id];
  if (!z) throw new Error('Zone inconnue: ' + id);
  if (id === 'sommet-cendre') return genSummit(z);
  if (z.kind === 'cave') return genCave(z);
  return genOutdoor(z);
}
