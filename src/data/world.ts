import type { TypeName } from './types';
import { SHOP_BASIC, SHOP_MID, SHOP_LATE } from './items';

export type Dir = 'n' | 's' | 'e' | 'w';
export type Biome = 'plaine' | 'foret' | 'montagne' | 'plage' | 'desert' | 'neige' | 'volcan' | 'marais' | 'ville' | 'grotte';

export interface Enc { sp: string; min: number; max: number; w: number }
export interface Link { to: string; needBadge?: number; needFlag?: string; block?: string }
export interface House { name: string; lines: string[] }

export interface ZoneDef {
  id: string;
  name: string;
  kind: 'town' | 'route' | 'cave' | 'special';
  region: 1 | 2;
  seed: number;
  w: number;
  h: number;
  biome: Biome;
  enc?: Enc[];
  trainers?: number;
  trainerLv?: number;
  items?: string[];
  gym?: string;
  center?: boolean;
  shop?: string[];
  houses?: House[];
  links: Partial<Record<Dir, Link>>;
  signs?: string[];
  intro?: string;
}

const e = (sp: string, min: number, max: number, w = 10): Enc => ({ sp, min, max, w });

/* =========================================================
   RÉGION 1 — VALMORE
   ========================================================= */
export const ZONES: ZoneDef[] = [
  {
    id: 'bourg-aurore', name: 'Bourg Aurore', kind: 'town', region: 1, seed: 101, w: 28, h: 26, biome: 'plaine',
    center: true,
    houses: [
      { name: 'Chez toi', lines: ['Maman : Bonne route ! Repose-toi ici quand tu veux.', 'Maman : Ton équipe est soignée. File !'] },
      { name: 'Labo du Pr. Ombelle', lines: ['Pr. Ombelle : Valmore compte 8 Arènes. Bats-les toutes !', 'Pr. Ombelle : Et après la Ligue… il y a autre chose. Tu verras.'] },
    ],
    links: { n: { to: 'route1' } },
    signs: ['Bourg Aurore — « Là où tout commence. »'],
    intro: 'Bourg Aurore',
  },
  {
    id: 'route1', name: 'Route 1', kind: 'route', region: 1, seed: 102, w: 20, h: 30, biome: 'plaine',
    enc: [e('ratinoc', 2, 5, 30), e('piafleur', 2, 5, 25), e('chenilume', 2, 4, 20), e('vermidard', 2, 4, 15), e('bourgeonet', 3, 5, 10)],
    trainers: 2, trainerLv: 5, items: ['potion', 'ball'],
    links: { s: { to: 'bourg-aurore' }, n: { to: 'serenis' } },
    signs: ['ROUTE 1 — Bourg Aurore ↓ / Sérènis ↑'],
  },
  {
    id: 'serenis', name: 'Sérènis', kind: 'town', region: 1, seed: 103, w: 28, h: 26, biome: 'foret',
    center: true, shop: SHOP_BASIC, gym: 'g1',
    houses: [{ name: 'Maison', lines: ['Habitant : Basile élève des Insectes depuis ses 6 ans.', 'Habitant : Prends du Feu ou du Vol contre lui.'] }],
    links: { s: { to: 'route1' }, n: { to: 'route2', needBadge: 1, block: 'Garde : Le sentier du nord est réservé aux dresseurs badgés. Va défier l’Arène !' } },
    intro: 'Sérènis',
  },
  {
    id: 'route2', name: 'Route 2', kind: 'route', region: 1, seed: 104, w: 22, h: 32, biome: 'foret',
    enc: [e('chenilume', 5, 9, 25), e('cocoluis', 7, 10, 12), e('vermidard', 5, 9, 20), e('ratinoc', 6, 9, 18), e('spectrille', 7, 10, 10), e('germinuit', 6, 9, 5), e('flamouflet', 6, 9, 5), e('ondulin', 6, 9, 5)],
    trainers: 3, trainerLv: 10, items: ['superpotion', 'ball', 'antidote'],
    links: { s: { to: 'serenis' }, n: { to: 'cendrebourg' } },
  },
  {
    id: 'cendrebourg', name: 'Cendrebourg', kind: 'town', region: 1, seed: 105, w: 28, h: 26, biome: 'montagne',
    center: true, shop: SHOP_BASIC, gym: 'g2',
    houses: [{ name: 'Maison du mineur', lines: ['Mineur : La Grotte de l’Écho au nord grouille de Roche.', 'Mineur : Tiens, prends ça.'] }],
    links: { s: { to: 'route2' }, n: { to: 'route3', needBadge: 2, block: 'Garde : Sans le Badge Granit, la mine reste fermée.' } },
    intro: 'Cendrebourg',
  },
  {
    id: 'route3', name: 'Route 3', kind: 'route', region: 1, seed: 106, w: 22, h: 28, biome: 'montagne',
    enc: [e('cailloutin', 10, 14, 30), e('piafleur', 10, 14, 20), e('sablotin', 11, 14, 15), e('poingpou', 11, 15, 15), e('zephyroc', 13, 15, 5), e('flamouflet', 11, 14, 15)],
    trainers: 3, trainerLv: 15, items: ['ball', 'superpotion'],
    links: { s: { to: 'cendrebourg' }, n: { to: 'grotte-echo' } },
  },
  {
    id: 'grotte-echo', name: 'Grotte de l’Écho', kind: 'cave', region: 1, seed: 107, w: 26, h: 26, biome: 'grotte',
    enc: [e('cailloutin', 13, 17, 30), e('rocailleux', 15, 18, 12), e('spectrille', 14, 17, 15), e('ferrolin', 14, 17, 15), e('sablotin', 13, 17, 18), e('draconnet', 15, 18, 4), e('golemtal', 17, 18, 1)],
    trainers: 2, trainerLv: 18, items: ['hyperpotion', 'superball'],
    links: { s: { to: 'route3' }, n: { to: 'route4' } },
    intro: 'Grotte de l’Écho',
  },
  {
    id: 'route4', name: 'Route 4', kind: 'route', region: 1, seed: 108, w: 24, h: 26, biome: 'plage',
    enc: [e('aquaillon', 16, 20, 30), e('piafleur', 16, 19, 20), e('ondulin', 16, 20, 15), e('coraline', 18, 21, 8), e('ratinoc', 16, 19, 17), e('gelipou', 17, 20, 10)],
    trainers: 3, trainerLv: 20, items: ['superball', 'guerison'],
    links: { s: { to: 'grotte-echo' }, e: { to: 'port-maree' } },
  },
  {
    id: 'port-maree', name: 'Port-Marée', kind: 'town', region: 1, seed: 109, w: 28, h: 26, biome: 'plage',
    center: true, shop: SHOP_MID, gym: 'g3',
    houses: [
      { name: 'Capitainerie', lines: ['Capitaine : Le ferry pour Orsyn ? Il faut le Passe d’Orsyn.', 'Capitaine : On me dit que seuls les Maîtres de la Ligue l’obtiennent.'] },
      { name: 'Maison du pêcheur', lines: ['Pêcheur : Tiens, prends ma vieille canne, j’en ai deux.'] },
    ],
    links: { w: { to: 'route4' }, n: { to: 'route5', needBadge: 3, block: 'Garde : Le pont du nord est en travaux… sauf pour les porteurs du Badge Ressac.' }, e: { to: 'ferry-orsyn', needFlag: 'champion', block: 'Marin : Le ferry pour Orsyn n’embarque que les Maîtres de la Ligue.' } },
    intro: 'Port-Marée',
  },
  {
    id: 'route5', name: 'Route 5', kind: 'route', region: 1, seed: 110, w: 24, h: 30, biome: 'foret',
    enc: [e('bourgeonet', 21, 25, 25), e('papilore', 22, 25, 10), e('germinuit', 21, 24, 12), e('psykid', 22, 25, 13), e('feriole', 22, 25, 12), e('ombracer', 22, 25, 13), e('mantisombre', 23, 26, 5), e('kaktusai', 24, 26, 10)],
    trainers: 4, trainerLv: 25, items: ['hyperpotion', 'superball', 'rappel'],
    links: { s: { to: 'port-maree' }, n: { to: 'fougeville' } },
  },
  {
    id: 'fougeville', name: 'Fougèville', kind: 'town', region: 1, seed: 111, w: 28, h: 26, biome: 'foret',
    center: true, shop: SHOP_MID, gym: 'g4',
    houses: [{ name: 'Serre communale', lines: ['Botaniste : Solène fait pousser ses créatures comme des orchidées.', 'Botaniste : Le Feu, la Glace ou le Vol la gênent beaucoup.'] }],
    links: { s: { to: 'route5' }, e: { to: 'route6', needBadge: 4, block: 'Garde : Le tunnel de l’est n’ouvre qu’aux porteurs du Badge Sylve.' } },
    intro: 'Fougèville',
  },
  {
    id: 'route6', name: 'Route 6', kind: 'route', region: 1, seed: 112, w: 30, h: 24, biome: 'plaine',
    enc: [e('voltiny', 26, 30, 28), e('ratargeant', 27, 30, 15), e('scarabolt', 28, 31, 10), e('piafleur', 26, 29, 12), e('aiglombre', 28, 31, 10), e('toxinaze', 27, 30, 15), e('voltifer', 29, 31, 10)],
    trainers: 4, trainerLv: 30, items: ['hyperpotion', 'attaqueplus'],
    links: { w: { to: 'fougeville' }, e: { to: 'voltac' } },
  },
  {
    id: 'voltac', name: 'Voltac', kind: 'town', region: 1, seed: 113, w: 28, h: 26, biome: 'ville',
    center: true, shop: SHOP_MID, gym: 'g5',
    houses: [{ name: 'Centrale', lines: ['Technicien : Dorian alimente toute la ville avec ses créatures.', 'Technicien : Le Sol ignore complètement l’Électrik. Note-le.'] }],
    links: { w: { to: 'route6' }, n: { to: 'route7', needBadge: 5, block: 'Garde : La route du volcan est fermée. Badge Voltage exigé.' } },
    intro: 'Voltac',
  },
  {
    id: 'route7', name: 'Route 7', kind: 'route', region: 1, seed: 114, w: 24, h: 30, biome: 'volcan',
    enc: [e('flamouflet', 31, 35, 22), e('pyrolynx', 33, 36, 10), e('magmalv', 33, 36, 12), e('cailloutin', 31, 34, 15), e('rocailleux', 32, 35, 13), e('nagaflam', 33, 36, 10), e('chimerok', 34, 36, 8), e('sablotin', 31, 34, 10)],
    trainers: 4, trainerLv: 35, items: ['potionmax', 'hyperball'],
    links: { s: { to: 'voltac' }, n: { to: 'braisefort' } },
  },
  {
    id: 'braisefort', name: 'Braisefort', kind: 'town', region: 1, seed: 115, w: 28, h: 26, biome: 'volcan',
    center: true, shop: SHOP_LATE, gym: 'g6',
    houses: [{ name: 'Forge', lines: ['Forgeron : Iskander chauffe ses créatures au four à lave.', 'Forgeron : L’Eau, la Roche et le Sol, voilà ce qu’il craint.'] }],
    links: { s: { to: 'route7' }, n: { to: 'route8', needBadge: 6, block: 'Garde : Le col enneigé est bloqué sans le Badge Fournaise.' } },
    intro: 'Braisefort',
  },
  {
    id: 'route8', name: 'Route 8', kind: 'route', region: 1, seed: 116, w: 24, h: 30, biome: 'neige',
    enc: [e('gelipou', 36, 40, 24), e('frimalak', 38, 41, 10), e('ondinelle', 38, 41, 10), e('aurorix', 39, 42, 8), e('zephyroc', 37, 40, 12), e('cryodon', 40, 42, 4), e('poingpou', 36, 39, 16), e('karateur', 38, 41, 8), e('golemtal', 39, 41, 8)],
    trainers: 4, trainerLv: 40, items: ['potionmax', 'hyperball', 'rappelmax'],
    links: { s: { to: 'braisefort' }, n: { to: 'givrelune' } },
  },
  {
    id: 'givrelune', name: 'Givrelune', kind: 'town', region: 1, seed: 117, w: 28, h: 26, biome: 'neige',
    center: true, shop: SHOP_LATE, gym: 'g7',
    houses: [{ name: 'Refuge', lines: ['Guide : Maëlis fige les combats avant qu’ils ne commencent.', 'Guide : Acier, Feu, Combat et Roche brisent la glace.'] }],
    links: { s: { to: 'route8' }, e: { to: 'route9', needBadge: 7, block: 'Garde : La lande de Nyxhaven exige le Badge Frimas.' } },
    intro: 'Givrelune',
  },
  {
    id: 'route9', name: 'Route 9', kind: 'route', region: 1, seed: 118, w: 30, h: 26, biome: 'marais',
    enc: [e('spectrille', 41, 45, 20), e('voilombre', 43, 46, 12), e('toxinaze', 41, 44, 15), e('miasmodon', 43, 46, 10), e('ombrelune', 44, 47, 8), e('fantomiroir', 44, 47, 8), e('mantisombre', 43, 46, 10), e('nyxpanthre', 43, 46, 9), e('terravor', 44, 47, 8)],
    trainers: 5, trainerLv: 45, items: ['potionmax', 'hyperball', 'guerison'],
    links: { w: { to: 'givrelune' }, e: { to: 'nyxhaven' } },
  },
  {
    id: 'nyxhaven', name: 'Nyxhaven', kind: 'town', region: 1, seed: 119, w: 28, h: 26, biome: 'marais',
    center: true, shop: SHOP_LATE, gym: 'g8',
    houses: [{ name: 'Manoir', lines: ['Majordome : Corvin ne perd jamais chez lui, dit-on.', 'Majordome : Les Ténèbres et les Spectres se dévorent entre eux.'] }],
    links: { w: { to: 'route9' }, n: { to: 'route10', needBadge: 8, block: 'Garde : La Route Victoire n’accepte que les 8 badges de Valmore.' } },
    intro: 'Nyxhaven',
  },
  {
    id: 'route10', name: 'Route Victoire', kind: 'route', region: 1, seed: 120, w: 26, h: 34, biome: 'montagne',
    enc: [e('golemtal', 46, 50, 14), e('nyxpanthre', 46, 50, 12), e('karateur', 46, 50, 12), e('drakoral', 47, 51, 8), e('cryodon', 48, 52, 6), e('viperande', 47, 51, 8), e('chimerok', 47, 51, 10), e('terravor', 47, 51, 10), e('mantisombre', 46, 50, 10), e('titanroc', 48, 52, 10)],
    trainers: 5, trainerLv: 50, items: ['potionmax', 'rappelmax', 'hyperball', 'masterball'],
    links: { s: { to: 'nyxhaven' }, n: { to: 'plateau-ligue' } },
    intro: 'Route Victoire',
  },
  {
    id: 'plateau-ligue', name: 'Plateau de la Ligue', kind: 'special', region: 1, seed: 121, w: 28, h: 26, biome: 'montagne',
    center: true, shop: SHOP_LATE,
    houses: [{ name: 'Hall d’honneur', lines: ['Hôtesse : Le Conseil des 4 puis la Championne. Aucune pause entre les combats.', 'Hôtesse : Soigne ton équipe avant d’entrer.'] }],
    links: { s: { to: 'route10' } },
    intro: 'Plateau de la Ligue',
  },

  /* =======================================================
     RÉGION 2 — ORSYN (post-Ligue)
     ======================================================= */
  {
    id: 'ferry-orsyn', name: 'Escale d’Orsyn', kind: 'town', region: 2, seed: 201, w: 28, h: 26, biome: 'plage',
    center: true, shop: SHOP_LATE, gym: 'g9',
    houses: [{ name: 'Auberge du Large', lines: ['Aubergiste : Bienvenue à Orsyn. Ici les dresseurs commencent où Valmore s’arrête.', 'Aubergiste : Huit Arènes. Et au bout… le Mont Cendre.'] }],
    links: { w: { to: 'port-maree' }, n: { to: 'route11', needBadge: 9, block: 'Garde : Orsyn a ses propres règles. Le Badge Alizé d’abord.' } },
    intro: 'Orsyn — Escale d’Orsyn',
  },
  {
    id: 'route11', name: 'Route 11', kind: 'route', region: 2, seed: 202, w: 26, h: 30, biome: 'desert',
    enc: [e('sablotin', 50, 54, 18), e('dunargon', 52, 56, 14), e('kaktusai', 52, 56, 12), e('terravor', 53, 57, 12), e('chimerok', 53, 57, 10), e('zephyroc', 52, 56, 12), e('nagaflam', 53, 57, 10), e('viperande', 54, 58, 6), e('titanroc', 54, 58, 6)],
    trainers: 4, trainerLv: 56, items: ['potionmax', 'hyperball'],
    links: { s: { to: 'ferry-orsyn' }, n: { to: 'cendrelune' } },
  },
  {
    id: 'cendrelune', name: 'Cendrelune', kind: 'town', region: 2, seed: 203, w: 28, h: 26, biome: 'desert',
    center: true, shop: SHOP_LATE, gym: 'g10',
    houses: [{ name: 'Observatoire', lines: ['Astronome : Certaines nuits, une ombre passe devant la lune…', 'Astronome : Ténébrarque. C’est ce qui attend au sommet du Mont Cendre.'] }],
    links: { s: { to: 'route11' }, e: { to: 'route12', needBadge: 10, block: 'Garde : Badge Strate exigé.' } },
    intro: 'Cendrelune',
  },
  {
    id: 'route12', name: 'Route 12', kind: 'route', region: 2, seed: 204, w: 30, h: 24, biome: 'montagne',
    enc: [e('ferrolin', 55, 59, 14), e('blindarme', 57, 61, 14), e('voltifer', 57, 61, 12), e('golemtal', 57, 61, 14), e('pugilame', 58, 62, 10), e('titanroc', 57, 61, 12), e('magmalv', 56, 60, 12), e('scarabolt', 56, 60, 12)],
    trainers: 4, trainerLv: 60, items: ['potionmax', 'rappelmax'],
    links: { w: { to: 'cendrelune' }, e: { to: 'fer-de-lance' } },
  },
  {
    id: 'fer-de-lance', name: 'Fer-de-Lance', kind: 'town', region: 2, seed: 205, w: 28, h: 26, biome: 'ville',
    center: true, shop: SHOP_LATE, gym: 'g11',
    houses: [{ name: 'Aciérie', lines: ['Contremaître : Tovald forge ses créatures comme des lames.', 'Contremaître : Feu, Combat et Sol : voilà ce qui fait plier l’Acier.'] }],
    links: { w: { to: 'route12' }, n: { to: 'route13', needBadge: 11, block: 'Garde : Badge Enclume exigé.' } },
    intro: 'Fer-de-Lance',
  },
  {
    id: 'route13', name: 'Route 13', kind: 'route', region: 2, seed: 206, w: 26, h: 30, biome: 'foret',
    enc: [e('feriole', 58, 62, 14), e('lunellia', 60, 64, 12), e('ombrelune', 60, 64, 10), e('aurorix', 60, 64, 10), e('coraline', 59, 63, 10), e('papilore', 58, 62, 12), e('sylphibou', 60, 64, 12), e('bambousai', 60, 64, 10), e('florelame', 59, 63, 10)],
    trainers: 5, trainerLv: 63, items: ['potionmax', 'hyperball'],
    links: { s: { to: 'fer-de-lance' }, n: { to: 'sylvebrume' } },
  },
  {
    id: 'sylvebrume', name: 'Sylvebrume', kind: 'town', region: 2, seed: 207, w: 28, h: 26, biome: 'foret',
    center: true, shop: SHOP_LATE, gym: 'g12',
    houses: [{ name: 'Sanctuaire', lines: ['Prêtresse : Sylvanor veille sur cette forêt depuis mille ans.', 'Prêtresse : Le Poison et l’Acier n’ont aucun respect pour les Fées.'] }],
    links: { s: { to: 'route13' }, e: { to: 'route14', needBadge: 12, block: 'Garde : Badge Clairière exigé.' } },
    intro: 'Sylvebrume',
  },
  {
    id: 'route14', name: 'Route 14', kind: 'route', region: 2, seed: 208, w: 30, h: 26, biome: 'marais',
    enc: [e('toxinaze', 60, 64, 12), e('miasmodon', 62, 66, 14), e('viperande', 62, 66, 12), e('nagaflam', 62, 66, 10), e('voilombre', 62, 66, 12), e('mantisombre', 62, 66, 12), e('dardaculee', 61, 65, 14), e('terravor', 62, 66, 14)],
    trainers: 5, trainerLv: 65, items: ['potionmax', 'guerison'],
    links: { w: { to: 'sylvebrume' }, e: { to: 'tourbiere' } },
  },
  {
    id: 'tourbiere', name: 'Tourbière', kind: 'town', region: 2, seed: 209, w: 28, h: 26, biome: 'marais',
    center: true, shop: SHOP_LATE, gym: 'g13',
    houses: [{ name: 'Cabane sur pilotis', lines: ['Herboriste : Vask distille lui-même les venins de son équipe.', 'Herboriste : Psy et Sol le mettent mal à l’aise.'] }],
    links: { w: { to: 'route14' }, n: { to: 'route15', needBadge: 13, block: 'Garde : Badge Miasme exigé.' } },
    intro: 'Tourbière',
  },
  {
    id: 'route15', name: 'Route 15', kind: 'route', region: 2, seed: 210, w: 26, h: 30, biome: 'plaine',
    enc: [e('nyxpanthre', 63, 67, 14), e('mantisombre', 63, 67, 12), e('fantomiroir', 64, 68, 12), e('ombrelune', 64, 68, 10), e('terravor', 64, 68, 12), e('sylphibou', 64, 68, 12), e('tonnerrai', 64, 68, 10), e('aiglombre', 63, 67, 10), e('ratargeant', 62, 66, 8)],
    trainers: 5, trainerLv: 67, items: ['potionmax', 'rappelmax'],
    links: { s: { to: 'tourbiere' }, n: { to: 'aiguemorte' } },
  },
  {
    id: 'aiguemorte', name: 'Aiguemorte', kind: 'town', region: 2, seed: 211, w: 28, h: 26, biome: 'ville',
    center: true, shop: SHOP_LATE, gym: 'g14',
    houses: [{ name: 'Théâtre noir', lines: ['Régisseur : Nyriel joue toujours le rôle du méchant. Et elle gagne.', 'Régisseur : Combat, Insecte et Fée la font sortir de scène.'] }],
    links: { s: { to: 'route15' }, e: { to: 'route16', needBadge: 14, block: 'Garde : Badge Éclipse exigé.' } },
    intro: 'Aiguemorte',
  },
  {
    id: 'route16', name: 'Route 16', kind: 'route', region: 2, seed: 212, w: 30, h: 26, biome: 'montagne',
    enc: [e('karateur', 65, 69, 14), e('pugilame', 66, 70, 14), e('bambousai', 66, 70, 12), e('chimerok', 66, 70, 12), e('golemtal', 66, 70, 12), e('titanroc', 66, 70, 12), e('cryodon', 67, 71, 8), e('drakoral', 66, 70, 8), e('souverain', 68, 72, 4), e('mantisombre', 65, 69, 4)],
    trainers: 5, trainerLv: 69, items: ['potionmax', 'hyperball'],
    links: { w: { to: 'aiguemorte' }, e: { to: 'coeur-de-roc' } },
  },
  {
    id: 'coeur-de-roc', name: 'Cœur-de-Roc', kind: 'town', region: 2, seed: 213, w: 28, h: 26, biome: 'montagne',
    center: true, shop: SHOP_LATE, gym: 'g15',
    houses: [{ name: 'Dojo', lines: ['Élève : Hektor n’a perdu que trois fois en vingt ans.', 'Élève : Psy, Vol et Fée : ses trois défaites.'] }],
    links: { w: { to: 'route16' }, n: { to: 'route17', needBadge: 15, block: 'Garde : Badge Poigne exigé.' } },
    intro: 'Cœur-de-Roc',
  },
  {
    id: 'route17', name: 'Route 17', kind: 'route', region: 2, seed: 214, w: 26, h: 30, biome: 'neige',
    enc: [e('cryodon', 67, 71, 14), e('aurorix', 67, 71, 12), e('frimalak', 66, 70, 12), e('ondinelle', 66, 70, 12), e('souverain', 69, 73, 8), e('drakoral', 67, 71, 12), e('viperande', 68, 72, 10), e('zephyroc', 66, 70, 10), e('tonnerrai', 68, 72, 10)],
    trainers: 5, trainerLv: 71, items: ['potionmax', 'rappelmax', 'hyperball'],
    links: { s: { to: 'coeur-de-roc' }, n: { to: 'cimebrume' } },
  },
  {
    id: 'cimebrume', name: 'Cimebrume', kind: 'town', region: 2, seed: 215, w: 28, h: 26, biome: 'neige',
    center: true, shop: SHOP_LATE, gym: 'g16',
    houses: [{ name: 'Belvédère', lines: ['Vieil homme : Aldwin est le dernier obstacle avant le Mont Cendre.', 'Vieil homme : Là-haut vous attend quelqu’un que personne n’a battu.'] }],
    links: { s: { to: 'route17' }, n: { to: 'mont-cendre', needBadge: 16, block: 'Garde : Le Mont Cendre réclame les 16 badges. Aucune exception.' } },
    intro: 'Cimebrume',
  },
  {
    id: 'mont-cendre', name: 'Mont Cendre', kind: 'cave', region: 2, seed: 216, w: 28, h: 34, biome: 'grotte',
    enc: [e('golemtal', 70, 74, 14), e('titanroc', 70, 74, 12), e('cryodon', 71, 75, 10), e('souverain', 72, 76, 8), e('viperande', 71, 75, 10), e('terravor', 71, 75, 12), e('nyxpanthre', 70, 74, 12), e('pugilame', 71, 75, 12), e('fantomiroir', 71, 75, 10)],
    trainers: 3, trainerLv: 74, items: ['potionmax', 'rappelmax', 'masterball'],
    links: { s: { to: 'cimebrume' }, n: { to: 'sommet-cendre' } },
    intro: 'Mont Cendre',
  },
  {
    id: 'sommet-cendre', name: 'Sommet du Mont Cendre', kind: 'special', region: 2, seed: 217, w: 28, h: 26, biome: 'neige',
    links: { s: { to: 'mont-cendre' } },
    intro: 'Sommet du Mont Cendre',
  },
];

export const ZONE: Record<string, ZoneDef> = Object.fromEntries(ZONES.map((z) => [z.id, z]));

/* =========================================================
   ARÈNES
   ========================================================= */
export interface GymDef {
  id: string;
  order: number;
  town: string;
  name: string;
  leader: string;
  type: TypeName;
  badge: { name: string; icon: string };
  trainers: number;
  trainerLv: number;
  team: [string, number][];
  money: number;
  intro: string;
  win: string;
  lose: string;
  reward?: string;
}

export const GYMS: GymDef[] = [
  {
    id: 'g1', order: 1, town: 'serenis', name: 'Arène de Sérènis', leader: 'Basile', type: 'Insecte',
    badge: { name: 'Badge Chrysalide', icon: '🐛' }, trainers: 2, trainerLv: 10, money: 1200,
    team: [['chenilume', 10], ['vermidard', 11], ['papilore', 13]],
    intro: 'Basile : Les Insectes évoluent vite. Toi aussi ? On va voir.',
    win: 'Basile : Belle métamorphose. Le Badge Chrysalide est à toi.',
    lose: 'Basile : Reviens quand ta carapace sera plus dure.',
  },
  {
    id: 'g2', order: 2, town: 'cendrebourg', name: 'Arène de Cendrebourg', leader: 'Garvin', type: 'Roche',
    badge: { name: 'Badge Granit', icon: '🪨' }, trainers: 2, trainerLv: 14, money: 2000,
    team: [['cailloutin', 14], ['zephyroc', 15], ['rocailleux', 17]],
    intro: 'Garvin : Ici, on ne plie pas. On casse. Montre-moi ta force.',
    win: 'Garvin : Tu as fissuré ma défense. Prends le Badge Granit.',
    lose: 'Garvin : La roche a gagné. Comme d’habitude.',
  },
  {
    id: 'g3', order: 3, town: 'port-maree', name: 'Arène de Port-Marée', leader: 'Nérine', type: 'Eau',
    badge: { name: 'Badge Ressac', icon: '🌊' }, trainers: 3, trainerLv: 19, money: 2800,
    team: [['aquaillon', 19], ['ondulin', 20], ['coraline', 21], ['maremora', 23]],
    intro: 'Nérine : La marée monte toujours. Tu comptes nager longtemps ?',
    win: 'Nérine : Tu as tenu le courant. Le Badge Ressac te revient.',
    lose: 'Nérine : Emporté par le ressac. Reviens à marée basse.',
  },
  {
    id: 'g4', order: 4, town: 'fougeville', name: 'Arène de Fougèville', leader: 'Solène', type: 'Plante',
    badge: { name: 'Badge Sylve', icon: '🌿' }, trainers: 3, trainerLv: 24, money: 3600,
    team: [['bourgeonet', 24], ['kaktusai', 25], ['papilore', 25], ['florelame', 27]],
    intro: 'Solène : Une racine patiente finit toujours par fendre la pierre.',
    win: 'Solène : Tu as coupé plus vite que je ne pousse. Badge Sylve.',
    lose: 'Solène : Mes racines t’ont enlacé. Repose-toi.',
  },
  {
    id: 'g5', order: 5, town: 'voltac', name: 'Arène de Voltac', leader: 'Dorian', type: 'Électrik',
    badge: { name: 'Badge Voltage', icon: '⚡' }, trainers: 3, trainerLv: 29, money: 4400,
    team: [['voltiny', 29], ['scarabolt', 30], ['voltifer', 31], ['fulguron', 33]],
    intro: 'Dorian : Un dixième de seconde. C’est tout ce qu’il me faut.',
    win: 'Dorian : Court-circuit total. Badge Voltage, bien mérité.',
    lose: 'Dorian : Trop lent. La foudre ne prévient pas.',
  },
  {
    id: 'g6', order: 6, town: 'braisefort', name: 'Arène de Braisefort', leader: 'Iskander', type: 'Feu',
    badge: { name: 'Badge Fournaise', icon: '🔥' }, trainers: 3, trainerLv: 34, money: 5200,
    team: [['flamouflet', 34], ['magmalv', 35], ['nagaflam', 36], ['pyrolynx', 38]],
    intro: 'Iskander : Le métal se travaille chaud. Toi aussi, on va te chauffer.',
    win: 'Iskander : Trempé et affûté. Voilà le Badge Fournaise.',
    lose: 'Iskander : Encore un peu de forge et tu seras prêt.',
  },
  {
    id: 'g7', order: 7, town: 'givrelune', name: 'Arène de Givrelune', leader: 'Maëlis', type: 'Glace',
    badge: { name: 'Badge Frimas', icon: '❄️' }, trainers: 3, trainerLv: 39, money: 6000,
    team: [['gelipou', 39], ['ondinelle', 40], ['aurorix', 41], ['frimalak', 42], ['cryodon', 43]],
    intro: 'Maëlis : Respire lentement. Ici, tout finit par s’immobiliser.',
    win: 'Maëlis : Tu as brisé la glace. Le Badge Frimas est à toi.',
    lose: 'Maëlis : Gelé sur place. On se revoit au dégel.',
  },
  {
    id: 'g8', order: 8, town: 'nyxhaven', name: 'Arène de Nyxhaven', leader: 'Corvin', type: 'Spectre',
    badge: { name: 'Badge Éther', icon: '👻' }, trainers: 4, trainerLv: 44, money: 7000,
    team: [['spectrille', 44], ['ombrelune', 45], ['fantomiroir', 46], ['voilombre', 47], ['abyssire', 48]],
    intro: 'Corvin : Tu vois ce couloir ? Il n’existe pas. Moi non plus. Commençons.',
    win: 'Corvin : Tu m’as vu. Personne ne me voit. Badge Éther.',
    lose: 'Corvin : On ne combat pas ce qu’on ne peut pas toucher.',
  },

  /* ---- Orsyn ---- */
  {
    id: 'g9', order: 9, town: 'ferry-orsyn', name: 'Arène d’Escale', leader: 'Sirin', type: 'Vol',
    badge: { name: 'Badge Alizé', icon: '🪶' }, trainers: 3, trainerLv: 52, money: 8000,
    team: [['piafleur', 52], ['zephyroc', 53], ['sylphibou', 54], ['tonnerrai', 55], ['aiglombre', 56]],
    intro: 'Sirin : Valmore t’a couronné. Orsyn s’en moque. Décolle.',
    win: 'Sirin : Le vent t’a choisi. Badge Alizé.',
    lose: 'Sirin : Trop lourd pour ce ciel.',
  },
  {
    id: 'g10', order: 10, town: 'cendrelune', name: 'Arène de Cendrelune', leader: 'Bram', type: 'Sol',
    badge: { name: 'Badge Strate', icon: '⛰️' }, trainers: 3, trainerLv: 55, money: 8600,
    team: [['sablotin', 55], ['kaktusai', 56], ['terravor', 57], ['titanroc', 58], ['dunargon', 59]],
    intro: 'Bram : Sous nos pieds, mille ans de sable. Tu vas les sentir passer.',
    win: 'Bram : Tu tiens debout. Badge Strate.',
    lose: 'Bram : Le désert reprend toujours ce qu’on lui prend.',
  },
  {
    id: 'g11', order: 11, town: 'fer-de-lance', name: 'Arène de Fer-de-Lance', leader: 'Tovald', type: 'Acier',
    badge: { name: 'Badge Enclume', icon: '⚙️' }, trainers: 3, trainerLv: 58, money: 9200,
    team: [['ferrolin', 58], ['voltifer', 59], ['pugilame', 60], ['golemtal', 61], ['blindarme', 62]],
    intro: 'Tovald : Une lame ne discute pas. Elle tranche.',
    win: 'Tovald : Bien trempé. Badge Enclume.',
    lose: 'Tovald : L’acier ne cède qu’à l’acier.',
  },
  {
    id: 'g12', order: 12, town: 'sylvebrume', name: 'Arène de Sylvebrume', leader: 'Ysoline', type: 'Fée',
    badge: { name: 'Badge Clairière', icon: '🌸' }, trainers: 4, trainerLv: 60, money: 9800,
    team: [['feriole', 60], ['coraline', 61], ['aurorix', 62], ['ombrelune', 63], ['lunellia', 64]],
    intro: 'Ysoline : Ne te fie pas aux couleurs pastel, dresseur.',
    win: 'Ysoline : Le charme est rompu. Badge Clairière.',
    lose: 'Ysoline : Tu t’es endormi dans la clairière.',
  },
  {
    id: 'g13', order: 13, town: 'tourbiere', name: 'Arène de Tourbière', leader: 'Vask', type: 'Poison',
    badge: { name: 'Badge Miasme', icon: '☠️' }, trainers: 4, trainerLv: 62, money: 10400,
    team: [['toxinaze', 62], ['dardaculee', 63], ['nagaflam', 64], ['viperande', 65], ['miasmodon', 66]],
    intro: 'Vask : Le poison est patient. Moi aussi.',
    win: 'Vask : L’antidote, c’était toi. Badge Miasme.',
    lose: 'Vask : Tu sens déjà la tourbe, non ?',
  },
  {
    id: 'g14', order: 14, town: 'aiguemorte', name: 'Arène d’Aiguemorte', leader: 'Nyriel', type: 'Ténèbres',
    badge: { name: 'Badge Éclipse', icon: '🌑' }, trainers: 4, trainerLv: 64, money: 11000,
    team: [['ombracer', 64], ['mantisombre', 65], ['terravor', 66], ['nocteracine', 67], ['nyxpanthre', 68]],
    intro: 'Nyriel : Sur scène, j’ai toujours le dernier acte.',
    win: 'Nyriel : Rideau. Badge Éclipse, tu l’as arraché.',
    lose: 'Nyriel : Fin du premier acte. Le tien.',
  },
  {
    id: 'g15', order: 15, town: 'coeur-de-roc', name: 'Arène de Cœur-de-Roc', leader: 'Hektor', type: 'Combat',
    badge: { name: 'Badge Poigne', icon: '🥊' }, trainers: 4, trainerLv: 66, money: 11600,
    team: [['poingpou', 66], ['bambousai', 67], ['pugilame', 68], ['chimerok', 69], ['karateur', 70]],
    intro: 'Hektor : Vingt ans de dojo. Trois défaites. Tu veux la quatrième ?',
    win: 'Hektor : Quatrième. Et méritée. Badge Poigne.',
    lose: 'Hektor : Encore trois. Reviens t’entraîner.',
  },
  {
    id: 'g16', order: 16, town: 'cimebrume', name: 'Arène de Cimebrume', leader: 'Aldwin', type: 'Dragon',
    badge: { name: 'Badge Cime', icon: '🐉' }, trainers: 4, trainerLv: 68, money: 13000,
    team: [['draconnet', 68], ['cryodon', 69], ['viperande', 70], ['drakoral', 71], ['souverain', 73]],
    intro: 'Aldwin : Derrière moi, le Mont Cendre. Devant moi, toi. Prouve-le.',
    win: 'Aldwin : Monte, alors. Le Badge Cime ouvre la voie.',
    lose: 'Aldwin : Le sommet n’est pas pour aujourd’hui.',
  },
];

export const GYM: Record<string, GymDef> = Object.fromEntries(GYMS.map((g) => [g.id, g]));
export const GYM_BY_TOWN: Record<string, GymDef> = Object.fromEntries(GYMS.map((g) => [g.town, g]));

/* =========================================================
   LIGUE & BOSS FINAL
   ========================================================= */
export interface BossDef {
  id: string;
  title: string;
  name: string;
  team: [string, number][];
  money: number;
  intro: string;
  win: string;
  lose: string;
}

export const LEAGUE: BossDef[] = [
  {
    id: 'e1', title: 'Conseil des 4', name: 'Théa', money: 12000,
    team: [['toxinaze', 48], ['dardaculee', 49], ['voilombre', 50], ['nagaflam', 50], ['miasmodon', 52]],
    intro: 'Théa : Premier maillon du Conseil. Le plus doux, disent-ils. Ils mentent.',
    win: 'Théa : Passe. Les suivants ne seront pas tendres.',
    lose: 'Théa : Le venin fait toujours effet, à la fin.',
  },
  {
    id: 'e2', title: 'Conseil des 4', name: 'Rovan', money: 13000,
    team: [['poingpou', 50], ['bambousai', 51], ['pugilame', 52], ['chimerok', 52], ['karateur', 54]],
    intro: 'Rovan : Pas de technique fumeuse ici. De la force. Debout.',
    win: 'Rovan : Solide. Vraiment solide. Continue.',
    lose: 'Rovan : Relève-toi et reviens.',
  },
  {
    id: 'e3', title: 'Conseil des 4', name: 'Ilyane', money: 14000,
    team: [['psykid', 52], ['papilore', 53], ['sylphibou', 54], ['fantomiroir', 54], ['mentalor', 56]],
    intro: 'Ilyane : J’ai déjà vu ce combat. Trois fois. Tu perds à chaque fois.',
    win: 'Ilyane : … la quatrième version m’avait échappé. Bravo.',
    lose: 'Ilyane : Comme prévu. Exactement comme prévu.',
  },
  {
    id: 'e4', title: 'Conseil des 4', name: 'Draguen', money: 15000,
    team: [['draconnet', 54], ['viperande', 55], ['cryodon', 56], ['drakoral', 56], ['souverain', 58]],
    intro: 'Draguen : Dernier rempart avant la Championne. Fais vite, ou pas du tout.',
    win: 'Draguen : Les dragons t’ont reconnu. Va la voir.',
    lose: 'Draguen : Le rempart tient encore.',
  },
  {
    id: 'champ', title: 'Championne de Valmore', name: 'Auréa', money: 25000,
    team: [['aiglombre', 56], ['maremora', 57], ['golemtal', 57], ['nyxpanthre', 58], ['lunellia', 58], ['souverain', 60]],
    intro: 'Auréa : Bienvenue au bout du chemin. Maintenant, montre-moi qui tu es vraiment.',
    win: 'Auréa : Valmore a une nouvelle Maîtresse… un nouveau Maître. Félicitations.',
    lose: 'Auréa : Presque. Reviens, je t’attends.',
  },
];

export const FINAL_BOSS: BossDef = {
  id: 'boss-final', title: 'Le Reclus du Mont Cendre', name: 'Émeric', money: 60000,
  team: [['pyrodrakon', 78], ['abyssire', 78], ['nocteracine', 78], ['souverain', 80], ['chronos', 80], ['tenebrarch', 82]],
  intro: '…\n(Il ne dit rien. Il envoie sa première créature.)',
  win: 'Émeric : … Bien joué.\n(Il s’incline, et le silence retombe sur le sommet.)',
  lose: '…\n(Il attend déjà le prochain.)',
};

export const RIVAL_NAME = 'Nova';

/** Contre-starter choisi par le rival. */
export const RIVAL_COUNTER: Record<string, string> = {
  brasillon: 'ondulin',    // Eau > Feu
  ondulin: 'germinuit',    // Plante > Eau
  germinuit: 'brasillon',  // Feu > Plante
};

/** Rencontres légendaires fixes (post-Ligue pour la plupart). */
export const STATIC_ENCOUNTERS: { zone: string; sp: string; lv: number; flag: string; text: string }[] = [
  { zone: 'route7', sp: 'ignivore', lv: 70, flag: 'leg_ignivore', text: 'Un rugissement monte du cratère… IGNIVORE surgit !' },
  { zone: 'route4', sp: 'abyssaltar', lv: 70, flag: 'leg_abyssaltar', text: 'La mer se retire d’un coup… ABYSSALTAR émerge !' },
  { zone: 'route13', sp: 'sylvanor', lv: 70, flag: 'leg_sylvanor', text: 'La forêt s’écarte… SYLVANOR apparaît !' },
  { zone: 'mont-cendre', sp: 'chronos', lv: 75, flag: 'leg_chronos', text: 'Un tic-tac résonne dans la caverne… CHRONOSS s’active !' },
];

export const TRAINER_CLASSES = [
  'Gamin', 'Randonneur', 'Pêcheur', 'Scout', 'Montagnard', 'Étudiante', 'Rockeur',
  'Vétérante', 'Dresseur', 'Dresseuse', 'Naturaliste', 'Motard', 'Duelliste', 'Ermite',
];

export const START_ZONE = 'bourg-aurore';
