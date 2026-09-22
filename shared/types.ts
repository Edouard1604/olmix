/**
 * Types partages entre le processus principal Electron et l'interface React.
 * Ce fichier est la reference unique du modele de donnees.
 */

/* ------------------------------------------------------------------ */
/* Configuration des produits                                          */
/* ------------------------------------------------------------------ */

export type TypeQuestion =
  | 'texte'
  | 'textarea'
  | 'nombre'
  | 'booleen'
  | 'liste'
  | 'choix_multiple'
  | 'date'
  | 'heure'
  | 'datetime';

export interface OptionQuestion {
  valeur: string;
  libelle: string;
}

export interface Question {
  /** Identifiant technique, stable, unique au sein du produit. */
  id: string;
  /**
   * En-tete de colonne Excel. Doit rester stable dans le temps meme si le
   * libelle evolue : c'est cette valeur que Power BI voit.
   * Si absent, il est derive de `id`.
   */
  colonne?: string;
  libelle: string;
  aide?: string;
  type: TypeQuestion;
  obligatoire: boolean;
  /** Unite affichee a cote du champ (kg, °C, min...). Jamais ecrite en cellule. */
  unite?: string | null;
  min?: number | null;
  max?: number | null;
  /** Nombre de decimales acceptees pour les champs numeriques. */
  decimales?: number;
  options?: OptionQuestion[];
  defaut?: string | number | boolean | string[] | null;
  /** Exiger un commentaire lorsque la valeur sort des bornes (defaut: true). */
  commentaireSiHorsBornes?: boolean;
}

export interface EtapeProcessus {
  id: string;
  nom: string;
  description?: string;
  icone?: string;
  questions: Question[];
}

export interface Produit {
  id: string;
  nom: string;
  description?: string;
  /** Couleur d'accent de la carte produit et de la cartographie (hex). */
  couleur?: string;
  icone?: string;
  actif?: boolean;
  etapes: EtapeProcessus[];
}

export interface ConfigurationProduits {
  version: number;
  produits: Produit[];
}

/* ------------------------------------------------------------------ */
/* Saisies                                                             */
/* ------------------------------------------------------------------ */

export type ValeurReponse = string | number | boolean | string[] | null;

export interface Reponse {
  questionId: string;
  colonne: string;
  libelle: string;
  etapeId: string;
  etapeNom: string;
  etapeOrdre: number;
  type: TypeQuestion;
  valeur: ValeurReponse;
  /**
   * Valeur lisible par un humain : pour les listes, le libelle de l'option et
   * non son code technique. C'est cette valeur qui part dans le classeur, pour
   * que les slicers Power BI affichent « Algues de l'Ouest » et non « ALG_OUEST ».
   */
  affichage: string;
  unite: string | null;
  horsBornes: boolean;
  commentaire: string | null;
}

export interface Cycle {
  /** ID_Cycle : identifiant unique et immuable de la saisie. */
  id: string;
  produitId: string;
  produitNom: string;
  operateur: string;
  matricule: string;
  /** Horodatage ISO de debut et de validation de la saisie. */
  debutIso: string;
  finIso: string;
  versionConfig: number;
  reponses: Reponse[];
}

/* ------------------------------------------------------------------ */
/* Brouillon (reprise apres fermeture accidentelle)                    */
/* ------------------------------------------------------------------ */

export interface Brouillon {
  produitId: string;
  produitNom: string;
  operateur: string;
  matricule: string;
  debutIso: string;
  majIso: string;
  indexEtape: number;
  /** Cle = `${etapeId}.${questionId}` */
  valeurs: Record<string, ValeurReponse>;
  commentaires: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Reglages                                                            */
/* ------------------------------------------------------------------ */

export type Theme = 'clair' | 'sombre' | 'systeme';

export interface Reglages {
  /** Chemin complet du classeur cumulatif (.xlsx). Local, reseau ou OneDrive. */
  cheminExcel: string;
  nomFeuilleSaisies: string;
  nomTableSaisies: string;
  nomFeuilleReponses: string;
  nomTableReponses: string;
  nomFeuilleQuestions: string;
  nomTableQuestions: string;
  theme: Theme;
  /** Empreinte scrypt du mot de passe administrateur. */
  adminHash: string;
  adminSel: string;
  sauvegardeQuotidienne: boolean;
  retentionSauvegardesJours: number;
  /** Delai entre deux tentatives d'ecriture quand le fichier est verrouille (ms). */
  intervalleFileAttenteMs: number;
}

/* ------------------------------------------------------------------ */
/* Etat de synchronisation Excel                                       */
/* ------------------------------------------------------------------ */

export type EtatSync = 'a_jour' | 'ecriture' | 'en_attente' | 'erreur';

export interface StatutSync {
  etat: EtatSync;
  /** Nombre de cycles encore en file d'attente. */
  enAttente: number;
  dernierSuccesIso: string | null;
  message: string | null;
}

/* ------------------------------------------------------------------ */
/* Enveloppe de resultat IPC                                           */
/* ------------------------------------------------------------------ */

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

export interface ResumeEnregistrement {
  cycleId: string;
  ecritDansExcel: boolean;
  /** Renseigne lorsque l'ecriture a ete differee (fichier verrouille). */
  raisonAttente: string | null;
}

export interface InfosApplication {
  version: string;
  dossierDonnees: string;
  cheminConfig: string;
  cheminExcel: string;
  excelExiste: boolean;
  dossierSauvegardes: string;
}
