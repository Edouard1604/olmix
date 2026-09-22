/**
 * Pilote l'application reelle et capture chaque ecran.
 * Sert de verification visuelle : l'application est demarree, remplie et
 * parcourue exactement comme le ferait un operateur.
 */

import { BrowserWindow, app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

app.commandLine.appendSwitch('lang', 'fr-FR');

const racineProjet = process.env.OLMIX_RACINE!;
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'olmix-capture-'));

// Garde-fou : la capture ne doit jamais bloquer la chaine de build.
setTimeout(() => {
  console.error('Delai depasse pendant les captures.');
  app.exit(1);
}, 120_000).unref();
app.setPath('userData', bac);

fs.mkdirSync(path.join(bac, 'config'), { recursive: true });
fs.copyFileSync(
  path.join(racineProjet, 'config', 'produits.example.json'),
  path.join(bac, 'config', 'produits.json'),
);
fs.writeFileSync(
  path.join(bac, 'reglages.json'),
  JSON.stringify({ cheminExcel: path.join(bac, 'classeur', 'Saisies.xlsx') }),
  'utf-8',
);

const dossierCaptures = path.join(racineProjet, 'captures');
fs.mkdirSync(dossierCaptures, { recursive: true });

/** Boite a outils injectee dans la page pour simuler une saisie humaine. */
const OUTILS = `
window.__t = {
  ecrire(el, valeur) {
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
      : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, valeur);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  },
  nombreDe(champ) {
    const ph = champ.querySelector('.champ-nombre input')?.placeholder || '';
    let m = ph.match(/(-?[\\d.]+)\\s*[–-]\\s*(-?[\\d.]+)/);
    if (!m) {
      const b = champ.querySelector('.champ__bornes')?.textContent || '';
      const n = b.match(/-?\\d+(?:[.,]\\d+)?/g);
      if (n && n.length >= 2) m = [null, n[0], n[1]];
      else if (n && n.length === 1) return Number(n[0].replace(',', '.'));
    }
    if (!m) return 12;
    return Math.round(((Number(m[1]) + Number(m[2])) / 2) * 10) / 10;
  },
  remplirEtape() {
    for (const champ of document.querySelectorAll('.champ')) {
      const nombre = champ.querySelector('.champ-nombre input');
      if (nombre) { this.ecrire(nombre, String(this.nombreDe(champ))); continue; }
      const select = champ.querySelector('select.saisie');
      if (select) { this.ecrire(select, select.options[1]?.value ?? ''); continue; }
      const cases = champ.querySelectorAll('.case-option');
      if (cases.length) { cases[0].click(); continue; }
      const bascule = champ.querySelector('.bascule__option');
      if (bascule) { bascule.click(); continue; }
      const zone = champ.querySelector('textarea.saisie');
      if (zone) { this.ecrire(zone, 'Cycle nominal, rien à signaler.'); continue; }
      const entree = champ.querySelector('input.saisie');
      if (!entree) continue;
      if (entree.type === 'date') this.ecrire(entree, '2026-09-20');
      else if (entree.type === 'time') this.ecrire(entree, '14:30');
      else if (entree.type === 'datetime-local') this.ecrire(entree, '2026-09-20T14:30');
      else this.ecrire(entree, 'L' + (100000 + Math.floor(Math.random() * 899999)));
    }
  },
  suivant() {
    const boutons = [...document.querySelectorAll('.actions .btn--principal')];
    boutons[boutons.length - 1]?.click();
  },
};
true`;

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function capturer(fenetre: BrowserWindow, nom: string): Promise<void> {
  await attendre(700);
  const image = await fenetre.webContents.capturePage();
  const fichier = path.join(dossierCaptures, `${nom}.png`);
  fs.writeFileSync(fichier, image.toPNG());
  console.log(`  capture : ${fichier}`);
}

void (async () => {
  const { enregistrerCanaux } = await import('../../electron/ipc');
  const { initialiserConfiguration, chargerConfiguration } = await import('../../electron/services/config.service');
  const { initialiserFileAttente } = await import('../../electron/services/queue.service');

  await app.whenReady();
  initialiserConfiguration();
  chargerConfiguration();
  enregistrerCanaux();
  initialiserFileAttente(() => {});

  const fenetre = new BrowserWindow({
    width: 1600,
    height: 1000,
    show: true,
    webPreferences: {
      preload: path.join(racineProjet, 'dist', 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await fenetre.loadFile(path.join(racineProjet, 'dist', 'renderer', 'index.html'));
  await attendre(1200);
  const js = async (code: string) => {
    try {
      return await fenetre.webContents.executeJavaScript(code);
    } catch (e) {
      console.error('Injection refusee :', code.slice(0, 120), '\n', e);
      app.exit(1);
      throw e;
    }
  };
  await js(OUTILS);

  console.log('1. Accueil');
  await js(`(() => {
    __t.ecrire(document.getElementById('champ-operateur'), 'Marc Le Gall');
    __t.ecrire(document.getElementById('champ-matricule'), 'OP1042'); return true; })()`);
  await capturer(fenetre, '1-accueil');

  console.log('2. Formulaire — étape 1 vierge (bouton Suivant bloqué)');
  await js(`document.querySelector('.produit').click(); true`);
  await capturer(fenetre, '2-formulaire-vierge');

  console.log('3. Mise en évidence des champs manquants');
  await js(`__t.suivant(); true`);
  await capturer(fenetre, '3-champs-manquants');

  console.log('4. Étape remplie');
  await js(`__t.remplirEtape(); true`);
  await capturer(fenetre, '4-etape-remplie');

  console.log('5. Valeur hors bornes → commentaire exigé');
  await js(`__t.suivant(); true`);
  await attendre(500);
  await js(`__t.remplirEtape(); true`);
  await attendre(300);
  await js(`(() => {
    const champ = [...document.querySelectorAll('.champ')].find(c => c.querySelector('.champ-nombre input'));
    __t.ecrire(champ.querySelector('.champ-nombre input'), '9999'); return true; })()`);
  await capturer(fenetre, '5-hors-bornes');

  console.log('6. Parcours jusqu’au récapitulatif');
  await js(`(() => {
    const zone = [...document.querySelectorAll('.champ textarea')][0];
    if (zone) __t.ecrire(zone, 'Consigne relevée par le chef d’équipe.'); return true; })()`);
  for (let i = 0; i < 8; i += 1) {
    const surRecap = await js(`!!document.querySelector('.recap__bloc')`);
    if (surRecap) break;
    await js(`__t.remplirEtape(); true`);
    await attendre(280);
    await js(`__t.suivant(); true`);
    await attendre(460);
  }
  await js('(() => { document.querySelector(".ecran").scrollTop = 0; return true; })()');
  await capturer(fenetre, '6-recapitulatif');

  console.log('7. Confirmation');
  await js(`[...document.querySelectorAll('.actions .btn--principal')].pop().click(); true`);
  await attendre(1600);
  await capturer(fenetre, '7-confirmation');

  console.log('8. Thème sombre sur l’accueil');
  await js(`document.querySelector('.confirmation .btn--principal')?.click(); true`);
  await attendre(900);
  await js(`[...document.querySelectorAll('.barre__droite .btn--fantome')][0].click(); true`);
  await capturer(fenetre, '8-accueil-sombre');

  console.log('9. Administration');
  await js(`[...document.querySelectorAll('.barre__droite .btn--fantome')][1].click(); true`);
  await attendre(800);
  await js(`(() => {
    __t.ecrire(document.querySelector('.connexion input'), 'olmix');
    document.querySelector('.connexion .btn--principal').click(); return true; })()`);
  await attendre(1500);
  await js(`document.querySelectorAll('.admin__question-entete .btn--fantome')[0]?.click(); true`);
  await capturer(fenetre, '9-admin-produits');

  console.log('10. Diagnostic');
  await js(`[...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Diagnostic'))?.click(); true`);
  await capturer(fenetre, '10-admin-diagnostic');

  console.log('\nCaptures terminées.');
  fs.rmSync(bac, { recursive: true, force: true });
  app.exit(0);
})();
