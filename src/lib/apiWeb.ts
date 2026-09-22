/**
 * Adaptateur navigateur de l'API `window.olmix`.
 *
 * Dans l'application de bureau, `window.olmix` est injecte par
 * `electron/preload.ts` et toutes les operations passent par le processus
 * principal, seul a toucher le disque. Sur le web, ce pont n'existe pas :
 * ce module fournit la meme surface d'API, servie par le stockage local du
 * navigateur.
 *
 * C'est une VITRINE, pas l'application de production :
 *  - les saisies restent dans le navigateur du visiteur, chacun voit les
 *    siennes et personne ne voit celles des autres ;
 *  - aucun classeur Excel n'est ecrit, donc aucun lien avec Power BI ;
 *  - les chemins de fichiers affiches dans le diagnostic sont fictifs.
 *
 * Les regles metier, elles, sont les VRAIES : validation de la configuration,
 * controle des reponses et construction des cycles viennent de `shared/`,
 * exactement comme dans l'application de bureau. Ce que l'on essaie ici se
 * comporte donc comme ce que l'atelier utilisera.
 */

import configurationExemple from '../../config/produits.example.json';
import { validerConfiguration } from '@shared/schema';
import { construireCycle, genererIdCycle, type SaisieBrute } from '@shared/cycle';
import { validerEtape } from '@shared/validation';
import type { ApiOlmix, ConfigurationChargee, Sauvegarde } from '@shared/api';
import type {
  Brouillon,
  ConfigurationProduits,
  Cycle,
  InfosApplication,
  Reglages,
  ResumeEnregistrement,
  Resultat,
  StatutSync,
} from '@shared/types';

const PREFIXE = 'olmix.demo.';
const CLE_CONFIG = `${PREFIXE}configuration`;
const CLE_REGLAGES = `${PREFIXE}reglages`;
const CLE_BROUILLON = `${PREFIXE}brouillon`;
const CLE_CYCLES = `${PREFIXE}cycles`;
const CLE_MOT_DE_PASSE = `${PREFIXE}motDePasse`;

const MOT_DE_PASSE_INITIAL = 'olmix';
const VALIDITE_BROUILLON_HEURES = 24;

/** Chemins fictifs, affiches dans l'onglet Diagnostic. */
const CHEMIN_EXCEL_FICTIF = 'Non disponible sur la version web';
const DOSSIER_FICTIF = 'Navigateur (stockage local)';

/* ------------------------------------------------------------------ */
/* Stockage                                                            */
/* ------------------------------------------------------------------ */

/**
 * Le stockage local peut etre indisponible : navigation privee, cookies
 * bloques, quota depasse. Aucune de ces situations ne doit faire tomber
 * l'interface, on retombe alors sur la valeur par defaut.
 */
function lire<T>(cle: string, defaut: T): T {
  try {
    const brut = window.localStorage.getItem(cle);
    if (!brut) return defaut;
    return JSON.parse(brut) as T;
  } catch {
    return defaut;
  }
}

function ecrire(cle: string, valeur: unknown): void {
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Sans consequence : la session en cours reste utilisable, seule la
    // persistance d'un rechargement a l'autre est perdue.
  }
}

function effacer(cle: string): void {
  try {
    window.localStorage.removeItem(cle);
  } catch {
    // Idem.
  }
}

function ok<T>(valeur: T): Resultat<T> {
  return { ok: true, valeur };
}

function ko<T>(erreur: unknown): Resultat<T> {
  return { ok: false, erreur: erreur instanceof Error ? erreur.message : String(erreur) };
}

/* ------------------------------------------------------------------ */
/* Reglages                                                            */
/* ------------------------------------------------------------------ */

function reglagesParDefaut(): Reglages {
  return {
    cheminExcel: CHEMIN_EXCEL_FICTIF,
    nomFeuilleSaisies: 'Saisies',
    nomTableSaisies: 'T_Saisies',
    nomFeuilleReponses: 'Reponses',
    nomTableReponses: 'T_Reponses',
    nomFeuilleQuestions: 'Catalogue',
    nomTableQuestions: 'T_Questions',
    theme: 'clair',
    adminSel: '',
    adminHash: '',
    sauvegardeQuotidienne: false,
    retentionSauvegardesJours: 30,
    intervalleFileAttenteMs: 20_000,
  };
}

function reglagesCourants(): Reglages {
  return { ...reglagesParDefaut(), ...lire<Partial<Reglages>>(CLE_REGLAGES, {}) };
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

function configurationCourante(): ConfigurationProduits {
  const enregistree = lire<ConfigurationProduits | null>(CLE_CONFIG, null);
  const resultat = validerConfiguration(enregistree ?? configurationExemple);
  if (resultat.valide && resultat.configuration) return resultat.configuration;
  // Une configuration enregistree devenue invalide ne doit pas condamner la
  // demonstration : on repart de l'exemple livre avec le projet.
  const secours = validerConfiguration(configurationExemple);
  return secours.configuration ?? { version: 1, produits: [] };
}

function chargee(): ConfigurationChargee {
  const complete = configurationCourante();
  const resultat = validerConfiguration(complete);
  return {
    configuration: { ...complete, produits: complete.produits.filter((p) => p.actif !== false) },
    problemes: resultat.problemes,
  };
}

/* ------------------------------------------------------------------ */
/* Mot de passe administrateur                                         */
/* ------------------------------------------------------------------ */

/**
 * Le mot de passe de la vitrine n'est pas un secret : il est ecrit dans la
 * documentation et l'ecran de connexion l'affiche. On evite malgre tout de le
 * conserver en clair dans le navigateur.
 */
async function empreinte(motDePasse: string): Promise<string> {
  const donnees = new TextEncoder().encode(`olmix.demo:${motDePasse.normalize('NFKC')}`);
  const condensat = await crypto.subtle.digest('SHA-256', donnees);
  return [...new Uint8Array(condensat)].map((o) => o.toString(16).padStart(2, '0')).join('');
}

async function empreinteAttendue(): Promise<string> {
  const enregistree = lire<string | null>(CLE_MOT_DE_PASSE, null);
  return enregistree ?? (await empreinte(MOT_DE_PASSE_INITIAL));
}

/* ------------------------------------------------------------------ */
/* Cycles                                                              */
/* ------------------------------------------------------------------ */

function cyclesEnregistres(): Cycle[] {
  return lire<Cycle[]>(CLE_CYCLES, []);
}

/** Telecharge un contenu texte, faute de boite de dialogue « Enregistrer sous ». */
function telecharger(nomFichier: string, contenu: string): void {
  const lien = document.createElement('a');
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

/** Ouvre un selecteur de fichier et renvoie le contenu texte choisi. */
function choisirFichierTexte(): Promise<string | null> {
  return new Promise((resoudre) => {
    const entree = document.createElement('input');
    entree.type = 'file';
    entree.accept = '.json,application/json';
    entree.onchange = () => {
      const fichier = entree.files?.[0];
      if (!fichier) return resoudre(null);
      void fichier.text().then(resoudre);
    };
    // Une fenetre fermee sans choisir n'emet aucun evenement : sans ce filet,
    // la promesse ne se resoudrait jamais.
    entree.oncancel = () => resoudre(null);
    entree.click();
  });
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

/** Session administrateur, valable jusqu'au rechargement de la page. */
let adminDeverrouille = false;

function exigerAdmin(): void {
  if (!adminDeverrouille) throw new Error('Session administrateur requise.');
}

const STATUT_VITRINE: StatutSync = {
  etat: 'a_jour',
  enAttente: 0,
  dernierSuccesIso: null,
  message: 'Version web : les saisies restent dans ce navigateur.',
};

export const apiWeb: ApiOlmix = {
  async infos(): Promise<InfosApplication> {
    return {
      version: `${__VERSION_APP__} (web)`,
      dossierDonnees: DOSSIER_FICTIF,
      cheminConfig: DOSSIER_FICTIF,
      cheminExcel: CHEMIN_EXCEL_FICTIF,
      excelExiste: false,
      dossierSauvegardes: DOSSIER_FICTIF,
    };
  },

  async chargerConfiguration() {
    return ok(chargee());
  },

  async configurationComplete() {
    try {
      exigerAdmin();
      return ok(configurationCourante());
    } catch (e) {
      return ko(e);
    }
  },

  async enregistrerConfiguration(configuration) {
    try {
      exigerAdmin();
      const resultat = validerConfiguration(configuration);
      const bloquants = resultat.problemes.filter((p) => p.niveau === 'erreur');
      if (!resultat.valide || !resultat.configuration || bloquants.length) {
        return ko(bloquants.map((p) => `• ${p.message}`).join('\n') || 'Configuration invalide.');
      }
      ecrire(CLE_CONFIG, resultat.configuration);
      return ok(chargee());
    } catch (e) {
      return ko(e);
    }
  },

  async importerConfiguration() {
    try {
      exigerAdmin();
      const contenu = await choisirFichierTexte();
      if (contenu === null) return ok(null);
      const resultat = validerConfiguration(JSON.parse(contenu));
      const bloquants = resultat.problemes.filter((p) => p.niveau === 'erreur');
      if (!resultat.valide || !resultat.configuration || bloquants.length) {
        return ko(`Fichier refusé :\n${bloquants.map((p) => `• ${p.message}`).join('\n')}`);
      }
      ecrire(CLE_CONFIG, resultat.configuration);
      return ok(chargee());
    } catch (e) {
      return ko(e);
    }
  },

  async exporterConfiguration() {
    try {
      exigerAdmin();
      telecharger('produits.json', `${JSON.stringify(configurationCourante(), null, 2)}\n`);
      return ok('produits.json (dossier de téléchargements)');
    } catch (e) {
      return ko(e);
    }
  },

  async lireReglages() {
    return reglagesCourants();
  },

  async ecrireReglages(partiel) {
    try {
      const cles = Object.keys(partiel);
      if (cles.some((c) => c !== 'theme')) exigerAdmin();
      if (partiel.cheminExcel !== undefined) {
        throw new Error("La version web n'écrit aucun classeur Excel.");
      }
      const fusion = { ...reglagesCourants(), ...partiel };
      ecrire(CLE_REGLAGES, fusion);
      return ok(fusion);
    } catch (e) {
      return ko(e);
    }
  },

  async choisirFichierExcel() {
    return ko("La version web n'écrit aucun classeur Excel.");
  },

  async connexionAdmin(motDePasse) {
    const candidat = await empreinte(String(motDePasse ?? ''));
    if (candidat !== (await empreinteAttendue())) return ko('Mot de passe incorrect.');
    adminDeverrouille = true;
    const parDefaut = candidat === (await empreinte(MOT_DE_PASSE_INITIAL));
    return ok({ motDePasseParDefaut: parDefaut });
  },

  async deconnexionAdmin() {
    adminDeverrouille = false;
  },

  async changerMotDePasseAdmin(ancien, nouveau) {
    try {
      exigerAdmin();
      if ((await empreinte(String(ancien ?? ''))) !== (await empreinteAttendue())) {
        throw new Error('Mot de passe actuel incorrect.');
      }
      if (String(nouveau ?? '').length < 4) {
        throw new Error('Le nouveau mot de passe doit faire au moins 4 caracteres.');
      }
      ecrire(CLE_MOT_DE_PASSE, await empreinte(String(nouveau)));
      return ok(true as const);
    } catch (e) {
      return ko(e);
    }
  },

  async lireBrouillon(): Promise<Brouillon | null> {
    const brouillon = lire<Brouillon | null>(CLE_BROUILLON, null);
    if (!brouillon?.produitId) return null;
    const ageMs = Date.now() - new Date(brouillon.majIso).getTime();
    if (!Number.isFinite(ageMs) || ageMs > VALIDITE_BROUILLON_HEURES * 3_600_000) {
      effacer(CLE_BROUILLON);
      return null;
    }
    return brouillon;
  },

  async ecrireBrouillon(brouillon) {
    ecrire(CLE_BROUILLON, { ...brouillon, majIso: new Date().toISOString() });
  },

  async supprimerBrouillon() {
    effacer(CLE_BROUILLON);
  },

  async soumettreCycle(saisie: SaisieBrute): Promise<Resultat<ResumeEnregistrement>> {
    try {
      const configuration = configurationCourante();
      const produit = configuration.produits.find((p) => p.id === saisie.produitId);
      if (!produit) throw new Error(`Produit inconnu : « ${saisie.produitId} ».`);
      if (!saisie.operateur?.trim()) throw new Error('Le nom de l’opérateur est obligatoire.');

      // Les memes regles que dans le processus principal, rejouees ici : la
      // vitrine refuse exactement ce que l'application de bureau refuserait.
      for (const etape of produit.etapes) {
        const valeurs = Object.fromEntries(
          etape.questions.map((q) => [q.id, saisie.valeurs[`${etape.id}.${q.id}`] ?? null]),
        );
        const commentaires = Object.fromEntries(
          etape.questions.map((q) => [q.id, saisie.commentaires[`${etape.id}.${q.id}`] ?? '']),
        );
        const etat = validerEtape(etape.questions, valeurs, commentaires);
        if (!etat.complete) {
          const details = Object.values(etat.problemes)
            .filter((p) => p.gravite === 'bloquant')
            .map((p) => `• ${etape.nom} : ${p.message}`)
            .join('\n');
          throw new Error(`Saisie incomplète.\n${details}`);
        }
      }

      const fin = new Date();
      const aleatoire = [...crypto.getRandomValues(new Uint8Array(2))]
        .map((o) => o.toString(16).padStart(2, '0'))
        .join('');
      const id = genererIdCycle(fin, aleatoire);
      const cycle = construireCycle(produit, saisie, id, fin.toISOString(), configuration.version);

      ecrire(CLE_CYCLES, [cycle, ...cyclesEnregistres()].slice(0, 200));
      effacer(CLE_BROUILLON);

      return ok({
        cycleId: id,
        ecritDansExcel: false,
        raisonAttente:
          'Version web de démonstration : la saisie est conservée dans ce navigateur. ' +
          "L'application installée en atelier l'ajouterait au classeur Excel cumulatif.",
      });
    } catch (e) {
      return ko(e);
    }
  },

  async listerCycles(limite = 50) {
    return cyclesEnregistres().slice(0, limite);
  },

  async statutSync() {
    return STATUT_VITRINE;
  },

  async forcerSync() {
    return STATUT_VITRINE;
  },

  surStatutSync() {
    // Aucun changement d'etat possible sur la vitrine : rien a desabonner.
    return () => {};
  },

  async ouvrirClasseur() {
    return ko("La version web n'écrit aucun classeur Excel.");
  },

  async ouvrirDossier() {
    return ko("La version web n'a pas accès aux dossiers du poste.");
  },

  async listerSauvegardes(): Promise<Sauvegarde[]> {
    return [];
  },
};

/**
 * Installe l'adaptateur lorsque le pont Electron est absent.
 * @returns true si l'on tourne dans un navigateur, false dans l'application.
 */
export function installerApiWeb(): boolean {
  if (typeof window !== 'undefined' && window.olmix) return false;
  window.olmix = apiWeb;
  return true;
}
