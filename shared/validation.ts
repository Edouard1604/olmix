/**
 * Regles de saisie, partagees par l'interface et le processus principal.
 *
 * L'interface s'en sert pour activer/desactiver le bouton « Suivant » en
 * temps reel ; le processus principal les rejoue avant d'ecrire, pour qu'aucune
 * saisie invalide ne puisse atteindre le classeur meme en cas de bug cote UI.
 */

import type { Question, TypeQuestion, ValeurReponse } from './types';

export type GraviteProbleme = 'bloquant' | 'avertissement';

export type CodeProbleme = 'manquant' | 'invalide' | 'hors_bornes' | 'commentaire_requis';

export interface ProblemeChamp {
  questionId: string;
  code: CodeProbleme;
  gravite: GraviteProbleme;
  message: string;
}

/** Un matricule comporte exactement ce nombre de chiffres. */
export const LONGUEUR_MATRICULE = 5;

const MATRICULE = new RegExp(`^\\d{${LONGUEUR_MATRICULE}}$`);

/** Ne conserve que les chiffres, dans la limite de la longueur attendue. */
export function nettoyerMatricule(saisi: string): string {
  return saisi.replace(/\D/g, '').slice(0, LONGUEUR_MATRICULE);
}

/**
 * Le matricule reste facultatif ; mais s'il est renseigne, il doit comporter
 * exactement `LONGUEUR_MATRICULE` chiffres.
 * @returns le message d'erreur, ou null si la valeur est acceptable.
 */
export function erreurMatricule(matricule: string): string | null {
  const valeur = matricule.trim();
  if (valeur === '') return null;
  if (!MATRICULE.test(valeur)) {
    return `Le matricule doit comporter exactement ${LONGUEUR_MATRICULE} chiffres.`;
  }
  return null;
}

export function estVide(valeur: ValeurReponse): boolean {
  if (valeur === null || valeur === undefined) return true;
  if (typeof valeur === 'string') return valeur.trim() === '';
  if (Array.isArray(valeur)) return valeur.length === 0;
  if (typeof valeur === 'number') return Number.isNaN(valeur);
  return false;
}

/** Une case a cocher repond toujours quelque chose : cochee ou non. */
function typeToujoursRenseigne(type: TypeQuestion): boolean {
  return type === 'booleen';
}

export function nombreDepuis(valeur: ValeurReponse): number | null {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null;
  if (typeof valeur !== 'string') return null;
  const nettoye = valeur.trim().replace(',', '.');
  if (nettoye === '') return null;
  const n = Number(nettoye);
  return Number.isFinite(n) ? n : null;
}

/** Vrai si la valeur numerique sort des bornes configurees. */
export function estHorsBornes(question: Question, valeur: ValeurReponse): boolean {
  if (question.type !== 'nombre') return false;
  const n = nombreDepuis(valeur);
  if (n === null) return false;
  if (question.min != null && n < question.min) return true;
  if (question.max != null && n > question.max) return true;
  return false;
}

function commentaireExige(question: Question): boolean {
  return question.commentaireSiHorsBornes !== false;
}

/** Libelle des bornes, pour les messages et l'aide contextuelle. */
export function libelleBornes(question: Question): string | null {
  const { min, max, unite } = question;
  const u = unite ? ` ${unite}` : '';
  if (min != null && max != null) return `attendu entre ${min}${u} et ${max}${u}`;
  if (min != null) return `attendu au minimum ${min}${u}`;
  if (max != null) return `attendu au maximum ${max}${u}`;
  return null;
}

/**
 * Valide une reponse isolee. Renvoie le probleme le plus grave, ou null.
 * Une valeur hors bornes n'est jamais bloquante en soi : elle exige un
 * commentaire, et c'est l'absence de ce commentaire qui bloque.
 */
export function validerReponse(
  question: Question,
  valeur: ValeurReponse,
  commentaire: string | null,
): ProblemeChamp | null {
  const vide = estVide(valeur) && !typeToujoursRenseigne(question.type);

  if (question.obligatoire && vide) {
    return {
      questionId: question.id,
      code: 'manquant',
      gravite: 'bloquant',
      message: 'Cette réponse est obligatoire.',
    };
  }

  if (question.type === 'nombre' && !vide && nombreDepuis(valeur) === null) {
    return {
      questionId: question.id,
      code: 'invalide',
      gravite: 'bloquant',
      message: 'Saisissez un nombre.',
    };
  }

  if (estHorsBornes(question, valeur)) {
    if (commentaireExige(question) && !commentaire?.trim()) {
      return {
        questionId: question.id,
        code: 'commentaire_requis',
        gravite: 'bloquant',
        message: `Valeur hors plage (${libelleBornes(question)}) : expliquez pourquoi dans le commentaire.`,
      };
    }
    return {
      questionId: question.id,
      code: 'hors_bornes',
      gravite: 'avertissement',
      message: `Valeur hors plage (${libelleBornes(question)}).`,
    };
  }

  return null;
}

export interface EtatEtape {
  problemes: Record<string, ProblemeChamp>;
  /** Vrai si l'etape peut etre quittee vers la suivante. */
  complete: boolean;
  nbBloquants: number;
  nbAvertissements: number;
}

export function validerEtape(
  questions: Question[],
  valeurs: Record<string, ValeurReponse>,
  commentaires: Record<string, string>,
): EtatEtape {
  const problemes: Record<string, ProblemeChamp> = {};
  let nbBloquants = 0;
  let nbAvertissements = 0;

  for (const question of questions) {
    const probleme = validerReponse(question, valeurs[question.id] ?? null, commentaires[question.id] ?? null);
    if (!probleme) continue;
    problemes[question.id] = probleme;
    if (probleme.gravite === 'bloquant') nbBloquants += 1;
    else nbAvertissements += 1;
  }

  return { problemes, complete: nbBloquants === 0, nbBloquants, nbAvertissements };
}
