/**
 * Stockage local des cycles valides.
 *
 * Les cycles sont regroupes par mois (`cycles/2026-09.json`). C'est la memoire
 * de l'application : le classeur Excel peut etre supprime, deplace ou recree,
 * les saisies restent rejouables depuis ce dossier.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Cycle } from '../../shared/types';
import { assurerDossier, dossierCycles } from './paths';
import { ecrireJson, lireJson } from './fs-utils';

function fichierDuMois(iso: string): string {
  return path.join(dossierCycles(), `${iso.slice(0, 7)}.json`);
}

export function enregistrerCycle(cycle: Cycle): void {
  assurerDossier(dossierCycles());
  const fichier = fichierDuMois(cycle.finIso);
  const cycles = lireJson<Cycle[]>(fichier, []);
  const index = cycles.findIndex((c) => c.id === cycle.id);
  if (index >= 0) cycles[index] = cycle;
  else cycles.push(cycle);
  ecrireJson(fichier, cycles);
}

export function lireCycle(id: string): Cycle | null {
  for (const fichier of fichiersTriesRecentsDabord()) {
    const trouve = lireJson<Cycle[]>(fichier, []).find((c) => c.id === id);
    if (trouve) return trouve;
  }
  return null;
}

/** Derniers cycles enregistres, du plus recent au plus ancien. */
export function listerCycles(limite = 50): Cycle[] {
  const sortie: Cycle[] = [];
  for (const fichier of fichiersTriesRecentsDabord()) {
    const cycles = lireJson<Cycle[]>(fichier, []);
    cycles.sort((a, b) => b.finIso.localeCompare(a.finIso));
    sortie.push(...cycles);
    if (sortie.length >= limite) break;
  }
  return sortie.slice(0, limite);
}

export function compterCycles(): number {
  return fichiersTriesRecentsDabord().reduce(
    (total, fichier) => total + lireJson<Cycle[]>(fichier, []).length,
    0,
  );
}

function fichiersTriesRecentsDabord(): string[] {
  const dossier = dossierCycles();
  if (!fs.existsSync(dossier)) return [];
  return fs
    .readdirSync(dossier)
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .sort((a, b) => b.localeCompare(a))
    .map((f) => path.join(dossier, f));
}
