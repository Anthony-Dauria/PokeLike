/**
 * Vignettes de l'interface. Le rendu 3D n'est pas disponible au chargement des
 * modules : le jeu branche la source une fois son moteur prêt, et les écrans
 * appellent ces fonctions sans rien savoir de WebGL.
 */

/** Personnages humains dont on sait dessiner un buste. */
export type HumanId = 'joueur-g' | 'joueur-f' | 'prof' | 'rival' | 'pnj';

export interface PortraitSource {
  /** PNG (data URL) d'une créature, cadrée en pied. */
  creature(spId: string, shiny?: boolean): string;
  /** PNG (data URL) d'un buste humain. */
  human(id: HumanId): string;
  /** Image d'un pack déposé par le joueur, si elle existe. */
  packUrl(spId: string): Promise<string | null>;
}

let source: PortraitSource | null = null;

export function setPortraitSource(s: PortraitSource) { source = s; }

export function creaturePortrait(spId: string, shiny = false): string {
  try { return source?.creature(spId, shiny) ?? ''; } catch { return ''; }
}

export function humanPortrait(id: HumanId): string {
  try { return source?.human(id) ?? ''; } catch { return ''; }
}

export function packPortrait(spId: string): Promise<string | null> {
  return source?.packUrl(spId) ?? Promise.resolve(null);
}
