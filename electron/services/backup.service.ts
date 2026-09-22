/**
 * Sauvegarde de secours quotidienne du classeur.
 *
 * Une copie datee est deposee dans `sauvegardes/` au premier enregistrement de
 * la journee, AVANT toute ecriture : si une ecriture corrompait le classeur ou
 * si quelqu'un l'ecrasait, on dispose toujours de l'etat de la veille.
 */

import fs from 'node:fs';
import path from 'node:path';
import { assurerDossier, dossierSauvegardes } from './paths';
import { journal } from './logger';

function jourCourant(): string {
  const maintenant = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${maintenant.getFullYear()}-${p(maintenant.getMonth() + 1)}-${p(maintenant.getDate())}`;
}

/** Copie le classeur du jour s'il n'a pas encore ete sauvegarde. */
export function sauvegarderSiNecessaire(cheminClasseur: string, retentionJours: number): void {
  try {
    if (!fs.existsSync(cheminClasseur)) return;
    const dossier = dossierSauvegardes();
    assurerDossier(dossier);

    const base = path.basename(cheminClasseur, path.extname(cheminClasseur));
    const cible = path.join(dossier, `${base}_${jourCourant()}.xlsx`);
    if (fs.existsSync(cible)) return;

    fs.copyFileSync(cheminClasseur, cible);
    journal.info('Sauvegarde quotidienne creee', cible);
    purger(dossier, base, retentionJours);
  } catch (e) {
    // Une sauvegarde impossible ne doit jamais empecher une saisie.
    journal.avertissement('Sauvegarde quotidienne impossible', e);
  }
}

function purger(dossier: string, base: string, retentionJours: number): void {
  if (retentionJours <= 0) return;
  const limite = Date.now() - retentionJours * 86_400_000;
  for (const fichier of fs.readdirSync(dossier)) {
    if (!fichier.startsWith(`${base}_`) || !fichier.endsWith('.xlsx')) continue;
    const complet = path.join(dossier, fichier);
    try {
      if (fs.statSync(complet).mtimeMs < limite) {
        fs.rmSync(complet, { force: true });
        journal.info('Sauvegarde expiree supprimee', fichier);
      }
    } catch {
      // Fichier verrouille ou deja supprime : sans consequence.
    }
  }
}

export function listerSauvegardes(): { nom: string; taille: number; dateIso: string }[] {
  const dossier = dossierSauvegardes();
  if (!fs.existsSync(dossier)) return [];
  return fs
    .readdirSync(dossier)
    .filter((f) => f.endsWith('.xlsx'))
    .map((nom) => {
      const stat = fs.statSync(path.join(dossier, nom));
      return { nom, taille: stat.size, dateIso: new Date(stat.mtimeMs).toISOString() };
    })
    .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
}
