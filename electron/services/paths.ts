/**
 * Emplacements de fichiers de l'application.
 *
 * Tout ce qui est modifiable par l'utilisateur vit dans le dossier de donnees
 * utilisateur (%APPDATA%/olmix-saisie-production sous Windows), jamais dans le
 * dossier d'installation : celui-ci est en lecture seule pour un compte non
 * administrateur et serait ecrase a chaque mise a jour.
 */

import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export function dossierDonnees(): string {
  return app.getPath('userData');
}

export function cheminConfigProduits(): string {
  return path.join(dossierDonnees(), 'config', 'produits.json');
}

export function cheminReglages(): string {
  return path.join(dossierDonnees(), 'reglages.json');
}

export function cheminBrouillon(): string {
  return path.join(dossierDonnees(), 'brouillon.json');
}

export function dossierCycles(): string {
  return path.join(dossierDonnees(), 'cycles');
}

export function cheminFileAttente(): string {
  return path.join(dossierDonnees(), 'file-attente.json');
}

export function dossierSauvegardes(): string {
  return path.join(dossierDonnees(), 'sauvegardes');
}

export function cheminJournal(): string {
  return path.join(dossierDonnees(), 'journal.log');
}

/** Configuration d'exemple embarquee dans l'installeur. */
export function cheminConfigExemple(): string {
  const empaquete = path.join(process.resourcesPath ?? '', 'config', 'produits.example.json');
  if (fs.existsSync(empaquete)) return empaquete;
  // En developpement, on lit directement le fichier du depot.
  return path.join(app.getAppPath(), 'config', 'produits.example.json');
}

/** Emplacement par defaut du classeur cumulatif : Documents/Olmix. */
export function cheminExcelParDefaut(): string {
  return path.join(app.getPath('documents'), 'Olmix', 'Saisies_Production.xlsx');
}

export function assurerDossier(chemin: string): void {
  fs.mkdirSync(chemin, { recursive: true });
}
