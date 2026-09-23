/**
 * Processus principal.
 *
 * Responsable de la fenetre, de l'initialisation des services et de la
 * politique de securite : le renderer n'a ni Node, ni navigation externe.
 */

import { BrowserWindow, Menu, app, shell } from 'electron';
import path from 'node:path';
import { enregistrerCanaux } from './ipc';
import { initialiserConfiguration, chargerConfiguration } from './services/config.service';
import { arreterFileAttente, initialiserFileAttente, statut } from './services/queue.service';
import { lireReglages } from './services/settings.service';
import { cheminJournal } from './services/paths';
import { configurerJournal, journal } from './services/logger';
import type { StatutSync } from '../shared/types';

const enDeveloppement = !app.isPackaged;
const URL_DEV = 'http://localhost:5273';

// Force le francais : sans cela, les champs natifs <input type="date"> et
// <input type="time"> s'affichent au format du systeme (mm/dd/yyyy en anglais).
app.commandLine.appendSwitch('lang', 'fr-FR');

let fenetrePrincipale: BrowserWindow | null = null;

/* Une seule instance : deux fenetres ecrivant dans le meme classeur
   provoqueraient des conflits d'ecriture. */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!fenetrePrincipale) return;
    if (fenetrePrincipale.isMinimized()) fenetrePrincipale.restore();
    fenetrePrincipale.focus();
  });
  demarrer();
}

function demarrer(): void {
  app.whenReady().then(() => {
    configurerJournal(cheminJournal());
    journal.info(`Demarrage — version ${app.getVersion()}`);

    initialiserConfiguration();
    const configuration = chargerConfiguration();
    if (!configuration.valide) {
      journal.erreur('La configuration produits est invalide au demarrage.', configuration.problemes);
    }

    enregistrerCanaux();
    initialiserFileAttente(diffuserStatut);
    creerFenetre();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) creerFenetre();
    });
  });

  app.on('window-all-closed', () => {
    arreterFileAttente();
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    const restant = statut().enAttente;
    if (restant > 0) journal.avertissement(`Fermeture avec ${restant} saisie(s) encore en file d'attente.`);
  });
}

/**
 * Fond de la fenetre avant le premier rendu : il evite le flash blanc au
 * demarrage. Doit rester aligne sur `--fond` dans src/styles/tokens.css.
 */
const FOND_FENETRE = { clair: '#bee0cc', sombre: '#052731' } as const;

function creerFenetre(): void {
  const sombre = lireReglages().theme === 'sombre';

  fenetrePrincipale = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: sombre ? FOND_FENETRE.sombre : FOND_FENETRE.clair,
    title: 'Olmix — Saisie de fin de cycle',
    autoHideMenuBar: !enDeveloppement,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  Menu.setApplicationMenu(enDeveloppement ? Menu.getApplicationMenu() : null);

  fenetrePrincipale.once('ready-to-show', () => {
    fenetrePrincipale?.maximize();
    fenetrePrincipale?.show();
  });

  // Aucune navigation hors de l'application ; les liens partent dans le
  // navigateur du poste.
  fenetrePrincipale.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  fenetrePrincipale.webContents.on('will-navigate', (evenement, url) => {
    const autorise = enDeveloppement && url.startsWith(URL_DEV);
    if (!autorise) evenement.preventDefault();
  });

  if (enDeveloppement) {
    void fenetrePrincipale.loadURL(URL_DEV);
  } else {
    void fenetrePrincipale.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  }

  fenetrePrincipale.on('closed', () => {
    fenetrePrincipale = null;
  });
}

function diffuserStatut(nouveau: StatutSync): void {
  if (fenetrePrincipale && !fenetrePrincipale.isDestroyed()) {
    fenetrePrincipale.webContents.send('sync:changement', nouveau);
  }
}
