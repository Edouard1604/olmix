/**
 * Construction d'un cycle a partir de la configuration et des valeurs saisies.
 *
 * L'interface n'envoie que des valeurs brutes ; c'est le processus principal
 * qui reconstruit le cycle depuis la configuration de reference. Ainsi les
 * en-tetes de colonnes, libelles et unites ecrits dans Excel proviennent
 * toujours du JSON, jamais de l'ecran.
 */

import { colonneDeQuestion, valeurTexte } from './columns';
import { estHorsBornes, estVide, nombreDepuis } from './validation';
import type { Cycle, Produit, Question, Reponse, ValeurReponse } from './types';

export interface SaisieBrute {
  produitId: string;
  operateur: string;
  matricule: string;
  debutIso: string;
  /** Cle = `${etapeId}.${questionId}` */
  valeurs: Record<string, ValeurReponse>;
  commentaires: Record<string, string>;
}

/** Normalise une valeur selon le type declare de la question. */
export function normaliserValeur(question: Question, valeur: ValeurReponse): ValeurReponse {
  if (question.type === 'booleen') return valeur === true;
  if (estVide(valeur)) return null;
  if (question.type === 'nombre') {
    const n = nombreDepuis(valeur);
    if (n === null) return null;
    const decimales = question.decimales ?? 3;
    return Number(n.toFixed(decimales));
  }
  if (question.type === 'choix_multiple') {
    return Array.isArray(valeur) ? valeur.map(String) : [String(valeur)];
  }
  return typeof valeur === 'string' ? valeur.trim() : valeur;
}

/**
 * Traduit une valeur en texte lisible : les codes d'options sont remplaces par
 * leur libelle, le reste est mis en forme selon son type.
 */
export function resoudreAffichage(question: Question, valeur: ValeurReponse): string {
  if (estVide(valeur)) return question.type === 'booleen' ? (valeur ? 'OUI' : 'NON') : '';
  const libelleOption = (code: string): string =>
    question.options?.find((o) => o.valeur === code)?.libelle ?? code;

  if (question.type === 'liste') return libelleOption(String(valeur));
  if (question.type === 'choix_multiple') {
    const codes = Array.isArray(valeur) ? valeur : [String(valeur)];
    return codes.map((c) => libelleOption(String(c))).join(' | ');
  }
  return valeurTexte(question.type, valeur);
}

export function construireCycle(
  produit: Produit,
  saisie: SaisieBrute,
  id: string,
  finIso: string,
  versionConfig: number,
): Cycle {
  const reponses: Reponse[] = [];

  produit.etapes.forEach((etape, indexEtape) => {
    for (const question of etape.questions) {
      const cle = `${etape.id}.${question.id}`;
      const valeur = normaliserValeur(question, saisie.valeurs[cle] ?? null);
      const horsBornes = estHorsBornes(question, valeur);
      const commentaire = saisie.commentaires[cle]?.trim() || null;
      reponses.push({
        questionId: question.id,
        colonne: colonneDeQuestion(question),
        libelle: question.libelle,
        etapeId: etape.id,
        etapeNom: etape.nom,
        etapeOrdre: indexEtape + 1,
        type: question.type,
        valeur,
        affichage: resoudreAffichage(question, valeur),
        unite: question.unite ?? null,
        horsBornes,
        // Le commentaire n'est conserve que la ou il a un sens metier.
        commentaire: horsBornes ? commentaire : null,
      });
    }
  });

  return {
    id,
    produitId: produit.id,
    produitNom: produit.nom,
    operateur: saisie.operateur.trim(),
    matricule: saisie.matricule.trim(),
    debutIso: saisie.debutIso,
    finIso,
    versionConfig,
    reponses,
  };
}

/**
 * Identifiant de cycle lisible et trie chronologiquement :
 * `CY-20260922-143012-4F7A`.
 */
export function genererIdCycle(instant: Date, aleatoire: string): string {
  const p = (n: number, taille = 2) => String(n).padStart(taille, '0');
  const date = `${instant.getFullYear()}${p(instant.getMonth() + 1)}${p(instant.getDate())}`;
  const heure = `${p(instant.getHours())}${p(instant.getMinutes())}${p(instant.getSeconds())}`;
  return `CY-${date}-${heure}-${aleatoire.toUpperCase().slice(0, 4)}`;
}
