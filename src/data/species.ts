import type { TypeName } from './types';
import { POKEDEX } from './pokedex.gen';

export type Shape =
  | 'quad' | 'biped' | 'serpent' | 'bird' | 'blob' | 'insect'
  | 'fish' | 'ghost' | 'golem' | 'plantoid'
  | 'bat' | 'humanoid' | 'dragon' | 'turtle';

export type Feat =
  | 'wings' | 'horn' | 'tail' | 'ears' | 'fins' | 'spikes' | 'crest' | 'aura' | 'claws' | 'shell'
  | 'bulb' | 'cheeks' | 'fangs' | 'flame' | 'mane' | 'tuft'
  // Motifs : appliqués par-dessus la silhouette pour distinguer les espèces proches.
  | 'bands' | 'dots' | 'mask' | 'rings';

/** Forme brute produite par le générateur (src/data/pokedex.gen.ts). */
export interface RawSpecies {
  dex: number;
  id: string;
  name: string;
  types: TypeName[];
  base: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  shape: Shape;
  feats: Feat[];
  scale: number;
  body?: string;
  accent?: string;
  catchRate: number;
  gen: number;
  evo?: { to: string; lv: number };
  /** Plusieurs évolutions possibles (Évoli) : le joueur choisit. */
  evoAlt?: string[];
  legend?: boolean;
  flavor: string;
  sig?: [number, string][];
}

export interface Species extends RawSpecies {
  xpYield: number;
  /** Espèce exclusive à la région, créée pour ce jeu. */
  custom?: boolean;
}

const bst = (b: RawSpecies['base']) => b.hp + b.atk + b.def + b.spa + b.spd + b.spe;

/* =========================================================
   LES 3 STARTERS EXCLUSIFS DE VALMORE
   ========================================================= */
const CUSTOM: RawSpecies[] = [
  {
    dex: 1101, id: 'brasillon', name: 'Brasillon', types: ['Feu'],
    base: { hp: 45, atk: 62, def: 48, spa: 60, spd: 48, spe: 62 },
    shape: 'quad', feats: ['tail', 'ears', 'flame'], scale: .8, body: '#e8763a', accent: '#f7d9a0',
    catchRate: 45, gen: 0, evo: { to: 'cendrailes', lv: 16 },
    sig: [[1, 'griffe'], [4, 'flammeche'], [10, 'morsure'], [14, 'crocsfeu']],
    flavor: 'La braise de sa gorge ne s’éteint jamais, même sous la pluie.',
  },
  {
    dex: 1102, id: 'cendrailes', name: 'Cendrailes', types: ['Feu'],
    base: { hp: 62, atk: 80, def: 62, spa: 80, spd: 62, spe: 85 },
    shape: 'quad', feats: ['tail', 'wings', 'claws', 'flame'], scale: 1.05, body: '#e0603a', accent: '#f2c07a',
    catchRate: 45, gen: 0, evo: { to: 'pyrodrakon', lv: 36 },
    sig: [[18, 'dansedracau'], [24, 'lanceflam'], [30, 'dracogriffe']],
    flavor: 'Ses ailes naissantes crachent des cendres brûlantes quand il s’élance.',
  },
  {
    dex: 1103, id: 'pyrodrakon', name: 'Pyrodrakon', types: ['Feu', 'Dragon'],
    base: { hp: 84, atk: 104, def: 82, spa: 108, spd: 84, spe: 98 },
    shape: 'dragon', feats: ['wings', 'horn', 'tail', 'claws', 'flame'], scale: 1.6, body: '#e0552f', accent: '#f0b45a',
    catchRate: 45, gen: 0,
    sig: [[36, 'dracochoc'], [42, 'coleredragon'], [50, 'deflagration'], [58, 'boutefeu']],
    flavor: 'Un dragon de forge dont le rugissement fait fondre la roche.',
  },
  {
    dex: 1104, id: 'ondulin', name: 'Ondulin', types: ['Eau'],
    base: { hp: 50, atk: 50, def: 52, spa: 62, spd: 58, spe: 53 },
    shape: 'fish', feats: ['fins', 'tail'], scale: .72, body: '#5fb0e0', accent: '#cfe9f7',
    catchRate: 45, gen: 0, evo: { to: 'brumaspectre', lv: 16 },
    sig: [[1, 'pistoleau'], [7, 'bulledeau'], [12, 'lechouille']],
    flavor: 'On dit que les gouttes qu’il laisse derrière lui murmurent la nuit.',
  },
  {
    dex: 1105, id: 'brumaspectre', name: 'Brumaspectre', types: ['Eau', 'Spectre'],
    base: { hp: 66, atk: 66, def: 68, spa: 84, spd: 78, spe: 69 },
    shape: 'ghost', feats: ['fins', 'aura'], scale: 1.05, body: '#5f9ac8', accent: '#b8e0f0',
    catchRate: 45, gen: 0, evo: { to: 'abyssire', lv: 36 },
    sig: [[18, 'ball-ombre'], [24, 'surf'], [30, 'hantise']],
    flavor: 'Sa brume glacée dissimule des silhouettes qui n’existent pas.',
  },
  {
    dex: 1106, id: 'abyssire', name: 'Abyssire', types: ['Eau', 'Spectre'],
    base: { hp: 88, atk: 86, def: 92, spa: 112, spd: 104, spe: 78 },
    shape: 'ghost', feats: ['fins', 'aura', 'crest', 'mane'], scale: 1.5, body: '#4f7fb8', accent: '#9fd8ee',
    catchRate: 45, gen: 0,
    sig: [[36, 'maremortelle'], [44, 'hydrocanon'], [52, 'hantise'], [58, 'plenitude']],
    flavor: 'Gardien des épaves. Son chant attire les marins vers les abysses.',
  },
  {
    dex: 1107, id: 'germinuit', name: 'Germinuit', types: ['Plante'],
    base: { hp: 52, atk: 58, def: 56, spa: 56, spd: 54, spe: 49 },
    shape: 'plantoid', feats: ['crest', 'tuft'], scale: .72, body: '#6fbf6a', accent: '#3f7a52',
    catchRate: 45, gen: 0, evo: { to: 'sylvombre', lv: 16 },
    sig: [[1, 'fouetlia'], [7, 'tranchherb'], [13, 'morsure']],
    flavor: 'Sa pousse ne s’ouvre qu’à la tombée de la nuit.',
  },
  {
    dex: 1108, id: 'sylvombre', name: 'Sylvombre', types: ['Plante', 'Ténèbres'],
    base: { hp: 70, atk: 82, def: 74, spa: 72, spd: 70, spe: 63 },
    shape: 'biped', feats: ['crest', 'claws', 'fangs'], scale: 1.05, body: '#569a5f', accent: '#33604a',
    catchRate: 45, gen: 0, evo: { to: 'nocteracine', lv: 36 },
    sig: [[18, 'vibrobscur'], [24, 'lamefeuille'], [30, 'danselame']],
    flavor: 'Il se fond dans l’ombre des futaies et n’en sort que pour frapper.',
  },
  {
    dex: 1109, id: 'nocteracine', name: 'Nocteracine', types: ['Plante', 'Ténèbres'],
    base: { hp: 92, atk: 112, def: 96, spa: 86, spd: 92, spe: 82 },
    shape: 'humanoid', feats: ['crest', 'claws', 'spikes', 'mane'], scale: 1.5, body: '#3f7f4f', accent: '#2a4a3a',
    catchRate: 45, gen: 0,
    sig: [[36, 'ronceombre'], [44, 'nuitnoire'], [52, 'lancesoleil'], [58, 'closecombat']],
    flavor: 'Ses racines drainent la lumière ; la forêt autour de lui reste noire.',
  },
];

/* ========================================================= */
const ALL: Species[] = [
  ...CUSTOM.map((s) => ({ ...s, xpYield: Math.round(bst(s.base) / 4), custom: true })),
  ...POKEDEX.map((s) => ({ ...s, xpYield: Math.round(bst(s.base) / 4) })),
];

export const SPECIES: Record<string, Species> = Object.fromEntries(ALL.map((s) => [s.id, s]));
/** Trié pour l'affichage du Dex : exclusivités d'abord, puis numéro national. */
export const DEX: Species[] = [...ALL].sort((a, b) => a.dex - b.dex);

export function species(id: string): Species {
  const s = SPECIES[id];
  if (!s) throw new Error('Espèce inconnue: ' + id);
  return s;
}

export function hasSpecies(id: string): boolean { return !!SPECIES[id]; }

/** Ligne évolutive complète d'une espèce (du premier au dernier stade). */
export function evoLine(id: string): string[] {
  const first = DEX.find((s) => s.evo?.to === id || s.evoAlt?.includes(id));
  const start = first ? evoLine(first.id)[0] : id;
  const line = [start];
  let cur = SPECIES[start];
  while (cur?.evo) { line.push(cur.evo.to); cur = SPECIES[cur.evo.to]; }
  return line;
}

/** Stade adapté à un niveau donné, en suivant la ligne évolutive. */
export function stageForLevel(id: string, lv: number): string {
  let cur = SPECIES[id];
  while (cur?.evo && lv >= cur.evo.lv) {
    const next = SPECIES[cur.evo.to];
    if (!next) break;
    cur = next;
  }
  return cur?.id ?? id;
}
