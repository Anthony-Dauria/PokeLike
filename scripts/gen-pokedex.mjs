// Génère src/data/pokedex.gen.ts à partir de :
//  - @pkmn/dex  : types, statistiques de base, chaînes d'évolution (gén. 1 à 9)
//  - pokemon    : noms français officiels
//  - scripts/roster-*.mjs : descripteurs visuels écrits à la main
// Aucun asset graphique n'est copié : seules des données chiffrées sont utilisées.
import { writeFileSync } from 'node:fs';
import { Dex } from '@pkmn/dex';
import pokemonNames from 'pokemon';
import roster1 from './roster-1.mjs';
import roster2 from './roster-2.mjs';
import roster3 from './roster-3.mjs';

const dex = Dex.forGen(9);
const ROSTER = [...roster1, ...roster2, ...roster3];
const IDS = new Set(ROSTER.map((r) => r[0]));

const TYPE_FR = {
  Normal: 'Normal', Fire: 'Feu', Water: 'Eau', Grass: 'Plante', Electric: 'Électrik',
  Ice: 'Glace', Fighting: 'Combat', Poison: 'Poison', Ground: 'Sol', Flying: 'Vol',
  Psychic: 'Psy', Bug: 'Insecte', Rock: 'Roche', Ghost: 'Spectre', Dragon: 'Dragon',
  Dark: 'Ténèbres', Steel: 'Acier', Fairy: 'Fée',
};

// Niveau retenu quand l'évolution d'origine ne se fait pas par niveau
// (pierre, bonheur, échange…) : le jeu ne gère que la montée de niveau.
const EVO_FALLBACK = { levelFriendship: 22, useItem: 30, trade: 36, levelHold: 32, levelMove: 32, levelExtra: 32 };

/** Quelques descriptions écrites pour les espèces les plus emblématiques. */
const FLAVOR = {
  bulbasaur: 'Le bulbe sur son dos grandit en absorbant la lumière du soleil.',
  charmander: 'La flamme de sa queue faiblit quand il est fatigué ; elle ne s’éteint jamais.',
  squirtle: 'Sa carapace ne sert pas qu’à se protéger : elle réduit la résistance à la nage.',
  charizard: 'Il crache un feu assez chaud pour faire fondre la roche. Il évite les zones habitées.',
  venusaur: 'Sa fleur dégage un parfum qui apaise ceux qui l’approchent.',
  blastoise: 'Les canons de sa carapace projettent l’eau avec une précision redoutable.',
  pikachu: 'Il stocke l’électricité dans ses joues et la décharge quand il se sent menacé.',
  eevee: 'Son patrimoine génétique instable lui ouvre plusieurs voies d’évolution.',
  gengar: 'On raconte qu’il se glisse dans l’ombre des voyageurs pour leur voler leur chaleur.',
  snorlax: 'Il ne se réveille que pour manger. Rien d’autre ne le dérange.',
  dragonite: 'Malgré sa masse, il traverse les océans plus vite qu’un avion.',
  gyarados: 'Sa colère est légendaire : elle peut raser une ville entière.',
  lapras: 'Son chant traverse les océans. On n’en croise presque plus.',
  mewtwo: 'Créé en laboratoire, son pouvoir mental dépasse celui de son modèle.',
  alakazam: 'Son cerveau ne cesse de croître. Il retient tout ce qu’il a vu.',
  machamp: 'Ses quatre bras enchaînent des milliers de coups par minute.',
  onix: 'Il creuse à cinquante à l’heure et laisse des galeries sous les montagnes.',
  lugia: 'On dit qu’il dort au fond des mers pour ne pas déclencher de tempêtes.',
  tyranitar: 'Il change le paysage en marchant. Les montagnes ne l’arrêtent pas.',
  typhlosion: 'La chaleur qu’il dégage fait onduler l’air autour de lui.',
  feraligatr: 'Une fois ses crocs plantés, il ne lâche plus rien.',
  meganium: 'Le parfum de sa fleur calme les esprits agressifs.',
  ampharos: 'Sa queue brille assez fort pour servir de phare.',
  blaziken: 'Ses jambes projettent des flammes à chaque coup de pied.',
  sceptile: 'Les graines de son dos contiennent des nutriments concentrés.',
  swampert: 'Il déplace des rochers d’une tonne sans ralentir.',
  gardevoir: 'Elle perçoit les émotions et crée un petit trou noir pour protéger son dresseur.',
  salamence: 'Son rêve de voler s’est réalisé ; il ne redescend presque plus.',
  rayquaza: 'Il vit dans la couche d’ozone et n’en descend qu’en cas de crise.',
  garchomp: 'Ses ailes en forme de lames lui permettent de voler à la vitesse du son.',
  lucario: 'Il lit l’aura des êtres vivants et devine leurs intentions.',
  infernape: 'La flamme de sa tête ne s’éteint jamais, même sous l’averse.',
  torterra: 'De petits Pokémon s’installent parfois sur son dos comme sur une île.',
  empoleon: 'Les trois cornes de son bec fendent les banquises.',
  darkrai: 'Sa seule présence plonge les dormeurs dans des cauchemars.',
  serperior: 'Son regard suffit à figer ceux qui lui manquent de respect.',
  hydreigon: 'Ses trois têtes ne se coordonnent pas : elles dévorent tout ce qui bouge.',
  haxorus: 'Ses défenses tranchent l’acier et repoussent quand elles se brisent.',
  zekrom: 'Sa queue produit assez d’électricité pour alimenter un pays.',
  greninja: 'Il compresse l’eau en lames et frappe avant qu’on le voie.',
  delphox: 'Elle lit l’avenir dans la flamme au bout de sa branche.',
  chesnaught: 'Sa carapace encaisse une explosion sans qu’il recule d’un pas.',
  xerneas: 'Ses bois diffusent la vie à ceux qui l’entourent.',
  decidueye: 'Il tire ses flèches de plumes en un dixième de seconde.',
  incineroar: 'Il joue pour le public autant que pour gagner.',
  primarina: 'Ses ballons d’eau explosent au rythme de son chant.',
  mimikyu: 'Personne ne sait ce qu’il y a sous le déguisement. Personne n’a survécu pour le dire.',
  kommo_o: 'Ses écailles s’entrechoquent comme une armure de guerre.',
  rillaboom: 'Son tambour de bois commande les racines alentour.',
  cinderace: 'Il transforme un caillou en ballon de feu d’un coup de pied.',
  inteleon: 'Il analyse la scène du haut de son perchoir avant de tirer.',
  dragapult: 'Il envoie ses petits au combat comme des missiles. Ils adorent ça.',
  zacian: 'Son épée légendaire tranche tout ce qui se dresse devant lui.',
  meowscarada: 'Chaque coup est un tour de magie : on ne voit jamais le vrai.',
  skeledirge: 'Le petit oiseau de flamme sur sa tête chante avec lui.',
  quaquaval: 'Chacun de ses coups de pied est une figure de danse.',
  koraidon: 'Une forme ancienne, surgie d’un passé que personne n’a documenté.',
};

const rows = [];
const warnings = [];

for (const [id, shape, featStr, scale, body, accent] of ROSTER) {
  const sp = dex.species.get(id);
  if (!sp || !sp.exists) { warnings.push(`espèce introuvable : ${id}`); continue; }

  const types = sp.types.map((t) => TYPE_FR[t] ?? t);
  if (types.some((t) => !t)) warnings.push(`type non traduit pour ${id}`);

  // Évolution : on ne garde que les cibles présentes dans le roster.
  const evos = (sp.evos ?? []).map((n) => dex.species.get(n)).filter((e) => e && IDS.has(e.id));
  let evo = null, evoAlt = null;
  if (evos.length) {
    const first = evos[0];
    const lv = first.evoLevel ?? EVO_FALLBACK[first.evoType] ?? 32;
    evo = { to: first.id, lv };
    if (evos.length > 1) evoAlt = evos.map((e) => e.id);
  }

  const legend = (sp.tags ?? []).some((t) => /Legendary|Mythical|Paradox/.test(t));
  const bst = sp.bst;
  const catchRate = legend ? 3
    : !evos.length && bst >= 520 ? 45
    : !evos.length ? 90
    : sp.prevo ? 100
    : 190;

  const nameFr = pokemonNames.getName(sp.num, 'fr');
  if (!nameFr) warnings.push(`nom français manquant pour ${id}`);

  const flavor = FLAVOR[id] ?? FLAVOR[id.replace(/-/g, '_')]
    ?? `${types.join('/')} · ${sp.weightkg} kg · Génération ${sp.gen}.`;

  rows.push({
    dex: sp.num, id, name: nameFr ?? sp.name, types,
    base: { hp: sp.baseStats.hp, atk: sp.baseStats.atk, def: sp.baseStats.def, spa: sp.baseStats.spa, spd: sp.baseStats.spd, spe: sp.baseStats.spe },
    shape, feats: featStr ? featStr.split('+') : [], scale, body, accent,
    catchRate, evo, evoAlt, legend, gen: sp.gen, flavor,
  });
}

rows.sort((a, b) => a.dex - b.dex);

const q = (s) => JSON.stringify(s);
const lines = rows.map((r) => {
  const parts = [
    `dex: ${r.dex}`, `id: ${q(r.id)}`, `name: ${q(r.name)}`,
    `types: [${r.types.map(q).join(', ')}]`,
    `base: { hp: ${r.base.hp}, atk: ${r.base.atk}, def: ${r.base.def}, spa: ${r.base.spa}, spd: ${r.base.spd}, spe: ${r.base.spe} }`,
    `shape: ${q(r.shape)}`, `feats: [${r.feats.map(q).join(', ')}]`,
    `scale: ${r.scale}`, `body: ${q(r.body)}`, `accent: ${q(r.accent)}`,
    `catchRate: ${r.catchRate}`, `gen: ${r.gen}`,
  ];
  if (r.evo) parts.push(`evo: { to: ${q(r.evo.to)}, lv: ${r.evo.lv} }`);
  if (r.evoAlt) parts.push(`evoAlt: [${r.evoAlt.map(q).join(', ')}]`);
  if (r.legend) parts.push('legend: true');
  parts.push(`flavor: ${q(r.flavor)}`);
  return `  { ${parts.join(', ')} },`;
});

const out = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Régénérer avec : npm run pokedex
// Sources : @pkmn/dex (types, statistiques, évolutions) et pokemon (noms français).
// Les descripteurs visuels (forme, attributs, couleurs) sont dans scripts/roster-*.mjs.
import type { RawSpecies } from './species';

export const POKEDEX: RawSpecies[] = [
${lines.join('\n')}
];
`;

writeFileSync('src/data/pokedex.gen.ts', out);
console.log(`écrit src/data/pokedex.gen.ts — ${rows.length} espèces, générations ${[...new Set(rows.map(r => r.gen))].sort().join('/')}`);
console.log(`évolutions : ${rows.filter(r => r.evo).length}, légendaires : ${rows.filter(r => r.legend).length}`);
if (warnings.length) console.log('AVERTISSEMENTS:\n' + warnings.join('\n'));
