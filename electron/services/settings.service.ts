/**
 * Reglages de l'application et authentification du mode administrateur.
 */

import crypto from 'node:crypto';
import type { Reglages, Theme } from '../../shared/types';
import { cheminExcelParDefaut, cheminReglages } from './paths';
import { ecrireJson, lireJson } from './fs-utils';
import { journal } from './logger';

/** Mot de passe initial, a changer des la premiere connexion admin. */
const MOT_DE_PASSE_INITIAL = 'olmix';

let cache: Reglages | null = null;

function derivation(motDePasse: string, sel: string): string {
  return crypto.scryptSync(motDePasse.normalize('NFKC'), sel, 64).toString('hex');
}

function reglagesParDefaut(): Reglages {
  const sel = crypto.randomBytes(16).toString('hex');
  return {
    cheminExcel: cheminExcelParDefaut(),
    nomFeuilleSaisies: 'Saisies',
    nomTableSaisies: 'T_Saisies',
    nomFeuilleReponses: 'Reponses',
    nomTableReponses: 'T_Reponses',
    nomFeuilleQuestions: 'Catalogue',
    nomTableQuestions: 'T_Questions',
    theme: 'clair',
    adminSel: sel,
    adminHash: derivation(MOT_DE_PASSE_INITIAL, sel),
    sauvegardeQuotidienne: true,
    retentionSauvegardesJours: 30,
    intervalleFileAttenteMs: 20_000,
  };
}

export function lireReglages(): Reglages {
  if (cache) return cache;
  const defauts = reglagesParDefaut();
  const enregistres = lireJson<Partial<Reglages>>(cheminReglages(), {});
  cache = { ...defauts, ...enregistres };
  // Les noms de feuilles et de tables ne doivent jamais etre vides.
  for (const cle of [
    'nomFeuilleSaisies',
    'nomTableSaisies',
    'nomFeuilleReponses',
    'nomTableReponses',
    'nomFeuilleQuestions',
    'nomTableQuestions',
  ] as const) {
    if (!cache[cle]?.trim()) cache[cle] = defauts[cle];
  }
  if (!cache.cheminExcel?.trim()) cache.cheminExcel = defauts.cheminExcel;
  return cache;
}

export function ecrireReglages(partiel: Partial<Reglages>): Reglages {
  const fusion = { ...lireReglages(), ...partiel };
  cache = fusion;
  ecrireJson(cheminReglages(), fusion);
  journal.info('Reglages mis a jour', Object.keys(partiel).join(', '));
  return fusion;
}

export function definirTheme(theme: Theme): Reglages {
  return ecrireReglages({ theme });
}

export function verifierMotDePasseAdmin(motDePasse: string): boolean {
  const { adminHash, adminSel } = lireReglages();
  const candidat = Buffer.from(derivation(motDePasse, adminSel), 'hex');
  const attendu = Buffer.from(adminHash, 'hex');
  if (candidat.length !== attendu.length) return false;
  return crypto.timingSafeEqual(candidat, attendu);
}

export function changerMotDePasseAdmin(ancien: string, nouveau: string): void {
  if (!verifierMotDePasseAdmin(ancien)) throw new Error('Mot de passe actuel incorrect.');
  if (nouveau.length < 4) throw new Error('Le nouveau mot de passe doit faire au moins 4 caracteres.');
  const sel = crypto.randomBytes(16).toString('hex');
  ecrireReglages({ adminSel: sel, adminHash: derivation(nouveau, sel) });
}

/** Vrai tant que le mot de passe d'usine n'a pas ete change. */
export function motDePasseParDefautActif(): boolean {
  return verifierMotDePasseAdmin(MOT_DE_PASSE_INITIAL);
}
