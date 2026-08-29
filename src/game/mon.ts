import { species, type Species } from '../data/species';
import { movesAtLevel } from '../data/learnsets';
import { move, type Status, type Stat } from '../data/moves';
import type { TypeName } from '../data/types';

export interface MoveSlot { id: string; pp: number; maxPp: number }

export interface Mon {
  uid: number;
  sp: string;
  nick?: string;
  lv: number;
  xp: number;
  ivs: Record<'hp' | Stat, number>;
  nature: number;
  hp: number;
  status: Status | null;
  sleepTurns: number;
  toxCounter: number;
  moves: MoveSlot[];
  shiny: boolean;
  metAt: string;
  ballId: string;
}

export const NATURES: { name: string; up: Stat | null; down: Stat | null }[] = (() => {
  const st: Stat[] = ['atk', 'def', 'spa', 'spd', 'spe'];
  const names = [
    'Hardi', 'Solo', 'Rigide', 'Mauvais', 'Brave',
    'Assuré', 'Docile', 'Relax', 'Malin', 'Lâche',
    'Modeste', 'Doux', 'Pudique', 'Foufou', 'Discret',
    'Calme', 'Gentil', 'Prudent', 'Bizarre', 'Malpoli',
    'Timide', 'Pressé', 'Jovial', 'Naïf', 'Sérieux',
  ];
  const out: { name: string; up: Stat | null; down: Stat | null }[] = [];
  for (let i = 0; i < 25; i++) {
    const u = st[Math.floor(i / 5)], d = st[i % 5];
    out.push({ name: names[i], up: u === d ? null : u, down: u === d ? null : d });
  }
  return out;
})();

let UID = 1;
export function resetUid(n: number) { UID = n; }
export function nextUid() { return UID++; }

const rnd = (n: number) => Math.floor(Math.random() * n);

export function xpForLevel(lv: number): number { return lv ** 3; }
export function levelFromXp(xp: number): number {
  let lv = 1;
  while (lv < 100 && xp >= xpForLevel(lv + 1)) lv++;
  return lv;
}

export function createMon(spId: string, lv: number, opts: Partial<Mon> = {}): Mon {
  const iv = () => rnd(32);
  const m: Mon = {
    uid: nextUid(), sp: spId, lv, xp: xpForLevel(lv),
    ivs: { hp: iv(), atk: iv(), def: iv(), spa: iv(), spd: iv(), spe: iv(), acc: 0, eva: 0 },
    nature: rnd(25), hp: 0, status: null, sleepTurns: 0, toxCounter: 0,
    moves: movesAtLevel(spId, lv).map((id) => ({ id, pp: move(id).pp, maxPp: move(id).pp })),
    shiny: rnd(512) === 0, metAt: 'Inconnu', ballId: 'ball',
    ...opts,
  };
  m.hp = maxHp(m);
  return m;
}

export function spOf(m: Mon): Species { return species(m.sp); }
export function typesOf(m: Mon): TypeName[] { return spOf(m).types; }
export function nameOf(m: Mon): string { return m.nick || spOf(m).name; }

function statValue(m: Mon, k: Exclude<Stat, 'acc' | 'eva'> | 'hp'): number {
  const b = spOf(m).base[k];
  const iv = m.ivs[k];
  if (k === 'hp') return Math.floor(((2 * b + iv) * m.lv) / 100) + m.lv + 10;
  const raw = Math.floor(((2 * b + iv) * m.lv) / 100) + 5;
  const nat = NATURES[m.nature];
  const mult = nat.up === k ? 1.1 : nat.down === k ? 0.9 : 1;
  return Math.floor(raw * mult);
}

export function maxHp(m: Mon): number { return statValue(m, 'hp'); }
export function stat(m: Mon, k: Exclude<Stat, 'acc' | 'eva'>): number { return statValue(m, k); }
export function isFainted(m: Mon): boolean { return m.hp <= 0; }
export function healFull(m: Mon) {
  m.hp = maxHp(m); m.status = null; m.sleepTurns = 0; m.toxCounter = 0;
  for (const s of m.moves) s.pp = s.maxPp;
}

/** Gagne de l'XP, renvoie les niveaux franchis. */
export function gainXp(m: Mon, amount: number): number[] {
  if (m.lv >= 100) return [];
  const gained: number[] = [];
  m.xp += amount;
  const cap = xpForLevel(100);
  if (m.xp > cap) m.xp = cap;
  while (m.lv < 100 && m.xp >= xpForLevel(m.lv + 1)) {
    const before = maxHp(m);
    m.lv++;
    m.hp += maxHp(m) - before;
    gained.push(m.lv);
  }
  return gained;
}

export function xpProgress(m: Mon): number {
  if (m.lv >= 100) return 1;
  const a = xpForLevel(m.lv), b = xpForLevel(m.lv + 1);
  return Math.max(0, Math.min(1, (m.xp - a) / (b - a)));
}

/** XP accordée pour un adversaire vaincu. */
export function xpReward(foe: Mon, isTrainer: boolean): number {
  return Math.max(1, Math.floor((spOf(foe).xpYield * foe.lv * (isTrainer ? 1.5 : 1)) / 5));
}

export function teachMove(m: Mon, id: string, slot?: number): boolean {
  if (m.moves.some((s) => s.id === id)) return false;
  const ms: MoveSlot = { id, pp: move(id).pp, maxPp: move(id).pp };
  if (m.moves.length < 4) { m.moves.push(ms); return true; }
  if (slot === undefined) return false;
  m.moves[slot] = ms;
  return true;
}

/** Évolution éventuelle après une montée de niveau. */
export function evolutionFor(m: Mon): string | null {
  const e = spOf(m).evo;
  return e && m.lv >= e.lv ? e.to : null;
}
