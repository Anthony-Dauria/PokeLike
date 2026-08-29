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
    enc: [e('rattata', 2, 5, 30), e('pidgey', 2, 5, 28), e('caterpie', 2, 4, 22), e('starly', 3, 5, 20)],
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
    enc: [e('caterpie', 5, 9, 18), e('metapod', 7, 10, 9), e('pidgey', 5, 9, 16), e('rattata', 6, 9, 13), e('gastly', 7, 10, 8), e('bulbasaur', 6, 9, 5), e('chikorita', 6, 9, 5), e('treecko', 6, 9, 5), e('turtwig', 6, 9, 5), e('snivy', 6, 9, 5), e('chespin', 6, 9, 5), e('rowlet', 6, 9, 5), e('grookey', 6, 9, 5), e('sprigatito', 6, 9, 5)],
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
    enc: [e('geodude', 10, 14, 24), e('starly', 10, 14, 18), e('sandshrew', 11, 14, 16), e('machop', 11, 15, 14), e('aron', 12, 15, 12), e('diglett', 10, 14, 10), e('houndour', 13, 15, 6)],
    trainers: 3, trainerLv: 15, items: ['ball', 'superpotion'],
    links: { s: { to: 'cendrebourg' }, n: { to: 'grotte-echo' } },
  },
  {
    id: 'grotte-echo', name: 'Grotte de l’Écho', kind: 'cave', region: 1, seed: 107, w: 26, h: 26, biome: 'grotte',
    enc: [e('geodude', 13, 17, 24), e('graveler', 15, 18, 10), e('zubat', 13, 17, 22), e('golbat', 16, 18, 8), e('onix', 15, 18, 10), e('magnemite', 14, 17, 14), e('larvitar', 15, 18, 7), e('gible', 15, 18, 5)],
    trainers: 2, trainerLv: 18, items: ['hyperpotion', 'superball'],
    links: { s: { to: 'route3' }, n: { to: 'route4' } },
    intro: 'Grotte de l’Écho',
  },
  {
    id: 'route4', name: 'Route 4', kind: 'route', region: 1, seed: 108, w: 24, h: 26, biome: 'plage',
    enc: [e('magikarp', 16, 20, 22), e('pidgey', 16, 19, 16), e('starly', 16, 19, 14), e('lapras', 19, 21, 4), e('squirtle', 16, 20, 6), e('mudkip', 16, 20, 6), e('oshawott', 16, 20, 6), e('popplio', 16, 20, 6), e('froakie', 16, 20, 6), e('sobble', 16, 20, 5), e('quaxly', 16, 20, 5), e('totodile', 16, 20, 5), e('piplup', 16, 20, 5)],
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
    enc: [e('butterfree', 21, 25, 14), e('pidgeotto', 22, 25, 16), e('abra', 21, 24, 12), e('eevee', 22, 25, 10), e('gastly', 21, 25, 14), e('ekans', 21, 24, 12), e('hoothoot', 22, 25, 12), e('ralts', 23, 26, 10)],
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
    enc: [e('mareep', 26, 30, 20), e('pikachu', 27, 30, 14), e('shinx', 26, 30, 18), e('magnemite', 27, 30, 12), e('raticate', 27, 30, 12), e('staravia', 28, 31, 12), e('togepi', 28, 31, 6), e('clefairy', 28, 31, 6)],
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
    enc: [e('houndour', 31, 35, 16), e('koffing', 31, 35, 14), e('geodude', 31, 34, 12), e('graveler', 32, 35, 10), e('salandit', 33, 36, 12), e('charmander', 31, 35, 5), e('cyndaquil', 31, 35, 5), e('torchic', 31, 35, 5), e('chimchar', 31, 35, 5), e('tepig', 31, 35, 4), e('fennekin', 31, 35, 4), e('litten', 31, 35, 4), e('scorbunny', 31, 35, 4), e('fuecoco', 31, 35, 4)],
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
    enc: [e('swinub', 36, 40, 20), e('snorunt', 36, 40, 16), e('cubchoo', 37, 41, 14), e('sneasel', 38, 41, 12), e('piloswine', 39, 42, 10), e('golbat', 36, 40, 12), e('machoke', 38, 41, 10), e('beartic', 41, 42, 6)],
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
    enc: [e('koffing', 41, 45, 14), e('weezing', 43, 46, 10), e('haunter', 42, 46, 12), e('ekans', 41, 44, 12), e('arbok', 43, 46, 10), e('umbreon', 43, 46, 10), e('sneasel', 42, 45, 12), e('salandit', 41, 45, 12), e('salazzle', 44, 47, 8), e('gengar', 45, 47, 4)],
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
    enc: [e('golbat', 46, 50, 12), e('graveler', 46, 50, 12), e('golem', 48, 52, 8), e('machoke', 46, 50, 10), e('machamp', 48, 52, 6), e('onix', 46, 50, 8), e('steelix', 48, 52, 6), e('kadabra', 46, 50, 10), e('dragonair', 47, 51, 8), e('gabite', 47, 51, 8), e('lairon', 46, 50, 8), e('aggron', 49, 52, 5), e('pupitar', 47, 51, 7), e('tyranitar', 50, 52, 2)],
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
    enc: [e('sandslash', 50, 54, 16), e('dugtrio', 50, 54, 14), e('hippopotas', 52, 56, 14), e('hippowdon', 55, 58, 8), e('arbok', 52, 56, 12), e('salazzle', 53, 57, 12), e('gabite', 53, 57, 12), e('garchomp', 56, 58, 4), e('houndoom', 53, 57, 8)],
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
    enc: [e('aggron', 57, 61, 12), e('magnezone', 57, 61, 12), e('skarmory', 56, 60, 14), e('steelix', 57, 61, 12), e('golem', 56, 60, 12), e('tyranitar', 58, 62, 8), e('hakamo-o', 57, 61, 12), e('lairon', 55, 59, 14), e('glalie', 56, 60, 4)],
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
    enc: [e('togekiss', 60, 64, 10), e('sylveon', 60, 64, 12), e('espeon', 59, 63, 12), e('umbreon', 59, 63, 12), e('gardevoir', 60, 64, 10), e('delphox', 60, 64, 10), e('serperior', 60, 64, 10), e('decidueye', 60, 64, 10), e('meowscarada', 60, 64, 8), e('clefable', 58, 62, 6)],
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
    enc: [e('weezing', 62, 66, 14), e('salazzle', 62, 66, 12), e('arbok', 61, 65, 12), e('gengar', 63, 67, 10), e('zweilous', 62, 66, 12), e('mimikyu', 62, 66, 12), e('drakloak', 62, 66, 12), e('hydreigon', 66, 68, 4), e('dragapult', 66, 68, 4), e('incineroar', 62, 66, 8)],
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
    enc: [e('staraptor', 63, 67, 14), e('noctowl', 62, 66, 12), e('luxray', 63, 67, 14), e('houndoom', 63, 67, 12), e('incineroar', 64, 68, 10), e('cinderace', 64, 68, 10), e('pawmot', 63, 67, 12), e('raichu', 62, 66, 10), e('emboar', 64, 68, 8)],
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
    enc: [e('machamp', 65, 69, 14), e('hakamo-o', 65, 69, 12), e('kommo-o', 68, 70, 6), e('aggron', 66, 70, 12), e('rillaboom', 66, 70, 12), e('chesnaught', 66, 70, 12), e('quaquaval', 66, 70, 12), e('beartic', 65, 69, 10), e('samurott', 66, 70, 10)],
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
    enc: [e('mamoswine', 67, 71, 14), e('beartic', 66, 70, 12), e('glalie', 66, 70, 12), e('piloswine', 65, 69, 12), e('lapras', 67, 71, 10), e('dragonair', 66, 70, 12), e('noivern', 68, 72, 10), e('samurott', 67, 71, 10), e('inteleon', 68, 72, 8)],
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
    enc: [e('steelix', 70, 74, 12), e('golem', 70, 74, 12), e('machamp', 70, 74, 12), e('gengar', 71, 75, 10), e('hydreigon', 72, 76, 8), e('haxorus', 71, 75, 10), e('dragapult', 72, 76, 8), e('garchomp', 71, 75, 10), e('tyranitar', 71, 75, 10), e('kommo-o', 71, 75, 8)],
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
    team: [['caterpie', 10], ['metapod', 11], ['butterfree', 13]],
    intro: 'Basile : Les Insectes évoluent vite. Toi aussi ? On va voir.',
    win: 'Basile : Belle métamorphose. Le Badge Chrysalide est à toi.',
    lose: 'Basile : Reviens quand ta carapace sera plus dure.',
  },
  {
    id: 'g2', order: 2, town: 'cendrebourg', name: 'Arène de Cendrebourg', leader: 'Garvin', type: 'Roche',
    badge: { name: 'Badge Granit', icon: '🪨' }, trainers: 2, trainerLv: 14, money: 2000,
    team: [['geodude', 14], ['onix', 15], ['graveler', 17]],
    intro: 'Garvin : Ici, on ne plie pas. On casse. Montre-moi ta force.',
    win: 'Garvin : Tu as fissuré ma défense. Prends le Badge Granit.',
    lose: 'Garvin : La roche a gagné. Comme d’habitude.',
  },
  {
    id: 'g3', order: 3, town: 'port-maree', name: 'Arène de Port-Marée', leader: 'Nérine', type: 'Eau',
    badge: { name: 'Badge Ressac', icon: '🌊' }, trainers: 3, trainerLv: 19, money: 2800,
    team: [['squirtle', 19], ['oshawott', 20], ['popplio', 21], ['wartortle', 23]],
    intro: 'Nérine : La marée monte toujours. Tu comptes nager longtemps ?',
    win: 'Nérine : Tu as tenu le courant. Le Badge Ressac te revient.',
    lose: 'Nérine : Emporté par le ressac. Reviens à marée basse.',
  },
  {
    id: 'g4', order: 4, town: 'fougeville', name: 'Arène de Fougèville', leader: 'Solène', type: 'Plante',
    badge: { name: 'Badge Sylve', icon: '🌿' }, trainers: 3, trainerLv: 24, money: 3600,
    team: [['chikorita', 24], ['turtwig', 25], ['ivysaur', 25], ['grotle', 27]],
    intro: 'Solène : Une racine patiente finit toujours par fendre la pierre.',
    win: 'Solène : Tu as coupé plus vite que je ne pousse. Badge Sylve.',
    lose: 'Solène : Mes racines t’ont enlacé. Repose-toi.',
  },
  {
    id: 'g5', order: 5, town: 'voltac', name: 'Arène de Voltac', leader: 'Dorian', type: 'Électrik',
    badge: { name: 'Badge Voltage', icon: '⚡' }, trainers: 3, trainerLv: 29, money: 4400,
    team: [['mareep', 29], ['pikachu', 30], ['shinx', 30], ['flaaffy', 31], ['luxio', 33]],
    intro: 'Dorian : Un dixième de seconde. C’est tout ce qu’il me faut.',
    win: 'Dorian : Court-circuit total. Badge Voltage, bien mérité.',
    lose: 'Dorian : Trop lent. La foudre ne prévient pas.',
  },
  {
    id: 'g6', order: 6, town: 'braisefort', name: 'Arène de Braisefort', leader: 'Iskander', type: 'Feu',
    badge: { name: 'Badge Fournaise', icon: '🔥' }, trainers: 3, trainerLv: 34, money: 5200,
    team: [['charmeleon', 34], ['quilava', 35], ['monferno', 36], ['combusken', 36], ['torracat', 38]],
    intro: 'Iskander : Le métal se travaille chaud. Toi aussi, on va te chauffer.',
    win: 'Iskander : Trempé et affûté. Voilà le Badge Fournaise.',
    lose: 'Iskander : Encore un peu de forge et tu seras prêt.',
  },
  {
    id: 'g7', order: 7, town: 'givrelune', name: 'Arène de Givrelune', leader: 'Maëlis', type: 'Glace',
    badge: { name: 'Badge Frimas', icon: '❄️' }, trainers: 3, trainerLv: 39, money: 6000,
    team: [['swinub', 39], ['snorunt', 40], ['cubchoo', 41], ['piloswine', 42], ['glalie', 43]],
    intro: 'Maëlis : Respire lentement. Ici, tout finit par s’immobiliser.',
    win: 'Maëlis : Tu as brisé la glace. Le Badge Frimas est à toi.',
    lose: 'Maëlis : Gelé sur place. On se revoit au dégel.',
  },
  {
    id: 'g8', order: 8, town: 'nyxhaven', name: 'Arène de Nyxhaven', leader: 'Corvin', type: 'Spectre',
    badge: { name: 'Badge Éther', icon: '👻' }, trainers: 4, trainerLv: 44, money: 7000,
    team: [['gastly', 44], ['haunter', 45], ['mimikyu', 46], ['drakloak', 47], ['gengar', 48]],
    intro: 'Corvin : Tu vois ce couloir ? Il n’existe pas. Moi non plus. Commençons.',
    win: 'Corvin : Tu m’as vu. Personne ne me voit. Badge Éther.',
    lose: 'Corvin : On ne combat pas ce qu’on ne peut pas toucher.',
  },

  /* ---- Orsyn ---- */
  {
    id: 'g9', order: 9, town: 'ferry-orsyn', name: 'Arène d’Escale', leader: 'Sirin', type: 'Vol',
    badge: { name: 'Badge Alizé', icon: '🪶' }, trainers: 3, trainerLv: 52, money: 8000,
    team: [['starly', 52], ['noctowl', 53], ['staravia', 54], ['skarmory', 55], ['staraptor', 56]],
    intro: 'Sirin : Valmore t’a couronné. Orsyn s’en moque. Décolle.',
    win: 'Sirin : Le vent t’a choisi. Badge Alizé.',
    lose: 'Sirin : Trop lourd pour ce ciel.',
  },
  {
    id: 'g10', order: 10, town: 'cendrelune', name: 'Arène de Cendrelune', leader: 'Bram', type: 'Sol',
    badge: { name: 'Badge Strate', icon: '⛰️' }, trainers: 3, trainerLv: 55, money: 8600,
    team: [['sandslash', 55], ['dugtrio', 56], ['hippopotas', 57], ['mamoswine', 58], ['hippowdon', 59]],
    intro: 'Bram : Sous nos pieds, mille ans de sable. Tu vas les sentir passer.',
    win: 'Bram : Tu tiens debout. Badge Strate.',
    lose: 'Bram : Le désert reprend toujours ce qu’on lui prend.',
  },
  {
    id: 'g11', order: 11, town: 'fer-de-lance', name: 'Arène de Fer-de-Lance', leader: 'Tovald', type: 'Acier',
    badge: { name: 'Badge Enclume', icon: '⚙️' }, trainers: 3, trainerLv: 58, money: 9200,
    team: [['magneton', 58], ['skarmory', 59], ['lairon', 60], ['magnezone', 61], ['aggron', 62]],
    intro: 'Tovald : Une lame ne discute pas. Elle tranche.',
    win: 'Tovald : Bien trempé. Badge Enclume.',
    lose: 'Tovald : L’acier ne cède qu’à l’acier.',
  },
  {
    id: 'g12', order: 12, town: 'sylvebrume', name: 'Arène de Sylvebrume', leader: 'Ysoline', type: 'Fée',
    badge: { name: 'Badge Clairière', icon: '🌸' }, trainers: 4, trainerLv: 60, money: 9800,
    team: [['clefairy', 60], ['togetic', 61], ['sylveon', 62], ['gardevoir', 63], ['togekiss', 64]],
    intro: 'Ysoline : Ne te fie pas aux couleurs pastel, dresseur.',
    win: 'Ysoline : Le charme est rompu. Badge Clairière.',
    lose: 'Ysoline : Tu t’es endormi dans la clairière.',
  },
  {
    id: 'g13', order: 13, town: 'tourbiere', name: 'Arène de Tourbière', leader: 'Vask', type: 'Poison',
    badge: { name: 'Badge Miasme', icon: '☠️' }, trainers: 4, trainerLv: 62, money: 10400,
    team: [['ekans', 62], ['koffing', 63], ['salazzle', 64], ['arbok', 65], ['weezing', 66]],
    intro: 'Vask : Le poison est patient. Moi aussi.',
    win: 'Vask : L’antidote, c’était toi. Badge Miasme.',
    lose: 'Vask : Tu sens déjà la tourbe, non ?',
  },
  {
    id: 'g14', order: 14, town: 'aiguemorte', name: 'Arène d’Aiguemorte', leader: 'Nyriel', type: 'Ténèbres',
    badge: { name: 'Badge Éclipse', icon: '🌑' }, trainers: 4, trainerLv: 64, money: 11000,
    team: [['houndour', 64], ['sneasel', 65], ['umbreon', 66], ['houndoom', 67], ['tyranitar', 68]],
    intro: 'Nyriel : Sur scène, j’ai toujours le dernier acte.',
    win: 'Nyriel : Rideau. Badge Éclipse, tu l’as arraché.',
    lose: 'Nyriel : Fin du premier acte. Le tien.',
  },
  {
    id: 'g15', order: 15, town: 'coeur-de-roc', name: 'Arène de Cœur-de-Roc', leader: 'Hektor', type: 'Combat',
    badge: { name: 'Badge Poigne', icon: '🥊' }, trainers: 4, trainerLv: 66, money: 11600,
    team: [['riolu', 66], ['hakamo-o', 67], ['blaziken', 68], ['kommo-o', 69], ['machamp', 70]],
    intro: 'Hektor : Vingt ans de dojo. Trois défaites. Tu veux la quatrième ?',
    win: 'Hektor : Quatrième. Et méritée. Badge Poigne.',
    lose: 'Hektor : Encore trois. Reviens t’entraîner.',
  },
  {
    id: 'g16', order: 16, town: 'cimebrume', name: 'Arène de Cimebrume', leader: 'Aldwin', type: 'Dragon',
    badge: { name: 'Badge Cime', icon: '🐉' }, trainers: 4, trainerLv: 68, money: 13000,
    team: [['dragonair', 68], ['fraxure', 69], ['noivern', 70], ['haxorus', 71], ['garchomp', 73]],
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
    team: [['koffing', 48], ['arbok', 49], ['weezing', 50], ['salazzle', 50], ['gengar', 52]],
    intro: 'Théa : Premier maillon du Conseil. Le plus doux, disent-ils. Ils mentent.',
    win: 'Théa : Passe. Les suivants ne seront pas tendres.',
    lose: 'Théa : Le venin fait toujours effet, à la fin.',
  },
  {
    id: 'e2', title: 'Conseil des 4', name: 'Rovan', money: 13000,
    team: [['machoke', 50], ['riolu', 51], ['hakamo-o', 52], ['blaziken', 52], ['machamp', 54]],
    intro: 'Rovan : Pas de technique fumeuse ici. De la force. Debout.',
    win: 'Rovan : Solide. Vraiment solide. Continue.',
    lose: 'Rovan : Relève-toi et reviens.',
  },
  {
    id: 'e3', title: 'Conseil des 4', name: 'Ilyane', money: 14000,
    team: [['kadabra', 52], ['espeon', 53], ['delphox', 54], ['gardevoir', 54], ['alakazam', 56]],
    intro: 'Ilyane : J’ai déjà vu ce combat. Trois fois. Tu perds à chaque fois.',
    win: 'Ilyane : … la quatrième version m’avait échappé. Bravo.',
    lose: 'Ilyane : Comme prévu. Exactement comme prévu.',
  },
  {
    id: 'e4', title: 'Conseil des 4', name: 'Draguen', money: 15000,
    team: [['dragonair', 54], ['gabite', 55], ['fraxure', 56], ['noivern', 56], ['salamence', 58]],
    intro: 'Draguen : Dernier rempart avant la Championne. Fais vite, ou pas du tout.',
    win: 'Draguen : Les dragons t’ont reconnu. Va la voir.',
    lose: 'Draguen : Le rempart tient encore.',
  },
  {
    id: 'champ', title: 'Championne de Valmore', name: 'Auréa', money: 25000,
    team: [['staraptor', 56], ['lapras', 57], ['aggron', 57], ['umbreon', 58], ['togekiss', 58], ['dragonite', 60]],
    intro: 'Auréa : Bienvenue au bout du chemin. Maintenant, montre-moi qui tu es vraiment.',
    win: 'Auréa : Valmore a une nouvelle Maîtresse… un nouveau Maître. Félicitations.',
    lose: 'Auréa : Presque. Reviens, je t’attends.',
  },
];

export const FINAL_BOSS: BossDef = {
  id: 'boss-final', title: 'Le Reclus du Mont Cendre', name: 'Émeric', money: 60000,
  team: [['pyrodrakon', 78], ['abyssire', 78], ['nocteracine', 78], ['dragonite', 80], ['tyranitar', 80], ['mewtwo', 82]],
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
  { zone: 'route7', sp: 'rayquaza', lv: 70, flag: 'leg_rayquaza', text: 'Le ciel se déchire au-dessus du cratère… RAYQUAZA descend !' },
  { zone: 'route4', sp: 'lugia', lv: 70, flag: 'leg_lugia', text: 'La mer se retire d’un coup… LUGIA émerge des flots !' },
  { zone: 'route13', sp: 'xerneas', lv: 70, flag: 'leg_xerneas', text: 'La forêt s’illumine d’un seul coup… XERNEAS apparaît !' },
  { zone: 'route9', sp: 'darkrai', lv: 70, flag: 'leg_darkrai', text: 'Le marais s’assombrit brutalement… DARKRAI se manifeste !' },
  { zone: 'route12', sp: 'zekrom', lv: 72, flag: 'leg_zekrom', text: 'Un éclair noir frappe la crête… ZEKROM vous défie !' },
  { zone: 'route17', sp: 'zacian', lv: 72, flag: 'leg_zacian', text: 'Une lame bleue fend la neige… ZACIAN bondit !' },
  { zone: 'mont-cendre', sp: 'koraidon', lv: 75, flag: 'leg_koraidon', text: 'Un rugissement d’un autre âge résonne… KORAIDON surgit !' },
];

export const TRAINER_CLASSES = [
  'Gamin', 'Randonneur', 'Pêcheur', 'Scout', 'Montagnard', 'Étudiante', 'Rockeur',
  'Vétérante', 'Dresseur', 'Dresseuse', 'Naturaliste', 'Motard', 'Duelliste', 'Ermite',
];

export const START_ZONE = 'bourg-aurore';
