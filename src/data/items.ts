export type ItemKind = 'ball' | 'heal' | 'revive' | 'cure' | 'battle' | 'key';

export interface Item {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  desc: string;
  ballRate?: number;
  healAmount?: number;   // -1 = PV max
  cures?: string[];      // 'all' ou statuts
  reviveRatio?: number;
  boost?: { stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe'; stages: number };
  usableInBattle: boolean;
  usableOnMon: boolean;
}

const list: Item[] = [
  { id: 'ball', name: 'Sphère', kind: 'ball', price: 200, ballRate: 1, desc: 'Sphère de capture standard.', usableInBattle: true, usableOnMon: false },
  { id: 'superball', name: 'Super Sphère', kind: 'ball', price: 600, ballRate: 1.5, desc: 'Taux de capture amélioré.', usableInBattle: true, usableOnMon: false },
  { id: 'hyperball', name: 'Hyper Sphère', kind: 'ball', price: 1200, ballRate: 2, desc: 'Très efficace sur les créatures rares.', usableInBattle: true, usableOnMon: false },
  { id: 'masterball', name: 'Sphère Maître', kind: 'ball', price: 0, ballRate: 255, desc: 'Capture sans jamais échouer.', usableInBattle: true, usableOnMon: false },

  { id: 'potion', name: 'Potion', kind: 'heal', price: 300, healAmount: 30, desc: 'Rend 30 PV.', usableInBattle: true, usableOnMon: true },
  { id: 'superpotion', name: 'Super Potion', kind: 'heal', price: 700, healAmount: 70, desc: 'Rend 70 PV.', usableInBattle: true, usableOnMon: true },
  { id: 'hyperpotion', name: 'Hyper Potion', kind: 'heal', price: 1500, healAmount: 150, desc: 'Rend 150 PV.', usableInBattle: true, usableOnMon: true },
  { id: 'potionmax', name: 'Potion Max', kind: 'heal', price: 2800, healAmount: -1, desc: 'Restaure tous les PV.', usableInBattle: true, usableOnMon: true },
  { id: 'guerison', name: 'Guérison', kind: 'cure', price: 600, cures: ['all'], desc: 'Soigne tous les problèmes de statut.', usableInBattle: true, usableOnMon: true },
  { id: 'antidote', name: 'Antidote', kind: 'cure', price: 150, cures: ['psn', 'tox'], desc: 'Soigne le poison.', usableInBattle: true, usableOnMon: true },
  { id: 'anti-brulure', name: 'Anti-Brûle', kind: 'cure', price: 250, cures: ['brl'], desc: 'Soigne les brûlures.', usableInBattle: true, usableOnMon: true },
  { id: 'reveil', name: 'Réveil', kind: 'cure', price: 250, cures: ['slp'], desc: 'Réveille la créature.', usableInBattle: true, usableOnMon: true },
  { id: 'antipara', name: 'Anti-Para', kind: 'cure', price: 250, cures: ['par'], desc: 'Soigne la paralysie.', usableInBattle: true, usableOnMon: true },
  { id: 'rappel', name: 'Rappel', kind: 'revive', price: 1500, reviveRatio: .5, desc: 'Ranime avec la moitié des PV.', usableInBattle: true, usableOnMon: true },
  { id: 'rappelmax', name: 'Rappel Max', kind: 'revive', price: 4000, reviveRatio: 1, desc: 'Ranime avec tous les PV.', usableInBattle: true, usableOnMon: true },

  { id: 'attaqueplus', name: 'Attaque +', kind: 'battle', price: 500, boost: { stat: 'atk', stages: 1 }, desc: "Augmente l'Attaque en combat.", usableInBattle: true, usableOnMon: false },
  { id: 'defenseplus', name: 'Défense +', kind: 'battle', price: 500, boost: { stat: 'def', stages: 1 }, desc: 'Augmente la Défense en combat.', usableInBattle: true, usableOnMon: false },
  { id: 'vitesseplus', name: 'Vitesse +', kind: 'battle', price: 500, boost: { stat: 'spe', stages: 1 }, desc: 'Augmente la Vitesse en combat.', usableInBattle: true, usableOnMon: false },

  { id: 'repousse', name: 'Repousse', kind: 'key', price: 400, desc: 'Éloigne les créatures faibles pendant 200 pas.', usableInBattle: false, usableOnMon: false },
  { id: 'velo', name: 'Vélo', kind: 'key', price: 0, desc: 'Permet de se déplacer deux fois plus vite.', usableInBattle: false, usableOnMon: false },
  { id: 'canne', name: 'Canne à pêche', kind: 'key', price: 0, desc: 'Permet de pêcher au bord de l’eau.', usableInBattle: false, usableOnMon: false },
  { id: 'passeorsyn', name: 'Passe d’Orsyn', kind: 'key', price: 0, desc: 'Donne accès au ferry vers la région d’Orsyn.', usableInBattle: false, usableOnMon: false },
  { id: 'dexnat', name: 'Dex Naturaliste', kind: 'key', price: 0, desc: 'Recense les créatures rencontrées.', usableInBattle: false, usableOnMon: false },
];

export const ITEMS: Record<string, Item> = Object.fromEntries(list.map((i) => [i.id, i]));
export function item(id: string): Item {
  const it = ITEMS[id];
  if (!it) throw new Error('Objet inconnu: ' + id);
  return it;
}

export const SHOP_BASIC = ['ball', 'potion', 'antidote', 'anti-brulure', 'antipara', 'reveil', 'repousse'];
export const SHOP_MID = ['ball', 'superball', 'potion', 'superpotion', 'guerison', 'rappel', 'repousse', 'attaqueplus', 'defenseplus'];
export const SHOP_LATE = ['superball', 'hyperball', 'superpotion', 'hyperpotion', 'potionmax', 'guerison', 'rappel', 'rappelmax', 'attaqueplus', 'defenseplus', 'vitesseplus'];
