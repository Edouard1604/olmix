/**
 * Pont entre l'interface et le processus principal.
 *
 * `contextIsolation` est actif et `nodeIntegration` desactive : le renderer ne
 * voit que les methodes declarees ici, jamais Node ni Electron.
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ApiOlmix } from '../shared/api';
import type { StatutSync } from '../shared/types';

const CANAL_STATUT = 'sync:changement';

const api: ApiOlmix = {
  infos: () => ipcRenderer.invoke('app:infos'),

  chargerConfiguration: () => ipcRenderer.invoke('config:charger'),
  configurationComplete: () => ipcRenderer.invoke('config:complete'),
  enregistrerConfiguration: (configuration) => ipcRenderer.invoke('config:enregistrer', configuration),
  importerConfiguration: () => ipcRenderer.invoke('config:importer'),
  exporterConfiguration: () => ipcRenderer.invoke('config:exporter'),

  lireReglages: () => ipcRenderer.invoke('reglages:lire'),
  ecrireReglages: (partiel) => ipcRenderer.invoke('reglages:ecrire', partiel),
  choisirFichierExcel: () => ipcRenderer.invoke('reglages:choisirExcel'),

  connexionAdmin: (motDePasse) => ipcRenderer.invoke('admin:connexion', motDePasse),
  deconnexionAdmin: () => ipcRenderer.invoke('admin:deconnexion'),
  changerMotDePasseAdmin: (ancien, nouveau) => ipcRenderer.invoke('admin:motDePasse', ancien, nouveau),

  lireBrouillon: () => ipcRenderer.invoke('brouillon:lire'),
  ecrireBrouillon: (brouillon) => ipcRenderer.invoke('brouillon:ecrire', brouillon),
  supprimerBrouillon: () => ipcRenderer.invoke('brouillon:supprimer'),

  soumettreCycle: (saisie) => ipcRenderer.invoke('cycle:soumettre', saisie),
  listerCycles: (limite) => ipcRenderer.invoke('cycles:lister', limite),

  statutSync: () => ipcRenderer.invoke('sync:statut'),
  forcerSync: () => ipcRenderer.invoke('sync:forcer'),
  surStatutSync: (rappel: (statut: StatutSync) => void) => {
    const ecouteur = (_evenement: unknown, statut: StatutSync) => rappel(statut);
    ipcRenderer.on(CANAL_STATUT, ecouteur);
    return () => ipcRenderer.removeListener(CANAL_STATUT, ecouteur);
  },

  ouvrirClasseur: () => ipcRenderer.invoke('excel:ouvrir'),
  ouvrirDossier: (cible) => ipcRenderer.invoke('dossier:ouvrir', cible),
  listerSauvegardes: () => ipcRenderer.invoke('sauvegardes:lister'),
};

contextBridge.exposeInMainWorld('olmix', api);
