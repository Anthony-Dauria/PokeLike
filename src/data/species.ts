import type { TypeName } from './types';

export type Shape =
  | 'quad' | 'biped' | 'serpent' | 'bird' | 'blob' | 'insect'
  | 'fish' | 'ghost' | 'golem' | 'plantoid';

export type Feat = 'wings' | 'horn' | 'tail' | 'ears' | 'fins' | 'spikes' | 'crest' | 'aura' | 'claws' | 'shell';

export interface Species {
  dex: number;
  id: string;
  name: string;
  types: TypeName[];
  base: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  shape: Shape;
  feats: Feat[];
  scale: number;
  catchRate: number;
  xpYield: number;
  evo?: { to: string; lv: number };
  sig?: [number, string][];
  legend?: boolean;
  flavor: string;
}

const S: Species[] = [];
function def(
  id: string, name: string, types: TypeName[],
  b: [number, number, number, number, number, number],
  shape: Shape, feats: Feat[], scale: number, catchRate: number,
  evo: [string, number] | null, sig: [number, string][], flavor: string, legend = false,
) {
  S.push({
    dex: S.length + 1, id, name, types,
    base: { hp: b[0], atk: b[1], def: b[2], spa: b[3], spd: b[4], spe: b[5] },
    shape, feats, scale, catchRate,
    xpYield: Math.round(b.reduce((a, c) => a + c, 0) / 4),
    evo: evo ? { to: evo[0], lv: evo[1] } : undefined,
    sig, legend, flavor,
  });
}

/* ============ LES 3 STARTERS ============ */
def('brasillon', 'Brasillon', ['Feu'], [45, 62, 48, 60, 48, 62], 'quad', ['tail', 'ears'], .8, 45,
  ['cendrailes', 16], [[1, 'griffe'], [4, 'flammeche'], [10, 'morsure'], [14, 'crocsfeu']],
  'La braise de sa gorge ne s’éteint jamais, même sous la pluie.');
def('cendrailes', 'Cendrailes', ['Feu'], [62, 80, 62, 80, 62, 85], 'quad', ['tail', 'wings', 'claws'], 1.0, 45,
  ['pyrodrakon', 36], [[18, 'dansedracau'], [24, 'lanceflam'], [30, 'dracogriffe']],
  'Ses ailes naissantes crachent des cendres brûlantes quand il s’élance.');
def('pyrodrakon', 'Pyrodrakon', ['Feu', 'Dragon'], [84, 104, 82, 108, 84, 98], 'biped', ['wings', 'horn', 'tail', 'claws'], 1.5, 45,
  null, [[36, 'dracochoc'], [42, 'coleredragon'], [50, 'deflagration'], [58, 'boutefeu']],
  'Un dragon de forge dont le rugissement fait fondre la roche.');

def('ondulin', 'Ondulin', ['Eau'], [50, 50, 52, 62, 58, 53], 'fish', ['fins', 'tail'], .7, 45,
  ['brumaspectre', 16], [[1, 'pistoleau'], [7, 'bulledeau'], [12, 'lechouille']],
  'On dit que les gouttes qu’il laisse derrière lui murmurent la nuit.');
def('brumaspectre', 'Brumaspectre', ['Eau', 'Spectre'], [66, 66, 68, 84, 78, 69], 'ghost', ['fins', 'aura'], 1.0, 45,
  ['abyssire', 36], [[18, 'ball-ombre'], [24, 'surf'], [30, 'hantise']],
  'Sa brume glacée dissimule des silhouettes qui n’existent pas.');
def('abyssire', 'Abyssire', ['Eau', 'Spectre'], [88, 86, 92, 112, 104, 78], 'ghost', ['fins', 'aura', 'crest'], 1.4, 45,
  null, [[36, 'maremortelle'], [44, 'hydrocanon'], [52, 'hantise'], [58, 'plenitude']],
  'Gardien des épaves. Son chant attire les marins vers les abysses.');

def('germinuit', 'Germinuit', ['Plante'], [52, 58, 56, 56, 54, 49], 'plantoid', ['crest'], .7, 45,
  ['sylvombre', 16], [[1, 'fouetlia'], [7, 'tranchherb'], [13, 'morsure']],
  'Sa pousse ne s’ouvre qu’à la tombée de la nuit.');
def('sylvombre', 'Sylvombre', ['Plante', 'Ténèbres'], [70, 82, 74, 72, 70, 63], 'biped', ['crest', 'claws'], 1.0, 45,
  ['nocteracine', 36], [[18, 'vibrobscur'], [24, 'lamefeuille'], [30, 'danselame']],
  'Il se fond dans l’ombre des futaies et n’en sort que pour frapper.');
def('nocteracine', 'Nocteracine', ['Plante', 'Ténèbres'], [92, 112, 96, 86, 92, 82], 'biped', ['crest', 'claws', 'spikes'], 1.45, 45,
  null, [[36, 'ronceombre'], [44, 'nuitnoire'], [52, 'lancesoleil'], [58, 'closecombat']],
  'Ses racines drainent la lumière ; la forêt autour de lui reste noire.');

/* ============ FAUNE COMMUNE ============ */
def('ratinoc', 'Ratinoc', ['Normal'], [38, 52, 38, 28, 34, 68], 'quad', ['tail', 'ears'], .5, 255,
  ['ratargeant', 18], [[1, 'charge'], [6, 'mimiquerie'], [12, 'morsure']], 'Rongeur increvable des faubourgs.');
def('ratargeant', 'Ratargeant', ['Normal'], [62, 86, 62, 46, 58, 98], 'quad', ['tail', 'ears', 'claws'], .85, 120,
  null, [[20, 'ultimapo'], [28, 'triplepied']], 'Ses incisives entaillent l’acier trempé.');

def('piafleur', 'Piafleur', ['Normal', 'Vol'], [42, 48, 42, 34, 36, 62], 'bird', ['wings', 'tail'], .6, 255,
  ['aiglombre', 20], [[1, 'picpic'], [8, 'tornade'], [14, 'cruaile']], 'Il pépie pour signaler l’orage.');
def('aiglombre', 'Aiglombre', ['Normal', 'Vol'], [72, 92, 68, 56, 62, 102], 'bird', ['wings', 'tail', 'crest'], 1.2, 90,
  null, [[24, 'aeropique'], [34, 'rapace']], 'Son ombre survolant un champ fait fuir les troupeaux.');

def('chenilume', 'Chenilume', ['Insecte'], [42, 34, 40, 28, 34, 40], 'insect', [], .4, 255,
  ['cocoluis', 8], [[1, 'charge'], [5, 'piqure']], 'Sa peau translucide luit faiblement.');
def('cocoluis', 'Cocoluis', ['Insecte'], [56, 34, 66, 32, 46, 30], 'blob', ['shell'], .5, 120,
  ['papilore', 12], [[8, 'armure']], 'Cocon dur comme la pierre. Il attend son heure.');
def('papilore', 'Papilore', ['Insecte', 'Vol'], [66, 52, 58, 92, 82, 78], 'insect', ['wings'], .9, 60,
  null, [[14, 'vibrabeille'], [22, 'rafalepsy'], [32, 'megasangsue']], 'Ses écailles alaires diffusent une poudre hypnotique.');

def('vermidard', 'Vermidard', ['Insecte', 'Poison'], [44, 54, 42, 26, 36, 46], 'insect', ['spikes'], .45, 255,
  ['dardaculee', 20], [[1, 'darddain'], [9, 'piqure']], 'Le dard sur sa tête suinte un venin tenace.');
def('dardaculee', 'Dardaculée', ['Insecte', 'Poison'], [66, 92, 62, 48, 68, 88], 'insect', ['wings', 'spikes'], .95, 90,
  null, [[24, 'dardnuee'], [32, 'directtoxik']], 'Il fond sur sa cible en trois battements d’ailes.');

def('cailloutin', 'Cailloutin', ['Roche'], [48, 68, 92, 24, 34, 22], 'golem', [], .55, 255,
  ['rocailleux', 22], [[1, 'charge'], [8, 'jetpierres']], 'On le confond avec un galet jusqu’à ce qu’il cligne des yeux.');
def('rocailleux', 'Rocailleux', ['Roche', 'Sol'], [66, 90, 118, 36, 48, 32], 'golem', ['spikes'], .95, 120,
  ['titanroc', 40], [[24, 'eboulement'], [30, 'tunnel']], 'Il roule au flanc des falaises pour se déplacer.');
def('titanroc', 'Titanroc', ['Roche', 'Sol'], [86, 122, 142, 48, 64, 44], 'golem', ['spikes', 'horn'], 1.5, 45,
  null, [[40, 'seisme'], [48, 'lamederoc']], 'Un éboulement à lui tout seul.');

def('voltiny', 'Voltiny', ['Électrik'], [42, 44, 40, 68, 48, 76], 'quad', ['ears', 'tail'], .5, 190,
  ['fulguron', 24], [[1, 'eclair'], [10, 'etincelle']], 'Il stocke l’électricité statique de son pelage.');
def('fulguron', 'Fulguron', ['Électrik'], [68, 74, 62, 108, 76, 112], 'quad', ['ears', 'tail', 'crest'], 1.05, 75,
  null, [[26, 'tonnerre'], [36, 'cageeclair']], 'Sa course laisse des arcs électriques dans l’air.');

def('aquaillon', 'Aquaillon', ['Eau'], [52, 48, 52, 58, 56, 50], 'fish', ['fins'], .55, 190,
  ['maremora', 24], [[1, 'pistoleau'], [10, 'bulledeau']], 'Il remonte les rivières à contre-courant.');
def('maremora', 'Marémora', ['Eau'], [82, 76, 82, 96, 88, 66], 'fish', ['fins', 'crest'], 1.15, 75,
  null, [[26, 'surf'], [36, 'hydrocanon']], 'Il commande aux marées des criques de Valmore.');

def('flamouflet', 'Flamouflet', ['Feu'], [46, 62, 42, 62, 44, 66], 'quad', ['tail'], .55, 190,
  ['pyrolynx', 26], [[1, 'flammeche'], [12, 'crocsfeu']], 'Sa queue s’allume quand il a faim.');
def('pyrolynx', 'Pyrolynx', ['Feu'], [72, 96, 66, 96, 70, 104], 'quad', ['tail', 'claws', 'crest'], 1.1, 75,
  null, [[28, 'lanceflam'], [38, 'boutefeu']], 'Un félin de braise qui chasse à l’aube.');

def('bourgeonet', 'Bourgeonet', ['Plante'], [54, 50, 54, 60, 58, 42], 'plantoid', [], .5, 190,
  ['florelame', 26], [[1, 'fouetlia'], [12, 'vampigraine']], 'Il replie ses feuilles pour dormir.');
def('florelame', 'Florelame', ['Plante'], [82, 84, 82, 92, 88, 58], 'plantoid', ['crest', 'claws'], 1.1, 75,
  null, [[28, 'lamefeuille'], [36, 'spore']], 'Ses pétales tranchent aussi net qu’un rasoir.');

def('sablotin', 'Sablotin', ['Sol'], [50, 68, 66, 30, 38, 44], 'quad', ['claws'], .55, 190,
  ['dunargon', 28], [[1, 'charge'], [12, 'tunnel']], 'Il disparaît sous le sable en un souffle.');
def('dunargon', 'Dunargon', ['Sol'], [78, 108, 100, 44, 58, 62], 'serpent', ['claws', 'spikes'], 1.25, 75,
  null, [[30, 'seisme'], [38, 'lamederoc']], 'Les dunes se déplacent quand il chasse.');

def('gelipou', 'Gélipou', ['Glace'], [56, 46, 54, 66, 62, 42], 'blob', ['ears'], .5, 190,
  ['frimalak', 28], [[1, 'ventglace'], [12, 'crocsgivre']], 'Sa fourrure givrée craque à chaque pas.');
def('frimalak', 'Frimalak', ['Glace'], [86, 74, 84, 104, 96, 60], 'biped', ['ears', 'spikes'], 1.15, 75,
  null, [[30, 'laserglace'], [40, 'blizzard']], 'Il souffle un froid qui fige les cascades.');

def('poingpou', 'Poingpou', ['Combat'], [56, 72, 52, 30, 44, 58], 'biped', [], .6, 180,
  ['karateur', 28], [[1, 'poingkarate'], [12, 'balayage']], 'Il s’entraîne contre les rochers du col.');
def('karateur', 'Karateur', ['Combat'], [84, 116, 78, 44, 72, 84], 'biped', ['claws'], 1.15, 70,
  null, [[30, 'exupied'], [38, 'closecombat']], 'Ses paumes fendent des blocs de granite.');

def('toxinaze', 'Toxinaze', ['Poison'], [58, 52, 52, 62, 58, 52], 'blob', [], .55, 190,
  ['miasmodon', 30], [[1, 'acide'], [14, 'toxik']], 'Une flaque vivante aux relents âcres.');
def('miasmodon', 'Miasmodon', ['Poison'], [96, 82, 78, 98, 88, 64], 'blob', ['spikes'], 1.2, 75,
  null, [[32, 'bombebeurk'], [42, 'directtoxik']], 'Son nuage corrode le métal en quelques minutes.');

def('spectrille', 'Spectrille', ['Spectre'], [46, 44, 42, 74, 62, 76], 'ghost', ['aura'], .55, 190,
  ['voilombre', 30], [[1, 'lechouille'], [14, 'ball-ombre']], 'Il rit dans les greniers vides.');
def('voilombre', 'Voilombre', ['Spectre', 'Poison'], [72, 68, 66, 112, 88, 102], 'ghost', ['aura', 'crest'], 1.15, 70,
  null, [[32, 'hantise'], [40, 'bombebeurk']], 'On perd la notion du temps près de lui.');

def('psykid', 'Psykid', ['Psy'], [48, 36, 42, 82, 66, 62], 'biped', ['crest'], .55, 190,
  ['mentalor', 30], [[1, 'choc-mental'], [14, 'plenitude']], 'Il devine les questions avant qu’on les pose.');
def('mentalor', 'Mentalor', ['Psy'], [74, 52, 66, 128, 96, 96], 'biped', ['crest', 'aura'], 1.15, 70,
  null, [[32, 'psyko'], [42, 'teleport']], 'Son regard suffit à faire plier une barre de fer.');

def('feriole', 'Fériole', ['Fée'], [56, 42, 54, 74, 76, 58], 'blob', ['wings'], .5, 190,
  ['lunellia', 30], [[1, 'vent-feerique'], [14, 'jolicharme']], 'Elle danse dans les rayons de lune.');
def('lunellia', 'Lunellia', ['Fée'], [88, 62, 82, 112, 118, 76], 'biped', ['wings', 'aura'], 1.15, 70,
  null, [[32, 'forcelunaire'], [42, 'eclatmagik']], 'Sa lumière apaise même les Spectres.');

def('ferrolin', 'Ferrolin', ['Acier'], [52, 62, 96, 42, 52, 34], 'golem', ['shell'], .55, 190,
  ['blindarme', 32], [[1, 'griffacier'], [14, 'tetedefer']], 'Il se nourrit de minerai brut.');
def('blindarme', 'Blindarme', ['Acier'], [78, 102, 148, 62, 84, 46], 'golem', ['shell', 'spikes'], 1.25, 70,
  null, [[34, 'luminocanon'], [44, 'lamederoc']], 'Sa carapace a servi de bouclier de siège.');

def('ombracer', 'Ombracer', ['Ténèbres'], [52, 72, 48, 48, 46, 74], 'quad', ['tail', 'claws'], .6, 190,
  ['nyxpanthre', 32], [[1, 'morsure'], [14, 'vibrobscur']], 'Il chasse dans le noir absolu.');
def('nyxpanthre', 'Nyxpanthre', ['Ténèbres'], [80, 116, 74, 78, 76, 116], 'quad', ['tail', 'claws', 'crest'], 1.2, 70,
  null, [[34, 'nuitnoire'], [42, 'danselame']], 'Un félin d’encre : on ne le voit qu’une fois touché.');

def('draconnet', 'Draconnet', ['Dragon'], [58, 64, 50, 62, 54, 52], 'serpent', ['tail'], .6, 45,
  ['drakoral', 30], [[1, 'draco-souffle'], [16, 'dracogriffe']], 'Un dragonneau des cascades.');
def('drakoral', 'Drakoral', ['Dragon'], [74, 84, 68, 84, 72, 62], 'serpent', ['tail', 'horn'], 1.1, 45,
  ['souverain', 52], [[32, 'dracochoc2'], [40, 'dansedracau']], 'Il grandit encore. Beaucoup.');
def('souverain', 'Souverain', ['Dragon', 'Vol'], [96, 128, 96, 106, 102, 92], 'serpent', ['wings', 'horn', 'tail'], 1.6, 45,
  null, [[52, 'coleredragon'], [58, 'ouraganvol'], [64, 'hyperbeam']], 'On ne le voit qu’au-dessus des nuages.');

/* ============ ESPÈCES MIXTES (mi-parcours) ============ */
def('zephyroc', 'Zéphyroc', ['Vol', 'Roche'], [78, 92, 96, 56, 62, 82], 'bird', ['wings', 'spikes'], 1.2, 70,
  null, [[28, 'eboulement'], [38, 'rapace']], 'Il niche dans les aiguilles rocheuses du col.');
def('magmalv', 'Magmalv', ['Feu', 'Roche'], [82, 104, 98, 88, 66, 48], 'golem', ['spikes'], 1.2, 70,
  null, [[30, 'lamederoc'], [40, 'deflagration']], 'Sa carapace craquelée laisse suinter la lave.');
def('coraline', 'Coraline', ['Eau', 'Fée'], [86, 58, 92, 102, 108, 62], 'fish', ['fins', 'crest'], 1.0, 70,
  null, [[30, 'eclatmagik'], [38, 'surf']], 'Les récifs qu’elle habite guérissent les blessures.');
def('kaktusai', 'Kaktusaï', ['Plante', 'Sol'], [88, 106, 84, 66, 72, 58], 'plantoid', ['spikes'], 1.1, 70,
  null, [[30, 'seisme'], [38, 'lamefeuille']], 'Il stocke un mois d’eau dans son tronc.');
def('voltifer', 'Voltifer', ['Électrik', 'Acier'], [72, 82, 112, 96, 82, 66], 'golem', ['shell'], 1.1, 70,
  null, [[32, 'luminocanon'], [40, 'fatalfoudre']], 'Un noyau magnétique bat dans sa poitrine.');
def('cryodon', 'Cryodon', ['Glace', 'Dragon'], [92, 112, 92, 102, 88, 74], 'serpent', ['horn', 'tail'], 1.35, 45,
  null, [[38, 'blizzard'], [46, 'dracochoc2']], 'Il dort au fond des glaciers depuis des siècles.');
def('golemtal', 'Golemtal', ['Acier', 'Roche'], [92, 118, 138, 52, 74, 38], 'golem', ['shell', 'horn'], 1.4, 45,
  null, [[38, 'tetedefer'], [46, 'seisme']], 'Une statue de mine qui s’est mise à marcher.');
def('ombrelune', 'Ombrelune', ['Spectre', 'Fée'], [78, 62, 78, 118, 112, 96], 'ghost', ['aura', 'wings'], 1.1, 60,
  null, [[36, 'forcelunaire'], [44, 'hantise']], 'Elle apparaît aux voyageurs égarés… parfois pour aider.');
def('sylphibou', 'Sylphibou', ['Psy', 'Vol'], [82, 68, 74, 112, 96, 98], 'bird', ['wings', 'crest'], 1.15, 60,
  null, [[36, 'psyko'], [44, 'ouraganvol']], 'Son hululement révèle les mensonges.');
def('scarabolt', 'Scarabolt', ['Insecte', 'Électrik'], [72, 96, 78, 92, 72, 106], 'insect', ['wings', 'spikes'], 1.0, 70,
  null, [[32, 'tonnerre'], [40, 'vibrabeille']], 'Ses élytres génèrent un arc de 10 000 volts.');
def('mantisombre', 'Mantisombre', ['Insecte', 'Ténèbres'], [76, 122, 82, 58, 74, 96], 'insect', ['claws', 'spikes'], 1.15, 60,
  null, [[34, 'nuitnoire'], [42, 'danselame']], 'Ses faux tranchent l’obscurité elle-même.');
def('terravor', 'Terravor', ['Sol', 'Ténèbres'], [96, 118, 96, 62, 78, 68], 'quad', ['claws', 'spikes'], 1.3, 60,
  null, [[36, 'seisme'], [44, 'vibrobscur']], 'Il creuse sous les villages et écoute.');
def('nagaflam', 'Nagaflam', ['Feu', 'Poison'], [84, 92, 76, 108, 82, 92], 'serpent', ['tail', 'crest'], 1.25, 60,
  null, [[34, 'bombebeurk'], [42, 'lanceflam']], 'Son venin s’enflamme au contact de l’air.');
def('ondinelle', 'Ondinelle', ['Eau', 'Glace'], [82, 72, 88, 108, 98, 84], 'fish', ['fins', 'crest'], 1.1, 60,
  null, [[34, 'laserglace'], [42, 'surf']], 'Elle gèle la surface des lacs en dansant.');
def('bambousai', 'Bambousaï', ['Plante', 'Combat'], [86, 116, 92, 58, 82, 86], 'plantoid', ['claws'], 1.2, 60,
  null, [[34, 'closecombat'], [42, 'lamefeuille']], 'Ses cannes claquent comme des sabres.');
def('pugilame', 'Pugilame', ['Combat', 'Acier'], [82, 124, 108, 52, 82, 78], 'biped', ['claws', 'shell'], 1.2, 55,
  null, [[38, 'tetedefer'], [46, 'closecombat']], 'Un duelliste en armure vivante.');
def('viperande', 'Vipérande', ['Poison', 'Dragon'], [88, 108, 82, 104, 82, 92], 'serpent', ['horn', 'tail'], 1.3, 50,
  null, [[38, 'directtoxik'], [46, 'coleredragon']], 'Une morsure suffit à empoisonner un fleuve.');
def('chimerok', 'Chimérok', ['Roche', 'Feu'], [98, 118, 118, 78, 82, 52], 'quad', ['horn', 'spikes'], 1.35, 50,
  null, [[38, 'lamederoc'], [46, 'boutefeu']], 'Un bélier de magma refroidi.');
def('aurorix', 'Aurorix', ['Glace', 'Fée'], [84, 68, 88, 118, 112, 86], 'biped', ['wings', 'aura'], 1.2, 50,
  null, [[38, 'blizzard'], [46, 'forcelunaire']], 'Les aurores boréales suivent ses déplacements.');
def('fantomiroir', 'Fantomiroir', ['Spectre', 'Psy'], [76, 66, 82, 126, 106, 102], 'ghost', ['aura', 'crest'], 1.15, 50,
  null, [[38, 'hantise'], [46, 'psyko']], 'Il vit dans les reflets et copie vos gestes… presque.');
def('tonnerrai', 'Tonnerraï', ['Électrik', 'Vol'], [80, 96, 74, 112, 82, 118], 'bird', ['wings', 'crest'], 1.2, 50,
  null, [[38, 'fatalfoudre'], [46, 'ouraganvol']], 'Ses ailes déclenchent des orages secs.');

/* ============ LÉGENDAIRES ============ */
def('ignivore', 'Ignivore', ['Feu', 'Dragon'], [106, 132, 100, 138, 104, 100], 'serpent', ['wings', 'horn', 'tail'], 1.8, 5,
  null, [[1, 'deflagration'], [1, 'coleredragon'], [1, 'dansedracau'], [1, 'seisme']],
  'Le Ver de Forge. On dit qu’il dort au cœur du volcan d’Orsyn.', true);
def('abyssaltar', 'Abyssaltar', ['Eau', 'Ténèbres'], [116, 108, 116, 132, 118, 90], 'fish', ['fins', 'crest', 'aura'], 1.8, 5,
  null, [[1, 'hydrocanon'], [1, 'nuitnoire'], [1, 'laserglace'], [1, 'plenitude']],
  'Le Souverain des Fosses. Il n’est remonté que trois fois en mille ans.', true);
def('sylvanor', 'Sylvanor', ['Plante', 'Fée'], [122, 112, 120, 124, 128, 74], 'plantoid', ['crest', 'aura', 'horn'], 1.9, 5,
  null, [[1, 'lancesoleil'], [1, 'forcelunaire'], [1, 'synthese'], [1, 'seisme']],
  'L’Arbre-Cerf. Là où il pose le sabot, la forêt repousse.', true);
def('chronos', 'Chronoss', ['Psy', 'Acier'], [108, 100, 128, 140, 122, 82], 'ghost', ['aura', 'crest', 'shell'], 1.7, 3,
  null, [[1, 'psyko'], [1, 'luminocanon'], [1, 'plenitude'], [1, 'hyperbeam']],
  'Un mécanisme conscient qui compte les secondes depuis toujours.', true);
def('tenebrarch', 'Ténébrarque', ['Ténèbres', 'Dragon'], [120, 142, 112, 132, 112, 102], 'biped', ['wings', 'horn', 'claws', 'aura'], 2.0, 3,
  null, [[1, 'nuitnoire'], [1, 'coleredragon'], [1, 'deflagration'], [1, 'dansedracau']],
  'L’Éclipse Vivante. Sa seule présence éteint les étoiles.', true);

export const SPECIES: Record<string, Species> = Object.fromEntries(S.map((s) => [s.id, s]));
export const DEX: Species[] = S;

export function species(id: string): Species {
  const s = SPECIES[id];
  if (!s) throw new Error('Espèce inconnue: ' + id);
  return s;
}

/** Ligne évolutive complète d'une espèce (du premier au dernier stade). */
export function evoLine(id: string): string[] {
  const first = DEX.find((s) => s.evo?.to === id);
  const start = first ? evoLine(first.id)[0] : id;
  const line = [start];
  let cur = SPECIES[start];
  while (cur?.evo) { line.push(cur.evo.to); cur = SPECIES[cur.evo.to]; }
  return line;
}
