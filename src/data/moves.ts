import type { TypeName } from './types';

export type Stat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
export type Status = 'brl' | 'psn' | 'tox' | 'par' | 'slp' | 'gel' | 'cnf';

export const STATUS_LABEL: Record<Status, string> = {
  brl: 'BRÛ', psn: 'PSN', tox: 'TOX', par: 'PAR', slp: 'DOR', gel: 'GEL', cnf: 'CNF',
};

export interface MoveEffect {
  status?: Status;
  chance?: number;                                    // % de déclenchement (défaut 100)
  self?: Partial<Record<Stat, number>>;               // paliers appliqués au lanceur
  foe?: Partial<Record<Stat, number>>;                // paliers appliqués à la cible
  drain?: number;                                     // % des dégâts récupérés
  recoil?: number;                                    // % des dégâts subis en contrecoup
  flinch?: number;                                    // % de peur
  hits?: [number, number];                            // coups multiples
  heal?: number;                                      // % des PV max soignés
  protect?: boolean;
  cure?: boolean;                                     // soigne le statut du lanceur
  crash?: number;                                     // % de PV max perdus si échec
}

export interface Move {
  id: string;
  name: string;
  type: TypeName;
  cat: 'phys' | 'spec' | 'stat';
  power: number;
  acc: number;      // 0 = ne rate jamais
  pp: number;
  pri?: number;
  crit?: number;    // bonus au taux de critique
  eff?: MoveEffect;
  desc?: string;
}

const M: Move[] = [
  // ---- Normal ----
  { id: 'charge', name: 'Charge', type: 'Normal', cat: 'phys', power: 40, acc: 100, pp: 35 },
  { id: 'griffe', name: 'Griffe', type: 'Normal', cat: 'phys', power: 40, acc: 100, pp: 35 },
  { id: 'ecras', name: 'Écrasement', type: 'Normal', cat: 'phys', power: 85, acc: 100, pp: 15, eff: { status: 'par', chance: 30 } },
  { id: 'coupdbol', name: 'Coup d’Boule', type: 'Normal', cat: 'phys', power: 70, acc: 100, pp: 15, eff: { flinch: 30 } },
  { id: 'ultimapo', name: 'Ultimapoing', type: 'Normal', cat: 'phys', power: 80, acc: 100, pp: 20, eff: { flinch: 10 } },
  { id: 'hyperbeam', name: 'Ultralaser', type: 'Normal', cat: 'spec', power: 150, acc: 90, pp: 5, eff: { self: { spa: -1, def: -1 } } },
  { id: 'lametourb', name: 'Tranche-Nuit', type: 'Ténèbres', cat: 'phys', power: 70, acc: 100, pp: 15, crit: 1 },
  { id: 'rugissement', name: 'Rugissement', type: 'Normal', cat: 'stat', power: 0, acc: 100, pp: 40, eff: { foe: { atk: -1 } } },
  { id: 'mimiquerie', name: 'Mimi-Queue', type: 'Normal', cat: 'stat', power: 0, acc: 100, pp: 30, eff: { foe: { def: -1 } } },
  { id: 'grobisou', name: 'Gros Yeux', type: 'Normal', cat: 'stat', power: 0, acc: 100, pp: 30, eff: { foe: { def: -2 } } },
  { id: 'reposant', name: 'Repos', type: 'Psy', cat: 'stat', power: 0, acc: 0, pp: 10, eff: { heal: 50, cure: true } },
  { id: 'abri', name: 'Abri', type: 'Normal', cat: 'stat', power: 0, acc: 0, pp: 10, pri: 4, eff: { protect: true } },
  { id: 'vitesse', name: 'Hâte', type: 'Psy', cat: 'stat', power: 0, acc: 0, pp: 30, eff: { self: { spe: 2 } } },
  { id: 'danselame', name: 'Danse-Lames', type: 'Normal', cat: 'stat', power: 0, acc: 0, pp: 20, eff: { self: { atk: 2 } } },
  { id: 'plenitude', name: 'Plénitude', type: 'Psy', cat: 'stat', power: 0, acc: 0, pp: 20, eff: { self: { spa: 1, spd: 1 } } },
  { id: 'armure', name: 'Armure', type: 'Normal', cat: 'stat', power: 0, acc: 0, pp: 30, eff: { self: { def: 2 } } },
  { id: 'vivevitesse', name: 'Vive-Attaque', type: 'Normal', cat: 'phys', power: 40, acc: 100, pp: 30, pri: 1 },
  { id: 'triplepied', name: 'Triple Pied', type: 'Normal', cat: 'phys', power: 25, acc: 95, pp: 15, eff: { hits: [2, 5] } },

  // ---- Feu ----
  { id: 'flammeche', name: 'Flammèche', type: 'Feu', cat: 'spec', power: 40, acc: 100, pp: 25, eff: { status: 'brl', chance: 10 } },
  { id: 'crocsfeu', name: 'Crocs Feu', type: 'Feu', cat: 'phys', power: 65, acc: 95, pp: 15, eff: { status: 'brl', chance: 10, flinch: 10 } },
  { id: 'lanceflam', name: 'Lance-Flammes', type: 'Feu', cat: 'spec', power: 90, acc: 100, pp: 15, eff: { status: 'brl', chance: 10 } },
  { id: 'boutefeu', name: 'Boutefeu', type: 'Feu', cat: 'phys', power: 120, acc: 100, pp: 5, eff: { recoil: 33, status: 'brl', chance: 10 } },
  { id: 'deflagration', name: 'Déflagration', type: 'Feu', cat: 'spec', power: 110, acc: 85, pp: 5, eff: { status: 'brl', chance: 10 } },
  { id: 'dracochoc', name: 'Draco-Flammes', type: 'Feu', cat: 'spec', power: 100, acc: 95, pp: 8, crit: 1, desc: 'Attaque signature brûlante.' },

  // ---- Eau ----
  { id: 'pistoleau', name: 'Pistolet à O', type: 'Eau', cat: 'spec', power: 40, acc: 100, pp: 25 },
  { id: 'bulledeau', name: "Bulles d'O", type: 'Eau', cat: 'spec', power: 60, acc: 100, pp: 20, eff: { foe: { spe: -1 }, chance: 30 } },
  { id: 'surf', name: 'Surf', type: 'Eau', cat: 'spec', power: 90, acc: 100, pp: 15 },
  { id: 'hydrocanon', name: 'Hydrocanon', type: 'Eau', cat: 'spec', power: 110, acc: 80, pp: 5 },
  { id: 'cascade', name: 'Cascade', type: 'Eau', cat: 'phys', power: 80, acc: 100, pp: 15, eff: { flinch: 20 } },
  { id: 'aquajet', name: 'Aqua-Jet', type: 'Eau', cat: 'phys', power: 40, acc: 100, pp: 20, pri: 1 },
  { id: 'maremortelle', name: 'Marée Spectrale', type: 'Eau', cat: 'spec', power: 100, acc: 95, pp: 8, eff: { foe: { spd: -1 }, chance: 40 } },

  // ---- Plante ----
  { id: 'fouetlia', name: 'Fouet Lianes', type: 'Plante', cat: 'phys', power: 45, acc: 100, pp: 25 },
  { id: 'tranchherb', name: "Tranch'Herbe", type: 'Plante', cat: 'phys', power: 55, acc: 95, pp: 25, crit: 1 },
  { id: 'vampigraine', name: 'Vampigraine', type: 'Plante', cat: 'spec', power: 75, acc: 100, pp: 10, eff: { drain: 50 } },
  { id: 'lancesoleil', name: 'Lance-Soleil', type: 'Plante', cat: 'spec', power: 120, acc: 100, pp: 5, eff: { self: { spa: -1 } } },
  { id: 'canonseve', name: 'Canon Sève', type: 'Plante', cat: 'spec', power: 95, acc: 95, pp: 10 },
  { id: 'lamefeuille', name: 'Lame-Feuille', type: 'Plante', cat: 'phys', power: 90, acc: 100, pp: 10, crit: 1 },
  { id: 'ronceombre', name: 'Ronces d’Ombre', type: 'Plante', cat: 'phys', power: 100, acc: 95, pp: 8, eff: { drain: 30 } },
  { id: 'spore', name: 'Spore', type: 'Plante', cat: 'stat', power: 0, acc: 85, pp: 10, eff: { status: 'slp' } },
  { id: 'synthese', name: 'Synthèse', type: 'Plante', cat: 'stat', power: 0, acc: 0, pp: 10, eff: { heal: 50 } },

  // ---- Électrik ----
  { id: 'eclair', name: 'Éclair', type: 'Électrik', cat: 'spec', power: 40, acc: 100, pp: 30, eff: { status: 'par', chance: 10 } },
  { id: 'etincelle', name: 'Étincelle', type: 'Électrik', cat: 'phys', power: 65, acc: 100, pp: 20, eff: { status: 'par', chance: 30 } },
  { id: 'tonnerre', name: 'Tonnerre', type: 'Électrik', cat: 'spec', power: 90, acc: 100, pp: 15, eff: { status: 'par', chance: 10 } },
  { id: 'fatalfoudre', name: 'Fatal-Foudre', type: 'Électrik', cat: 'spec', power: 110, acc: 70, pp: 10, eff: { status: 'par', chance: 30 } },
  { id: 'cageeclair', name: 'Cage-Éclair', type: 'Électrik', cat: 'stat', power: 0, acc: 90, pp: 20, eff: { status: 'par' } },

  // ---- Glace ----
  { id: 'ventglace', name: 'Vent Glace', type: 'Glace', cat: 'spec', power: 55, acc: 95, pp: 15, eff: { foe: { spe: -1 } } },
  { id: 'laserglace', name: 'Laser Glace', type: 'Glace', cat: 'spec', power: 90, acc: 100, pp: 10, eff: { status: 'gel', chance: 10 } },
  { id: 'blizzard', name: 'Blizzard', type: 'Glace', cat: 'spec', power: 110, acc: 70, pp: 5, eff: { status: 'gel', chance: 10 } },
  { id: 'crocsgivre', name: 'Crocs Givre', type: 'Glace', cat: 'phys', power: 65, acc: 95, pp: 15, eff: { status: 'gel', chance: 10, flinch: 10 } },

  // ---- Combat ----
  { id: 'poingkarate', name: 'Poing-Karaté', type: 'Combat', cat: 'phys', power: 50, acc: 100, pp: 25, crit: 1 },
  { id: 'balayage', name: 'Balayage', type: 'Combat', cat: 'phys', power: 60, acc: 100, pp: 20 },
  { id: 'exupied', name: 'Exuviation', type: 'Combat', cat: 'stat', power: 0, acc: 0, pp: 15, eff: { self: { atk: 1, def: 1 } } },
  { id: 'closecombat', name: 'Close Combat', type: 'Combat', cat: 'phys', power: 120, acc: 100, pp: 5, eff: { self: { def: -1, spd: -1 } } },
  { id: 'ultimawashi', name: 'Ultimawashi', type: 'Combat', cat: 'phys', power: 120, acc: 80, pp: 5, eff: { crash: 25 } },
  { id: 'aurasphere', name: 'Aurasphère', type: 'Combat', cat: 'spec', power: 80, acc: 0, pp: 20 },

  // ---- Poison ----
  { id: 'darddain', name: 'Dard-Venin', type: 'Poison', cat: 'phys', power: 15, acc: 100, pp: 35, eff: { status: 'psn', chance: 30 } },
  { id: 'acide', name: 'Acide', type: 'Poison', cat: 'spec', power: 60, acc: 100, pp: 20, eff: { foe: { spd: -1 }, chance: 30 } },
  { id: 'bombebeurk', name: 'Bomb-Beurk', type: 'Poison', cat: 'spec', power: 90, acc: 100, pp: 10, eff: { status: 'psn', chance: 30 } },
  { id: 'toxik', name: 'Toxik', type: 'Poison', cat: 'stat', power: 0, acc: 90, pp: 10, eff: { status: 'tox' } },
  { id: 'directtoxik', name: 'Direct Toxik', type: 'Poison', cat: 'phys', power: 80, acc: 100, pp: 20, eff: { status: 'psn', chance: 20 } },

  // ---- Sol / Roche ----
  { id: 'jetpierres', name: 'Jet-Pierres', type: 'Roche', cat: 'phys', power: 50, acc: 90, pp: 15 },
  { id: 'eboulement', name: 'Éboulement', type: 'Roche', cat: 'phys', power: 75, acc: 90, pp: 10, eff: { flinch: 30 } },
  { id: 'lamederoc', name: 'Lame de Roc', type: 'Roche', cat: 'phys', power: 100, acc: 80, pp: 5, crit: 1 },
  { id: 'tunnel', name: 'Tunnel', type: 'Sol', cat: 'phys', power: 80, acc: 100, pp: 10 },
  { id: 'seisme', name: 'Séisme', type: 'Sol', cat: 'phys', power: 100, acc: 100, pp: 10 },
  { id: 'pouvoantiq', name: 'Pouvoir Antique', type: 'Roche', cat: 'spec', power: 60, acc: 100, pp: 5, eff: { self: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, chance: 25 } },

  // ---- Vol ----
  { id: 'tornade', name: 'Tornade', type: 'Vol', cat: 'spec', power: 40, acc: 100, pp: 35 },
  { id: 'picpic', name: 'Picpic', type: 'Vol', cat: 'phys', power: 35, acc: 100, pp: 35 },
  { id: 'cruaile', name: 'Cru-Aile', type: 'Vol', cat: 'phys', power: 60, acc: 100, pp: 35 },
  { id: 'aeropique', name: 'Aéropique', type: 'Vol', cat: 'phys', power: 60, acc: 0, pp: 20, pri: 1 },
  { id: 'rapace', name: 'Rapace', type: 'Vol', cat: 'phys', power: 120, acc: 100, pp: 5, eff: { recoil: 33 } },
  { id: 'ouraganvol', name: 'Ouragan', type: 'Vol', cat: 'spec', power: 110, acc: 70, pp: 10, eff: { status: 'cnf', chance: 30 } },

  // ---- Psy ----
  { id: 'choc-mental', name: 'Choc Mental', type: 'Psy', cat: 'spec', power: 50, acc: 100, pp: 25 },
  { id: 'psyko', name: 'Psyko', type: 'Psy', cat: 'spec', power: 90, acc: 100, pp: 10, eff: { foe: { spd: -1 }, chance: 10 } },
  { id: 'rafalepsy', name: 'Rafale Psy', type: 'Psy', cat: 'spec', power: 65, acc: 100, pp: 10, eff: { status: 'cnf', chance: 20 } },
  { id: 'hypnose', name: 'Hypnose', type: 'Psy', cat: 'stat', power: 0, acc: 65, pp: 20, eff: { status: 'slp' } },
  { id: 'teleport', name: 'Écran Lumière', type: 'Psy', cat: 'stat', power: 0, acc: 0, pp: 20, eff: { self: { spd: 2 } } },

  // ---- Insecte ----
  { id: 'piqure', name: 'Piqûre', type: 'Insecte', cat: 'phys', power: 60, acc: 100, pp: 20 },
  { id: 'vibrabeille', name: 'Bourdon', type: 'Insecte', cat: 'spec', power: 90, acc: 100, pp: 10, eff: { foe: { spd: -1 }, chance: 10 } },
  { id: 'dardnuee', name: 'Dard-Nuée', type: 'Insecte', cat: 'phys', power: 25, acc: 95, pp: 20, eff: { hits: [2, 5] } },
  { id: 'megasangsue', name: 'Méga-Sangsue', type: 'Insecte', cat: 'spec', power: 80, acc: 100, pp: 10, eff: { drain: 50 } },

  // ---- Spectre / Ténèbres ----
  { id: 'lechouille', name: 'Léchouille', type: 'Spectre', cat: 'phys', power: 30, acc: 100, pp: 30, eff: { status: 'par', chance: 30 } },
  { id: 'ball-ombre', name: "Ball'Ombre", type: 'Spectre', cat: 'spec', power: 80, acc: 100, pp: 15, eff: { foe: { spd: -1 }, chance: 20 } },
  { id: 'griffeombre', name: 'Griffe Ombre', type: 'Spectre', cat: 'phys', power: 70, acc: 100, pp: 15, crit: 1 },
  { id: 'hantise', name: 'Hantise', type: 'Spectre', cat: 'spec', power: 110, acc: 90, pp: 5, eff: { foe: { spa: -1 }, chance: 30 } },
  { id: 'morsure', name: 'Morsure', type: 'Ténèbres', cat: 'phys', power: 60, acc: 100, pp: 25, eff: { flinch: 30 } },
  { id: 'tricherie', name: 'Machination', type: 'Ténèbres', cat: 'stat', power: 0, acc: 0, pp: 20, eff: { self: { spa: 2 } } },
  { id: 'vibrobscur', name: 'Vibrobscur', type: 'Ténèbres', cat: 'spec', power: 80, acc: 100, pp: 15, eff: { foe: { spd: -1 }, chance: 20 } },
  { id: 'nuitnoire', name: 'Nuit Noire', type: 'Ténèbres', cat: 'phys', power: 110, acc: 90, pp: 5, eff: { recoil: 20 } },

  // ---- Dragon ----
  { id: 'draco-souffle', name: 'Draco-Souffle', type: 'Dragon', cat: 'spec', power: 60, acc: 100, pp: 20, eff: { status: 'par', chance: 30 } },
  { id: 'dracogriffe', name: 'Dracogriffe', type: 'Dragon', cat: 'phys', power: 80, acc: 100, pp: 15 },
  { id: 'dracochoc2', name: 'Draco-Choc', type: 'Dragon', cat: 'spec', power: 85, acc: 100, pp: 10 },
  { id: 'coleredragon', name: 'Colère', type: 'Dragon', cat: 'phys', power: 120, acc: 100, pp: 10, eff: { self: { atk: 1 }, chance: 50 } },
  { id: 'dansedracau', name: 'Danse Draco', type: 'Dragon', cat: 'stat', power: 0, acc: 0, pp: 20, eff: { self: { atk: 1, spe: 1 } } },

  // ---- Acier / Fée ----
  { id: 'griffacier', name: 'Griffe Acier', type: 'Acier', cat: 'phys', power: 70, acc: 95, pp: 15, eff: { self: { atk: 1 }, chance: 10 } },
  { id: 'luminocanon', name: 'Luminocanon', type: 'Acier', cat: 'spec', power: 80, acc: 100, pp: 10, eff: { foe: { spd: -1 }, chance: 30 } },
  { id: 'tetedefer', name: 'Tête de Fer', type: 'Acier', cat: 'phys', power: 80, acc: 100, pp: 15, eff: { flinch: 30 } },
  { id: 'vent-feerique', name: 'Vent Féerique', type: 'Fée', cat: 'spec', power: 40, acc: 100, pp: 30 },
  { id: 'eclatmagik', name: 'Éclat Magique', type: 'Fée', cat: 'spec', power: 80, acc: 100, pp: 10 },
  { id: 'forcelunaire', name: 'Force Lunaire', type: 'Fée', cat: 'spec', power: 95, acc: 100, pp: 10, eff: { foe: { spa: -1 }, chance: 30 } },
  { id: 'jolicharme', name: 'Charme', type: 'Fée', cat: 'stat', power: 0, acc: 100, pp: 20, eff: { foe: { atk: -2 } } },
];

export const MOVES: Record<string, Move> = Object.fromEntries(M.map((m) => [m.id, m]));

export function move(id: string): Move {
  const m = MOVES[id];
  if (!m) throw new Error('Capacité inconnue: ' + id);
  return m;
}
