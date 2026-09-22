/**
 * Etat de la saisie en cours.
 *
 * Volontairement centralise : le formulaire, le recapitulatif et la
 * cartographie lisent tous la meme source, ce qui garantit qu'un retour en
 * arriere ne perd jamais une reponse.
 */

import { create } from 'zustand';
import { cleReponse } from '@shared/columns';
import { validerEtape, type EtatEtape } from '@shared/validation';
import type { Brouillon, Produit, ValeurReponse } from '@shared/types';

export type Vue = 'accueil' | 'formulaire' | 'recapitulatif' | 'confirmation' | 'admin';

interface EtatSession {
  vue: Vue;
  /** Sens de la transition : 1 vers l'avant, -1 vers l'arriere. */
  direction: 1 | -1;

  operateur: string;
  matricule: string;
  produit: Produit | null;
  debutIso: string | null;

  indexEtape: number;
  valeurs: Record<string, ValeurReponse>;
  commentaires: Record<string, string>;
  /** Passe a vrai quand l'operateur tente d'avancer : declenche la mise en evidence. */
  tentative: boolean;

  definirIdentite: (operateur: string, matricule: string) => void;
  demarrer: (produit: Produit) => void;
  reprendre: (brouillon: Brouillon, produit: Produit) => void;
  definirValeur: (etapeId: string, questionId: string, valeur: ValeurReponse) => void;
  definirCommentaire: (etapeId: string, questionId: string, commentaire: string) => void;
  marquerTentative: () => void;
  allerEtape: (index: number) => void;
  suivant: (nbEtapes: number) => void;
  precedent: () => void;
  ouvrirRecapitulatif: () => void;
  modifierDepuisRecapitulatif: (index: number) => void;
  allerVue: (vue: Vue, direction?: 1 | -1) => void;
  reinitialiserSaisie: () => void;
  toutReinitialiser: () => void;
}

const SAISIE_VIDE = {
  produit: null,
  debutIso: null,
  indexEtape: 0,
  valeurs: {},
  commentaires: {},
  tentative: false,
} as const;

/** Valeurs initiales d'un produit, issues des `defaut` de la configuration. */
function valeursParDefaut(produit: Produit): Record<string, ValeurReponse> {
  const valeurs: Record<string, ValeurReponse> = {};
  for (const etape of produit.etapes) {
    for (const question of etape.questions) {
      const cle = cleReponse(etape.id, question.id);
      if (question.type === 'booleen') valeurs[cle] = question.defaut === true;
      else if (question.defaut !== undefined && question.defaut !== null) valeurs[cle] = question.defaut;
      else if (question.type === 'choix_multiple') valeurs[cle] = [];
      else valeurs[cle] = null;
    }
  }
  return valeurs;
}

export const useSession = create<EtatSession>((set, get) => ({
  vue: 'accueil',
  direction: 1,
  operateur: '',
  matricule: '',
  ...SAISIE_VIDE,

  definirIdentite: (operateur, matricule) => set({ operateur, matricule }),

  demarrer: (produit) =>
    set({
      vue: 'formulaire',
      direction: 1,
      produit,
      debutIso: new Date().toISOString(),
      indexEtape: 0,
      valeurs: valeursParDefaut(produit),
      commentaires: {},
      tentative: false,
    }),

  reprendre: (brouillon, produit) =>
    set({
      vue: 'formulaire',
      direction: 1,
      produit,
      operateur: brouillon.operateur,
      matricule: brouillon.matricule,
      debutIso: brouillon.debutIso,
      indexEtape: Math.min(brouillon.indexEtape, produit.etapes.length - 1),
      valeurs: { ...valeursParDefaut(produit), ...brouillon.valeurs },
      commentaires: brouillon.commentaires ?? {},
      tentative: false,
    }),

  definirValeur: (etapeId, questionId, valeur) =>
    set((etat) => ({ valeurs: { ...etat.valeurs, [cleReponse(etapeId, questionId)]: valeur } })),

  definirCommentaire: (etapeId, questionId, commentaire) =>
    set((etat) => ({ commentaires: { ...etat.commentaires, [cleReponse(etapeId, questionId)]: commentaire } })),

  marquerTentative: () => set({ tentative: true }),

  allerEtape: (index) => {
    const { indexEtape } = get();
    set({ indexEtape: index, direction: index >= indexEtape ? 1 : -1, tentative: false });
  },

  suivant: (nbEtapes) => {
    const { indexEtape } = get();
    if (indexEtape >= nbEtapes - 1) set({ vue: 'recapitulatif', direction: 1, tentative: false });
    else set({ indexEtape: indexEtape + 1, direction: 1, tentative: false });
  },

  precedent: () => {
    const { indexEtape } = get();
    if (indexEtape === 0) set({ vue: 'accueil', direction: -1 });
    else set({ indexEtape: indexEtape - 1, direction: -1, tentative: false });
  },

  ouvrirRecapitulatif: () => set({ vue: 'recapitulatif', direction: 1 }),

  modifierDepuisRecapitulatif: (index) =>
    set({ vue: 'formulaire', direction: -1, indexEtape: index, tentative: false }),

  allerVue: (vue, direction = 1) => set({ vue, direction }),

  reinitialiserSaisie: () => set({ vue: 'accueil', direction: -1, ...SAISIE_VIDE }),

  toutReinitialiser: () => set({ vue: 'accueil', direction: -1, operateur: '', matricule: '', ...SAISIE_VIDE }),
}));

/** Etat de validation de l'etape affichee. */
export function useValidationEtape(): EtatEtape {
  const produit = useSession((e) => e.produit);
  const indexEtape = useSession((e) => e.indexEtape);
  const valeurs = useSession((e) => e.valeurs);
  const commentaires = useSession((e) => e.commentaires);

  const etape = produit?.etapes[indexEtape];
  if (!etape) return { problemes: {}, complete: true, nbBloquants: 0, nbAvertissements: 0 };

  const valeursEtape: Record<string, ValeurReponse> = {};
  const commentairesEtape: Record<string, string> = {};
  for (const question of etape.questions) {
    const cle = cleReponse(etape.id, question.id);
    valeursEtape[question.id] = valeurs[cle] ?? null;
    commentairesEtape[question.id] = commentaires[cle] ?? '';
  }
  return validerEtape(etape.questions, valeursEtape, commentairesEtape);
}
