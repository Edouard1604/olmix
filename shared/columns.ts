/**
 * Derivation et normalisation des colonnes Excel.
 *
 * Regle d'or : un en-tete de colonne doit etre STABLE dans le temps. Power BI
 * reference les colonnes par leur nom ; renommer une colonne casse les mesures
 * et les visuels. C'est pourquoi `Question.colonne` est decouple de
 * `Question.libelle` : on peut reformuler une question sans toucher a l'export.
 */

import type { Question, Reponse, TypeQuestion, ValeurReponse } from './types';

/** Colonnes fixes, toujours presentes en tete de `T_Saisies`. */
export const COLONNES_FIXES_SAISIES = [
  'ID_Cycle',
  'Date',
  'Heure',
  'Date_Heure',
  'Operateur',
  'Matricule',
  'Produit',
  'Produit_ID',
  'Duree_Saisie_min',
  'Nb_Alertes',
  'Alertes',
] as const;

/** Colonnes de la feuille au format long `T_Reponses`. */
export const COLONNES_REPONSES = [
  'ID_Cycle',
  'Date',
  'Heure',
  'Operateur',
  'Matricule',
  'Produit',
  'Produit_ID',
  'Etape_Ordre',
  'Etape',
  'Question_ID',
  'Cle_Question',
  'Question',
  'Colonne',
  'Type',
  'Valeur_Texte',
  'Valeur_Code',
  'Valeur_Num',
  'Unite',
  'Hors_Bornes',
  'Commentaire',
] as const;

/** Colonnes du catalogue `T_Questions` (table de dimension pour Power BI). */
export const COLONNES_QUESTIONS = [
  'Cle_Question',
  'Produit_ID',
  'Produit',
  'Etape_Ordre',
  'Etape_ID',
  'Etape',
  'Question_ID',
  'Colonne',
  'Libelle',
  'Type',
  'Obligatoire',
  'Unite',
  'Min',
  'Max',
] as const;

const ACCENTS: Record<string, string> = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE', ß: 'ss' };

/**
 * Transforme un texte quelconque en en-tete de colonne exploitable :
 * sans accent, sans espace, sans caractere special, ne commencant pas par un
 * chiffre. Exemple : "Température séchage (°C)" -> "Temperature_sechage_C".
 */
export function normaliserEntete(texte: string): string {
  const sansLigatures = texte.replace(/[œŒæÆß]/g, (c) => ACCENTS[c] ?? c);
  const sansAccents = sansLigatures.normalize('NFD').replace(/[̀-ͯ]/g, '');
  let sortie = sansAccents
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!sortie) sortie = 'Colonne';
  if (/^[0-9]/.test(sortie)) sortie = `C_${sortie}`;
  // Excel limite les noms de colonne de tableau a 255 caracteres.
  return sortie.slice(0, 255);
}

/** En-tete Excel effectif d'une question. */
export function colonneDeQuestion(question: Question): string {
  return question.colonne?.trim() ? normaliserEntete(question.colonne) : normaliserEntete(question.id);
}

/** Cle interne d'une reponse dans le brouillon et l'etat du formulaire. */
export function cleReponse(etapeId: string, questionId: string): string {
  return `${etapeId}.${questionId}`;
}

const TYPES_NUMERIQUES: ReadonlySet<TypeQuestion> = new Set<TypeQuestion>(['nombre']);

export function estNumerique(type: TypeQuestion): boolean {
  return TYPES_NUMERIQUES.has(type);
}

/** Valeur telle qu'elle doit etre ecrite dans une cellule Excel. */
export function valeurCellule(type: TypeQuestion, valeur: ValeurReponse): string | number | Date | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  switch (type) {
    case 'nombre':
      return typeof valeur === 'number' ? valeur : Number(valeur);
    case 'booleen':
      return valeur ? 'OUI' : 'NON';
    case 'choix_multiple':
      return Array.isArray(valeur) ? valeur.join(' | ') : String(valeur);
    case 'date':
    case 'datetime': {
      const d = new Date(String(valeur));
      return Number.isNaN(d.getTime()) ? String(valeur) : d;
    }
    default:
      return String(valeur);
  }
}

/** Representation textuelle, utilisee par la feuille longue et le recapitulatif. */
export function valeurTexte(type: TypeQuestion, valeur: ValeurReponse): string {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  switch (type) {
    case 'booleen':
      return valeur ? 'OUI' : 'NON';
    case 'choix_multiple':
      return Array.isArray(valeur) ? valeur.join(' | ') : String(valeur);
    case 'date':
      return formaterDateFr(valeur);
    case 'datetime':
      return `${formaterDateFr(valeur)} ${String(valeur).slice(11, 16)}`.trim();
    default:
      return String(valeur);
  }
}

/** Code technique brut, conserve a cote du libelle (colonne `Valeur_Code`). */
export function valeurCode(valeur: ValeurReponse): string {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  if (Array.isArray(valeur)) return valeur.join(' | ');
  if (typeof valeur === 'boolean') return valeur ? 'OUI' : 'NON';
  return String(valeur);
}

/** Valeur numerique exploitable en Power BI (colonne `Valeur_Num`). */
export function valeurNumerique(type: TypeQuestion, valeur: ValeurReponse): number | null {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  if (type === 'nombre') {
    const n = typeof valeur === 'number' ? valeur : Number(valeur);
    return Number.isFinite(n) ? n : null;
  }
  if (type === 'booleen') return valeur ? 1 : 0;
  return null;
}

function formaterDateFr(valeur: ValeurReponse): string {
  const brut = String(valeur).slice(0, 10);
  const [a, m, j] = brut.split('-');
  return j ? `${j}/${m}/${a}` : brut;
}

/**
 * Colonnes dynamiques d'un cycle, dans l'ordre des etapes puis des questions.
 * Deux produits partageant le meme en-tete partagent la meme colonne Excel :
 * c'est voulu, cela permet de comparer les produits sur un indicateur commun.
 */
export function colonnesDynamiques(reponses: Reponse[]): string[] {
  const vues = new Set<string>();
  const sortie: string[] = [];
  for (const r of reponses) {
    if (vues.has(r.colonne)) continue;
    vues.add(r.colonne);
    sortie.push(r.colonne);
  }
  return sortie;
}
