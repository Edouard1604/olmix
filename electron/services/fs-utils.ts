/**
 * Ecritures fichier resistantes a une coupure.
 *
 * Toute ecriture passe par un fichier temporaire suivi d'un renommage : si
 * l'application (ou le poste) s'arrete au milieu d'une ecriture, le fichier
 * d'origine reste intact. C'est indispensable ici, le classeur cumulatif etant
 * la memoire de toute la production.
 */

import fs from 'node:fs';
import path from 'node:path';

export function lireJson<T>(chemin: string, defaut: T): T {
  try {
    if (!fs.existsSync(chemin)) return defaut;
    const brut = fs.readFileSync(chemin, 'utf-8').trim();
    if (!brut) return defaut;
    return JSON.parse(brut) as T;
  } catch {
    return defaut;
  }
}

export function ecrireJson(chemin: string, valeur: unknown): void {
  ecrireAtomique(chemin, `${JSON.stringify(valeur, null, 2)}\n`);
}

export function ecrireAtomique(chemin: string, contenu: string | Buffer): void {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  const temporaire = `${chemin}.${process.pid}.tmp`;
  fs.writeFileSync(temporaire, contenu);
  fs.renameSync(temporaire, chemin);
}

/** Codes renvoyes par Windows lorsque le classeur est ouvert dans Excel. */
const CODES_VERROU = new Set(['EBUSY', 'EPERM', 'EACCES', 'ETXTBSY', 'ENOTEMPTY']);

export function estErreurVerrou(e: unknown): boolean {
  const code = (e as NodeJS.ErrnoException | undefined)?.code;
  return typeof code === 'string' && CODES_VERROU.has(code);
}

/**
 * Detecte le fichier temporaire `~$Classeur.xlsx` cree par Excel a l'ouverture.
 * Ce controle prealable evite d'ecrire dans un fichier qu'un utilisateur est en
 * train de consulter : sous Windows la lecture reste autorisee, seule
 * l'ecriture echoue, et on la detecterait trop tard.
 */
export function classeurOuvertDansExcel(cheminClasseur: string): boolean {
  try {
    const verrou = path.join(path.dirname(cheminClasseur), `~$${path.basename(cheminClasseur)}`);
    return fs.existsSync(verrou);
  } catch {
    return false;
  }
}

/** Verifie qu'on peut bien ecrire dans le dossier cible. */
export function dossierAccessibleEnEcriture(dossier: string): boolean {
  try {
    fs.mkdirSync(dossier, { recursive: true });
    const sonde = path.join(dossier, `.olmix-test-${process.pid}`);
    fs.writeFileSync(sonde, '');
    fs.unlinkSync(sonde);
    return true;
  } catch {
    return false;
  }
}
