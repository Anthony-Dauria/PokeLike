import type { TypeName } from './types';
import { species } from './species';

/** Répertoire de capacités par type : [niveau, id]. */
const POOL: Record<TypeName, [number, string][]> = {
  Normal: [[1, 'charge'], [9, 'mimiquerie'], [15, 'vivevitesse'], [23, 'ecras'], [31, 'ultimapo'], [45, 'hyperbeam']],
  Feu: [[1, 'flammeche'], [13, 'crocsfeu'], [25, 'lanceflam'], [37, 'deflagration'], [49, 'boutefeu']],
  Eau: [[1, 'pistoleau'], [11, 'bulledeau'], [19, 'aquajet'], [27, 'surf'], [39, 'cascade'], [49, 'hydrocanon']],
  Plante: [[1, 'fouetlia'], [12, 'tranchherb'], [20, 'vampigraine'], [30, 'lamefeuille'], [40, 'canonseve'], [50, 'lancesoleil']],
  Électrik: [[1, 'eclair'], [13, 'etincelle'], [25, 'tonnerre'], [35, 'cageeclair'], [47, 'fatalfoudre']],
  Glace: [[1, 'ventglace'], [15, 'crocsgivre'], [29, 'laserglace'], [45, 'blizzard']],
  Combat: [[1, 'poingkarate'], [13, 'balayage'], [23, 'exupied'], [35, 'ultimawashi'], [45, 'closecombat']],
  Poison: [[1, 'darddain'], [12, 'acide'], [24, 'toxik'], [32, 'directtoxik'], [44, 'bombebeurk']],
  Sol: [[1, 'jetpierres'], [16, 'tunnel'], [30, 'lamederoc'], [42, 'seisme']],
  Vol: [[1, 'tornade'], [11, 'cruaile'], [21, 'aeropique'], [33, 'ouraganvol'], [46, 'rapace']],
  Psy: [[1, 'choc-mental'], [14, 'rafalepsy'], [22, 'plenitude'], [30, 'hypnose'], [38, 'psyko'], [48, 'teleport']],
  Insecte: [[1, 'piqure'], [14, 'dardnuee'], [26, 'megasangsue'], [38, 'vibrabeille']],
  Roche: [[1, 'jetpierres'], [17, 'eboulement'], [27, 'pouvoantiq'], [41, 'lamederoc']],
  Spectre: [[1, 'lechouille'], [15, 'griffeombre'], [25, 'ball-ombre'], [43, 'hantise']],
  Dragon: [[1, 'draco-souffle'], [19, 'dracogriffe'], [29, 'dansedracau'], [39, 'dracochoc2'], [51, 'coleredragon']],
  Ténèbres: [[1, 'morsure'], [17, 'vibrobscur'], [27, 'tricherie'], [37, 'lametourb'], [49, 'nuitnoire']],
  Acier: [[1, 'griffacier'], [18, 'tetedefer'], [28, 'armure'], [40, 'luminocanon']],
  Fée: [[1, 'vent-feerique'], [14, 'jolicharme'], [26, 'eclatmagik'], [38, 'forcelunaire']],
};

/** Quelques options universelles pour étoffer les sets tardifs. */
const COMMON: [number, string][] = [[7, 'rugissement'], [20, 'abri'], [34, 'reposant']];

const cache = new Map<string, [number, string][]>();

/** Table d'apprentissage déterministe, dérivée des types + capacités signature. */
export function learnset(id: string): [number, string][] {
  const hit = cache.get(id);
  if (hit) return hit;
  const sp = species(id);
  const rows: [number, string][] = [];
  sp.types.forEach((t, i) => {
    for (const [lv, mv] of POOL[t]) rows.push([i === 0 ? lv : lv + 4, mv]);
  });
  rows.push(...COMMON);
  if (sp.sig) rows.push(...sp.sig);

  const best = new Map<string, number>();
  for (const [lv, mv] of rows) best.set(mv, Math.min(best.get(mv) ?? 99, lv));
  const out = [...best].map(([mv, lv]) => [lv, mv] as [number, string]).sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  cache.set(id, out);
  return out;
}

/** Les 4 dernières capacités apprises jusqu'au niveau donné. */
export function movesAtLevel(id: string, lv: number): string[] {
  const known = learnset(id).filter(([l]) => l <= lv).map(([, m]) => m);
  return [...new Set(known)].slice(-4);
}

/** Capacités débloquées exactement à ce niveau. */
export function movesLearnedAt(id: string, lv: number): string[] {
  return learnset(id).filter(([l]) => l === lv).map(([, m]) => m);
}
