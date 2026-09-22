/**
 * Enregistrement des canaux IPC.
 *
 * Deux regles :
 *  - aucune exception ne traverse le pont : tout est renvoye sous la forme
 *    `{ ok: true, valeur }` ou `{ ok: false, erreur }`, pour que l'interface
 *    puisse toujours afficher un message a l'operateur ;
 *  - les canaux d'administration exigent une session admin ouverte.
 */

import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ConfigurationProduits, Reglages, Resultat, StatutSync } from '../shared/types';
import type { ConfigurationChargee } from '../shared/api';
import { construireCycle, genererIdCycle, type SaisieBrute } from '../shared/cycle';
import { validerEtape } from '../shared/validation';
import {
  chargerConfiguration,
  configurationActive,
  configurationComplete,
  enregistrerConfiguration,
  problemesConfiguration,
} from './services/config.service';
import {
  changerMotDePasseAdmin,
  ecrireReglages,
  lireReglages,
  motDePasseParDefautActif,
  verifierMotDePasseAdmin,
} from './services/settings.service';
import { enregistrerBrouillon, lireBrouillon, supprimerBrouillon } from './services/draft.service';
import { listerCycles } from './services/store.service';
import { listerSauvegardes } from './services/backup.service';
import { soumettreCycle, statut, viderFile } from './services/queue.service';
import {
  cheminConfigProduits,
  dossierDonnees,
  dossierSauvegardes,
} from './services/paths';
import { dossierAccessibleEnEcriture } from './services/fs-utils';
import { journal, messageErreur } from './services/logger';

/** Session administrateur : valable jusqu'a la deconnexion ou la fermeture. */
let adminDeverrouille = false;

function ok<T>(valeur: T): Resultat<T> {
  return { ok: true, valeur };
}

function ko<T>(erreur: unknown): Resultat<T> {
  return { ok: false, erreur: messageErreur(erreur) };
}

function exigerAdmin(): void {
  if (!adminDeverrouille) throw new Error('Session administrateur requise.');
}

function fenetre(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

function configurationChargee(): ConfigurationChargee {
  return { configuration: configurationActive(), problemes: problemesConfiguration() };
}

export function enregistrerCanaux(): void {
  /* ---------------- Application ---------------- */

  ipcMain.handle('app:infos', () => {
    const reglages = lireReglages();
    return {
      version: app.getVersion(),
      dossierDonnees: dossierDonnees(),
      cheminConfig: cheminConfigProduits(),
      cheminExcel: reglages.cheminExcel,
      excelExiste: fs.existsSync(reglages.cheminExcel),
      dossierSauvegardes: dossierSauvegardes(),
    };
  });

  /* ---------------- Configuration ---------------- */

  ipcMain.handle('config:charger', (): Resultat<ConfigurationChargee> => {
    const resultat = chargerConfiguration();
    if (!resultat.valide) {
      return ko(resultat.problemes.map((p) => p.message).join('\n') || 'Configuration invalide.');
    }
    return ok(configurationChargee());
  });

  ipcMain.handle('config:complete', (): Resultat<ConfigurationProduits> => {
    try {
      exigerAdmin();
      return ok(configurationComplete());
    } catch (e) {
      return ko(e);
    }
  });

  ipcMain.handle(
    'config:enregistrer',
    (_e, configuration: ConfigurationProduits): Resultat<ConfigurationChargee> => {
      try {
        exigerAdmin();
        const resultat = enregistrerConfiguration(configuration);
        const bloquants = resultat.problemes.filter((p) => p.niveau === 'erreur');
        if (!resultat.valide || bloquants.length) {
          return ko(bloquants.map((p) => `• ${p.message}`).join('\n'));
        }
        return ok(configurationChargee());
      } catch (e) {
        return ko(e);
      }
    },
  );

  ipcMain.handle('config:importer', async (): Promise<Resultat<ConfigurationChargee | null>> => {
    try {
      exigerAdmin();
      const win = fenetre();
      if (!win) throw new Error('Fenêtre indisponible.');
      const choix = await dialog.showOpenDialog(win, {
        title: 'Importer une configuration produits',
        filters: [{ name: 'Configuration JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });
      if (choix.canceled || !choix.filePaths[0]) return ok(null);
      const brut = JSON.parse(fs.readFileSync(choix.filePaths[0], 'utf-8'));
      const resultat = enregistrerConfiguration(brut);
      const bloquants = resultat.problemes.filter((p) => p.niveau === 'erreur');
      if (!resultat.valide || bloquants.length) {
        return ko(`Fichier refusé :\n${bloquants.map((p) => `• ${p.message}`).join('\n')}`);
      }
      return ok(configurationChargee());
    } catch (e) {
      return ko(e);
    }
  });

  ipcMain.handle('config:exporter', async (): Promise<Resultat<string | null>> => {
    try {
      exigerAdmin();
      const win = fenetre();
      if (!win) throw new Error('Fenêtre indisponible.');
      const choix = await dialog.showSaveDialog(win, {
        title: 'Exporter la configuration produits',
        defaultPath: 'produits.json',
        filters: [{ name: 'Configuration JSON', extensions: ['json'] }],
      });
      if (choix.canceled || !choix.filePath) return ok(null);
      fs.writeFileSync(choix.filePath, `${JSON.stringify(configurationComplete(), null, 2)}\n`, 'utf-8');
      return ok(choix.filePath);
    } catch (e) {
      return ko(e);
    }
  });

  /* ---------------- Reglages ---------------- */

  ipcMain.handle('reglages:lire', () => lireReglages());

  ipcMain.handle('reglages:ecrire', (_e, partiel: Partial<Reglages>): Resultat<Reglages> => {
    try {
      // Seul le theme est modifiable sans passer par le mode administrateur.
      const cles = Object.keys(partiel);
      if (cles.some((c) => c !== 'theme')) exigerAdmin();
      if (partiel.cheminExcel !== undefined) {
        const chemin = partiel.cheminExcel.trim();
        if (!chemin.toLowerCase().endsWith('.xlsx')) {
          throw new Error('Le chemin du classeur doit se terminer par « .xlsx ».');
        }
        if (!dossierAccessibleEnEcriture(path.dirname(chemin))) {
          throw new Error(`Le dossier « ${path.dirname(chemin)} » est inaccessible en écriture.`);
        }
        partiel = { ...partiel, cheminExcel: chemin };
      }
      if (partiel.adminHash !== undefined || partiel.adminSel !== undefined) {
        throw new Error('Le mot de passe se modifie via le formulaire dédié.');
      }
      return ok(ecrireReglages(partiel));
    } catch (e) {
      return ko(e);
    }
  });

  ipcMain.handle('reglages:choisirExcel', async (): Promise<Resultat<string | null>> => {
    try {
      exigerAdmin();
      const win = fenetre();
      if (!win) throw new Error('Fenêtre indisponible.');
      const choix = await dialog.showSaveDialog(win, {
        title: 'Emplacement du classeur cumulatif',
        defaultPath: lireReglages().cheminExcel,
        filters: [{ name: 'Classeur Excel', extensions: ['xlsx'] }],
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });
      if (choix.canceled || !choix.filePath) return ok(null);
      return ok(choix.filePath);
    } catch (e) {
      return ko(e);
    }
  });

  /* ---------------- Administration ---------------- */

  ipcMain.handle('admin:connexion', (_e, motDePasse: string) => {
    if (!verifierMotDePasseAdmin(String(motDePasse ?? ''))) {
      journal.avertissement('Tentative de connexion administrateur refusée.');
      return ko<{ motDePasseParDefaut: boolean }>('Mot de passe incorrect.');
    }
    adminDeverrouille = true;
    journal.info('Session administrateur ouverte.');
    return ok({ motDePasseParDefaut: motDePasseParDefautActif() });
  });

  ipcMain.handle('admin:deconnexion', () => {
    adminDeverrouille = false;
  });

  ipcMain.handle('admin:motDePasse', (_e, ancien: string, nouveau: string): Resultat<true> => {
    try {
      exigerAdmin();
      changerMotDePasseAdmin(String(ancien ?? ''), String(nouveau ?? ''));
      return ok(true as const);
    } catch (e) {
      return ko(e);
    }
  });

  /* ---------------- Brouillon ---------------- */

  ipcMain.handle('brouillon:lire', () => lireBrouillon());
  ipcMain.handle('brouillon:ecrire', (_e, brouillon) => enregistrerBrouillon(brouillon));
  ipcMain.handle('brouillon:supprimer', () => supprimerBrouillon());

  /* ---------------- Saisies ---------------- */

  ipcMain.handle('cycle:soumettre', async (_e, saisie: SaisieBrute) => {
    try {
      const configuration = configurationComplete();
      const produit = configuration.produits.find((p) => p.id === saisie.produitId);
      if (!produit) throw new Error(`Produit inconnu : « ${saisie.produitId} ».`);
      if (!saisie.operateur?.trim()) throw new Error('Le nom de l’opérateur est obligatoire.');

      // Les regles de saisie sont rejouees cote principal : une interface
      // defaillante ne doit pas pouvoir inserer une ligne invalide.
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
      const id = genererIdCycle(fin, crypto.randomBytes(2).toString('hex'));
      const cycle = construireCycle(produit, saisie, id, fin.toISOString(), configuration.version);
      const resultat = await soumettreCycle(cycle);
      supprimerBrouillon();

      return ok({ cycleId: id, ecritDansExcel: resultat.ecrit, raisonAttente: resultat.raison });
    } catch (e) {
      journal.erreur('Enregistrement du cycle impossible', e);
      return ko(e);
    }
  });

  ipcMain.handle('cycles:lister', (_e, limite?: number) => listerCycles(limite ?? 50));

  /* ---------------- Synchronisation ---------------- */

  ipcMain.handle('sync:statut', (): StatutSync => statut());
  ipcMain.handle('sync:forcer', async (): Promise<StatutSync> => {
    await viderFile();
    return statut();
  });

  /* ---------------- Acces disque ---------------- */

  ipcMain.handle('excel:ouvrir', async (): Promise<Resultat<true>> => {
    const chemin = lireReglages().cheminExcel;
    if (!fs.existsSync(chemin)) return ko("Le classeur n'existe pas encore : validez une première saisie.");
    const erreur = await shell.openPath(chemin);
    return erreur ? ko(erreur) : ok(true as const);
  });

  ipcMain.handle('dossier:ouvrir', async (_e, cible: string): Promise<Resultat<true>> => {
    const cibles: Record<string, string> = {
      excel: path.dirname(lireReglages().cheminExcel),
      donnees: dossierDonnees(),
      sauvegardes: dossierSauvegardes(),
      config: path.dirname(cheminConfigProduits()),
    };
    const chemin = cibles[cible];
    if (!chemin) return ko(`Destination inconnue : ${cible}`);
    fs.mkdirSync(chemin, { recursive: true });
    const erreur = await shell.openPath(chemin);
    return erreur ? ko(erreur) : ok(true as const);
  });

  ipcMain.handle('sauvegardes:lister', () => listerSauvegardes());
}
