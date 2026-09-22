/**
 * Journal applicatif minimal.
 *
 * Volontairement sans dependance a Electron : les services qui l'utilisent
 * (dont l'ecriture Excel) doivent rester executables hors application, pour les
 * scripts de generation et les tests. Le fichier de destination est fourni au
 * demarrage par le processus principal.
 */

import fs from 'node:fs';
import path from 'node:path';

const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo, puis rotation simple

type Niveau = 'INFO' | 'AVERT' | 'ERREUR';

let fichierJournal: string | null = null;

/** Active l'ecriture sur disque. Sans appel, seule la console est utilisee. */
export function configurerJournal(chemin: string): void {
  fichierJournal = chemin;
}

function ecrire(niveau: Niveau, message: string, details?: unknown): void {
  const ligne = `${new Date().toISOString()} [${niveau}] ${message}${
    details === undefined ? '' : ` :: ${formaterDetails(details)}`
  }\n`;
  // eslint-disable-next-line no-console
  console[niveau === 'ERREUR' ? 'error' : 'log'](ligne.trimEnd());
  if (!fichierJournal) return;
  try {
    fs.mkdirSync(path.dirname(fichierJournal), { recursive: true });
    if (fs.existsSync(fichierJournal) && fs.statSync(fichierJournal).size > TAILLE_MAX) {
      fs.renameSync(fichierJournal, `${fichierJournal}.1`);
    }
    fs.appendFileSync(fichierJournal, ligne, 'utf-8');
  } catch {
    // Le journal ne doit jamais faire echouer une operation metier.
  }
}

function formaterDetails(details: unknown): string {
  if (details instanceof Error) return `${details.name}: ${details.message}`;
  if (typeof details === 'string') return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export const journal = {
  info: (message: string, details?: unknown) => ecrire('INFO', message, details),
  avertissement: (message: string, details?: unknown) => ecrire('AVERT', message, details),
  erreur: (message: string, details?: unknown) => ecrire('ERREUR', message, details),
};

/** Message d'erreur lisible par un operateur, a partir d'une exception. */
export function messageErreur(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
