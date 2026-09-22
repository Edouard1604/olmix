/**
 * Brouillon de saisie en cours.
 *
 * Ecrit a chaque modification de champ ; permet de reprendre exactement ou
 * l'operateur s'est arrete apres une fermeture accidentelle ou une coupure.
 */

import fs from 'node:fs';
import type { Brouillon } from '../../shared/types';
import { cheminBrouillon } from './paths';
import { ecrireJson, lireJson } from './fs-utils';

/** Au-dela de ce delai, le brouillon est considere comme perime. */
const VALIDITE_HEURES = 24;

export function enregistrerBrouillon(brouillon: Brouillon): void {
  ecrireJson(cheminBrouillon(), { ...brouillon, majIso: new Date().toISOString() });
}

export function lireBrouillon(): Brouillon | null {
  const brouillon = lireJson<Brouillon | null>(cheminBrouillon(), null);
  if (!brouillon?.produitId) return null;
  const ageMs = Date.now() - new Date(brouillon.majIso).getTime();
  if (!Number.isFinite(ageMs) || ageMs > VALIDITE_HEURES * 3_600_000) {
    supprimerBrouillon();
    return null;
  }
  return brouillon;
}

export function supprimerBrouillon(): void {
  try {
    fs.rmSync(cheminBrouillon(), { force: true });
  } catch {
    // Sans consequence : le brouillon sera ecrase a la prochaine saisie.
  }
}
