/** Les 18 types élémentaires. */
export const TYPES = [
  'Normal', 'Feu', 'Eau', 'Plante', 'Électrik', 'Glace', 'Combat', 'Poison', 'Sol',
  'Vol', 'Psy', 'Insecte', 'Roche', 'Spectre', 'Dragon', 'Ténèbres', 'Acier', 'Fée',
] as const;

export type TypeName = (typeof TYPES)[number];

export const TYPE_COLOR: Record<TypeName, string> = {
  Normal: '#b9b9a8', Feu: '#ff7043', Eau: '#4d9de0', Plante: '#66c05a',
  Électrik: '#f7d353', Glace: '#8fe3e0', Combat: '#d1584f', Poison: '#a85cc0',
  Sol: '#dbc07a', Vol: '#a3c4f3', Psy: '#f76fa0', Insecte: '#a8c034',
  Roche: '#b8a45e', Spectre: '#7a63b8', Dragon: '#6f5bde', Ténèbres: '#6b5a52',
  Acier: '#b8b8cc', Fée: '#f2a0d0',
};

/** eff[attaquant][défenseur] — seules les valeurs ≠ 1 sont stockées. */
const E: Partial<Record<TypeName, Partial<Record<TypeName, number>>>> = {
  Normal: { Roche: .5, Acier: .5, Spectre: 0 },
  Feu: { Feu: .5, Eau: .5, Plante: 2, Glace: 2, Insecte: 2, Roche: .5, Dragon: .5, Acier: 2 },
  Eau: { Feu: 2, Eau: .5, Plante: .5, Sol: 2, Roche: 2, Dragon: .5 },
  Plante: { Feu: .5, Eau: 2, Plante: .5, Poison: .5, Sol: 2, Vol: .5, Insecte: .5, Roche: 2, Dragon: .5, Acier: .5 },
  Électrik: { Eau: 2, Plante: .5, Électrik: .5, Sol: 0, Vol: 2, Dragon: .5 },
  Glace: { Feu: .5, Eau: .5, Plante: 2, Glace: .5, Sol: 2, Vol: 2, Dragon: 2, Acier: .5 },
  Combat: { Normal: 2, Glace: 2, Poison: .5, Vol: .5, Psy: .5, Insecte: .5, Roche: 2, Spectre: 0, Ténèbres: 2, Acier: 2, Fée: .5 },
  Poison: { Plante: 2, Poison: .5, Sol: .5, Roche: .5, Spectre: .5, Acier: 0, Fée: 2 },
  Sol: { Feu: 2, Plante: .5, Électrik: 2, Poison: 2, Vol: 0, Insecte: .5, Roche: 2, Acier: 2 },
  Vol: { Plante: 2, Électrik: .5, Combat: 2, Insecte: 2, Roche: .5, Acier: .5 },
  Psy: { Combat: 2, Poison: 2, Psy: .5, Ténèbres: 0, Acier: .5 },
  Insecte: { Feu: .5, Plante: 2, Combat: .5, Poison: .5, Vol: .5, Psy: 2, Spectre: .5, Ténèbres: 2, Acier: .5, Fée: .5 },
  Roche: { Feu: 2, Glace: 2, Combat: .5, Sol: .5, Vol: 2, Insecte: 2, Acier: .5 },
  Spectre: { Normal: 0, Psy: 2, Spectre: 2, Ténèbres: .5 },
  Dragon: { Dragon: 2, Acier: .5, Fée: 0 },
  Ténèbres: { Combat: .5, Psy: 2, Spectre: 2, Ténèbres: .5, Fée: .5 },
  Acier: { Feu: .5, Eau: .5, Électrik: .5, Glace: 2, Roche: 2, Acier: .5, Fée: 2 },
  Fée: { Feu: .5, Combat: 2, Poison: .5, Dragon: 2, Ténèbres: 2, Acier: .5 },
};

export function typeMult(atk: TypeName, def: TypeName): number {
  return E[atk]?.[def] ?? 1;
}

/** Multiplicateur total contre un défenseur mono ou bi-type. */
export function effectiveness(atk: TypeName, defTypes: readonly TypeName[]): number {
  return defTypes.reduce((m, t) => m * typeMult(atk, t), 1);
}

export function effLabel(m: number): string {
  if (m === 0) return "Ça n'affecte pas la cible…";
  if (m >= 4) return 'Coup ultra efficace !';
  if (m > 1) return "C'est super efficace !";
  if (m > 0 && m < 1) return "Ce n'est pas très efficace…";
  return '';
}
