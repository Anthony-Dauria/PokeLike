import type { Mon } from './mon';
import { createMon, healFull, nextUid, resetUid } from './mon';
import { GYMS, START_ZONE } from '../data/world';

export interface SaveData {
  version: number;
  name: string;
  money: number;
  playTime: number;
  starter: string;
  party: Mon[];
  box: Mon[];
  bag: Record<string, number>;
  badges: string[];
  flags: Record<string, boolean>;
  seen: string[];
  caught: string[];
  zone: string;
  x: number;
  y: number;
  facing: number;
  lastCenter: string;
  repel: number;
  steps: number;
  uid: number;
  muted: boolean;
  quality?: 'haut' | 'leger';
}

export const SAVE_KEY = 'pokelike.save.v1';
export const SAVE_VERSION = 1;

export class GameState {
  name = 'Sacha';
  money = 3000;
  playTime = 0;
  starter = '';
  party: Mon[] = [];
  box: Mon[] = [];
  bag: Record<string, number> = {};
  badges: string[] = [];
  flags: Record<string, boolean> = {};
  seen = new Set<string>();
  caught = new Set<string>();
  zone = START_ZONE;
  x = 0;
  y = 0;
  facing = 0;
  lastCenter = START_ZONE;
  repel = 0;
  steps = 0;
  muted = false;
  quality: 'haut' | 'leger' = 'haut';

  /* ---------- badges ---------- */
  hasBadge(id: string) { return this.badges.includes(id); }
  get badgeCount() { return this.badges.length; }
  get badgeCountRegion1() { return this.badges.filter((b) => (GYMS.find((g) => g.id === b)?.order ?? 99) <= 8).length; }
  giveBadge(id: string) { if (!this.badges.includes(id)) this.badges.push(id); }

  /* ---------- drapeaux ---------- */
  flag(id: string) { return !!this.flags[id]; }
  setFlag(id: string, v = true) { this.flags[id] = v; }

  /* ---------- sac ---------- */
  addItem(id: string, n = 1) { this.bag[id] = (this.bag[id] ?? 0) + n; }
  removeItem(id: string, n = 1) {
    const have = this.bag[id] ?? 0;
    if (have <= n) delete this.bag[id]; else this.bag[id] = have - n;
  }
  countItem(id: string) { return this.bag[id] ?? 0; }
  hasItem(id: string) { return (this.bag[id] ?? 0) > 0; }

  /* ---------- équipe ---------- */
  get healthyParty() { return this.party.filter((m) => m.hp > 0); }
  get wiped() { return this.party.length > 0 && this.healthyParty.length === 0; }
  healParty() { for (const m of this.party) healFull(m); }

  addMon(m: Mon): 'party' | 'box' {
    this.caught.add(m.sp);
    this.seen.add(m.sp);
    if (this.party.length < 6) { this.party.push(m); return 'party'; }
    this.box.push(m); return 'box';
  }

  see(sp: string) { this.seen.add(sp); }

  /* ---------- sérialisation ---------- */
  toJSON(): SaveData {
    return {
      version: SAVE_VERSION, name: this.name, money: this.money, playTime: Math.round(this.playTime),
      starter: this.starter, party: this.party, box: this.box, bag: this.bag, badges: this.badges,
      flags: this.flags, seen: [...this.seen], caught: [...this.caught],
      zone: this.zone, x: this.x, y: this.y, facing: this.facing, lastCenter: this.lastCenter,
      repel: this.repel, steps: this.steps, uid: nextUid(), muted: this.muted, quality: this.quality,
    };
  }

  load(d: SaveData) {
    this.name = d.name; this.money = d.money; this.playTime = d.playTime; this.starter = d.starter;
    this.party = d.party; this.box = d.box ?? []; this.bag = d.bag ?? {}; this.badges = d.badges ?? [];
    this.flags = d.flags ?? {}; this.seen = new Set(d.seen ?? []); this.caught = new Set(d.caught ?? []);
    this.zone = d.zone; this.x = d.x; this.y = d.y; this.facing = d.facing ?? 0;
    this.lastCenter = d.lastCenter ?? START_ZONE; this.repel = d.repel ?? 0; this.steps = d.steps ?? 0;
    this.muted = !!d.muted;
    this.quality = d.quality === 'leger' ? 'leger' : 'haut';
    resetUid(Math.max(d.uid ?? 1, ...this.party.map((m) => m.uid + 1), ...this.box.map((m) => m.uid + 1), 1));
  }

  reset(name: string) {
    resetUid(1);
    this.name = name; this.money = 3000; this.playTime = 0; this.starter = '';
    this.party = []; this.box = []; this.badges = []; this.flags = {};
    this.seen = new Set(); this.caught = new Set();
    this.bag = { ball: 5, potion: 3 };
    this.zone = START_ZONE; this.x = 0; this.y = 0; this.facing = 0;
    this.lastCenter = START_ZONE; this.repel = 0; this.steps = 0;
  }

  giveStarter(spId: string) {
    this.starter = spId;
    const m = createMon(spId, 5, { metAt: 'Bourg Aurore' });
    m.hp = 0; healFull(m);
    this.addMon(m);
  }
}

export const state = new GameState();

export function saveGame(): boolean {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.toJSON())); return true; }
  catch { return false; }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw) as SaveData;
    if (d.version !== SAVE_VERSION || !Array.isArray(d.party)) return false;
    state.load(d);
    return true;
  } catch { return false; }
}

export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignoré */ }
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `${h}h${String(m).padStart(2, '0')}`;
}
