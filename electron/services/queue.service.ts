/**
 * File d'attente d'ecriture vers le classeur.
 *
 * Une saisie validee est TOUJOURS enregistree localement en premier, puis mise
 * en file. Si le classeur est ouvert dans Excel ou momentanement inaccessible
 * (partage reseau coupe, OneDrive en cours de synchronisation), la saisie reste
 * en file et sera ecrite automatiquement des que le fichier redevient
 * disponible. L'operateur n'a rien a refaire.
 */

import type { Cycle, StatutSync } from '../../shared/types';
import { ajouterCyclesAuClasseur, ClasseurVerrouilleError } from './excel.service';
import { configurationComplete } from './config.service';
import { lireReglages } from './settings.service';
import { enregistrerCycle, lireCycle } from './store.service';
import { sauvegarderSiNecessaire } from './backup.service';
import { cheminFileAttente } from './paths';
import { ecrireJson, lireJson } from './fs-utils';
import { journal, messageErreur } from './logger';

interface EtatFile {
  /** Identifiants de cycles en attente d'ecriture, dans l'ordre de saisie. */
  ids: string[];
  dernierSuccesIso: string | null;
  message: string | null;
  enErreur: boolean;
}

const ETAT_INITIAL: EtatFile = { ids: [], dernierSuccesIso: null, message: null, enErreur: false };

let etat: EtatFile = ETAT_INITIAL;
let ecritureEnCours = false;
let minuterie: NodeJS.Timeout | null = null;
let notifier: (statut: StatutSync) => void = () => {};

export function initialiserFileAttente(surChangement: (statut: StatutSync) => void): void {
  notifier = surChangement;
  etat = { ...ETAT_INITIAL, ...lireJson<Partial<EtatFile>>(cheminFileAttente(), {}) };
  programmerReessai();
  void viderFile();
}

export function arreterFileAttente(): void {
  if (minuterie) clearTimeout(minuterie);
  minuterie = null;
}

export function statut(): StatutSync {
  let code: StatutSync['etat'] = 'a_jour';
  if (ecritureEnCours) code = 'ecriture';
  else if (etat.enErreur) code = 'erreur';
  else if (etat.ids.length) code = 'en_attente';
  return {
    etat: code,
    enAttente: etat.ids.length,
    dernierSuccesIso: etat.dernierSuccesIso,
    message: etat.message,
  };
}

function persister(): void {
  ecrireJson(cheminFileAttente(), etat);
  notifier(statut());
}

/**
 * Enregistre un cycle valide : stockage local, mise en file, puis tentative
 * d'ecriture immediate.
 * @returns true si le cycle est deja dans le classeur.
 */
export async function soumettreCycle(cycle: Cycle): Promise<{ ecrit: boolean; raison: string | null }> {
  enregistrerCycle(cycle);
  if (!etat.ids.includes(cycle.id)) etat.ids.push(cycle.id);
  persister();

  const resultat = await viderFile();
  return { ecrit: !etat.ids.includes(cycle.id), raison: resultat.raison };
}

/** Tente d'ecrire tous les cycles en attente. Ne leve jamais d'exception. */
export async function viderFile(): Promise<{ ecrits: number; raison: string | null }> {
  if (ecritureEnCours || !etat.ids.length) return { ecrits: 0, raison: etat.message };

  ecritureEnCours = true;
  notifier(statut());

  try {
    const reglages = lireReglages();
    const cycles = etat.ids
      .map((id) => lireCycle(id))
      .filter((c): c is Cycle => {
        if (c) return true;
        journal.avertissement('Cycle en file introuvable dans le stockage local, il est retire.');
        return false;
      });

    if (!cycles.length) {
      etat = { ...etat, ids: [], enErreur: false, message: null };
      return { ecrits: 0, raison: null };
    }

    if (reglages.sauvegardeQuotidienne) {
      sauvegarderSiNecessaire(reglages.cheminExcel, reglages.retentionSauvegardesJours);
    }

    const resultat = await ajouterCyclesAuClasseur(cycles, configurationComplete().produits, reglages);
    const traites = new Set([...resultat.ajoutes, ...resultat.deja]);
    etat = {
      ids: etat.ids.filter((id) => !traites.has(id)),
      dernierSuccesIso: new Date().toISOString(),
      message: null,
      enErreur: false,
    };
    return { ecrits: resultat.ajoutes.length, raison: null };
  } catch (e) {
    const verrouille = e instanceof ClasseurVerrouilleError;
    etat = {
      ...etat,
      enErreur: !verrouille,
      message: verrouille
        ? `${messageErreur(e)} Les saisies sont conservées et seront écrites automatiquement.`
        : messageErreur(e),
    };
    journal[verrouille ? 'avertissement' : 'erreur']('Ecriture dans le classeur differee', e);
    return { ecrits: 0, raison: etat.message };
  } finally {
    ecritureEnCours = false;
    persister();
    programmerReessai();
  }
}

/** Reprogramme un essai tant que la file n'est pas vide. */
function programmerReessai(): void {
  if (minuterie) clearTimeout(minuterie);
  minuterie = null;
  if (!etat.ids.length) return;
  minuterie = setTimeout(() => void viderFile(), lireReglages().intervalleFileAttenteMs);
  minuterie.unref?.();
}
