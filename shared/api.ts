/**
 * Surface d'API exposee a l'interface par le preload.
 * Le renderer n'a aucun acces direct au disque : tout passe par ces methodes.
 */

import type { ResultatValidation } from './schema';
import type { SaisieBrute } from './cycle';
import type {
  Brouillon,
  ConfigurationProduits,
  Cycle,
  InfosApplication,
  Reglages,
  ResumeEnregistrement,
  Resultat,
  StatutSync,
} from './types';

export interface ConfigurationChargee {
  configuration: ConfigurationProduits;
  problemes: ResultatValidation['problemes'];
}

export interface Sauvegarde {
  nom: string;
  taille: number;
  dateIso: string;
}

export interface ApiOlmix {
  infos(): Promise<InfosApplication>;

  chargerConfiguration(): Promise<Resultat<ConfigurationChargee>>;
  configurationComplete(): Promise<Resultat<ConfigurationProduits>>;
  enregistrerConfiguration(configuration: ConfigurationProduits): Promise<Resultat<ConfigurationChargee>>;
  importerConfiguration(): Promise<Resultat<ConfigurationChargee | null>>;
  exporterConfiguration(): Promise<Resultat<string | null>>;

  lireReglages(): Promise<Reglages>;
  ecrireReglages(partiel: Partial<Reglages>): Promise<Resultat<Reglages>>;
  choisirFichierExcel(): Promise<Resultat<string | null>>;

  connexionAdmin(motDePasse: string): Promise<Resultat<{ motDePasseParDefaut: boolean }>>;
  deconnexionAdmin(): Promise<void>;
  changerMotDePasseAdmin(ancien: string, nouveau: string): Promise<Resultat<true>>;

  lireBrouillon(): Promise<Brouillon | null>;
  ecrireBrouillon(brouillon: Brouillon): Promise<void>;
  supprimerBrouillon(): Promise<void>;

  soumettreCycle(saisie: SaisieBrute): Promise<Resultat<ResumeEnregistrement>>;
  listerCycles(limite?: number): Promise<Cycle[]>;

  statutSync(): Promise<StatutSync>;
  forcerSync(): Promise<StatutSync>;
  surStatutSync(rappel: (statut: StatutSync) => void): () => void;

  ouvrirClasseur(): Promise<Resultat<true>>;
  ouvrirDossier(cible: 'excel' | 'donnees' | 'sauvegardes' | 'config'): Promise<Resultat<true>>;
  listerSauvegardes(): Promise<Sauvegarde[]>;
}

declare global {
  interface Window {
    olmix: ApiOlmix;
  }
}
