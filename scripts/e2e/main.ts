/**
 * Test de bout en bout : lance la vraie application (processus principal +
 * preload + interface compilee) dans un dossier de donnees temporaire, pilote
 * l'API exposee depuis la page, puis verifie le classeur produit.
 *
 * Couvre le chemin critique : soumission -> validation -> stockage local ->
 * ecriture Excel, y compris le cas « classeur verrouille ».
 */

import { BrowserWindow, app } from 'electron';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const racineProjet = process.env.OLMIX_RACINE!;
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'olmix-e2e-'));
const cheminExcel = path.join(bac, 'classeur', 'Saisies.xlsx');

app.setPath('userData', bac);

const echecs: string[] = [];
function verifier(condition: boolean, libelle: string): void {
  console.log(`${condition ? '  [ok]  ' : '  [ECHEC]'} ${libelle}`);
  if (!condition) echecs.push(libelle);
}

/** Prepare le dossier de donnees avant l'initialisation des services. */
function amorcer(): void {
  fs.mkdirSync(path.join(bac, 'config'), { recursive: true });
  fs.copyFileSync(
    path.join(racineProjet, 'config', 'produits.example.json'),
    path.join(bac, 'config', 'produits.json'),
  );
  fs.writeFileSync(
    path.join(bac, 'reglages.json'),
    JSON.stringify({ cheminExcel, intervalleFileAttenteMs: 1000 }),
    'utf-8',
  );
}

/** Remplit toutes les questions d'un produit, cote page. */
const SCRIPT_REMPLISSAGE = `
(async (indexProduit, forcerDepassement) => {
  const r = await window.olmix.chargerConfiguration();
  if (!r.ok) return { erreur: r.erreur };
  const produit = r.valeur.configuration.produits[indexProduit];
  const valeurs = {}, commentaires = {};
  let depasse = false;
  for (const etape of produit.etapes) {
    for (const q of etape.questions) {
      const cle = etape.id + '.' + q.id;
      switch (q.type) {
        case 'nombre': {
          const min = q.min ?? 0, max = q.max ?? 100;
          if (forcerDepassement && !depasse && q.max != null) {
            valeurs[cle] = q.max + 10;
            commentaires[cle] = 'Depassement justifie par le test.';
            depasse = true;
          } else valeurs[cle] = Math.round(((min + max) / 2) * 100) / 100;
          break;
        }
        case 'booleen': valeurs[cle] = true; break;
        case 'liste': valeurs[cle] = q.options[0].valeur; break;
        case 'choix_multiple': valeurs[cle] = [q.options[0].valeur]; break;
        case 'date': valeurs[cle] = '2026-09-20'; break;
        case 'heure': valeurs[cle] = '14:30'; break;
        case 'datetime': valeurs[cle] = '2026-09-20T14:30'; break;
        default: valeurs[cle] = 'Valeur de test';
      }
    }
  }
  const soumission = await window.olmix.soumettreCycle({
    produitId: produit.id,
    operateur: 'Testeur E2E',
    matricule: '09042',
    debutIso: new Date(Date.now() - 600000).toISOString(),
    valeurs, commentaires,
  });
  return { produitId: produit.id, soumission };
})(INDEX, DEPASSEMENT)`;

function remplir(fenetre: BrowserWindow, index: number, depassement = false) {
  return fenetre.webContents.executeJavaScript(
    SCRIPT_REMPLISSAGE.replace('INDEX', String(index)).replace('DEPASSEMENT', String(depassement)),
  );
}

async function lireClasseur() {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.readFile(cheminExcel);
  const feuille = classeur.getWorksheet('Saisies')!;
  const modele = (feuille.getTable('T_Saisies') as unknown as { table: { tableRef: string; columns: { name: string }[] } })
    .table;
  const entetes = modele.columns.map((c) => c.name);
  const lignes: Record<string, unknown>[] = [];
  const fin = Number.parseInt(modele.tableRef.split(':')[1]!.replace(/[^0-9]/g, ''), 10);
  for (let r = 2; r <= fin; r += 1) {
    const ligne: Record<string, unknown> = {};
    entetes.forEach((nom, i) => {
      ligne[nom] = feuille.getRow(r).getCell(i + 1).value;
    });
    lignes.push(ligne);
  }
  return { entetes, lignes, modele };
}

async function executer(fenetre: BrowserWindow): Promise<void> {
  console.log('\n1. Première saisie (produit 1)');
  const a = await remplir(fenetre, 0);
  verifier(a.soumission?.ok === true, 'la soumission est acceptée');
  verifier(a.soumission?.valeur?.ecritDansExcel === true, 'le cycle est écrit immédiatement dans Excel');
  verifier(fs.existsSync(cheminExcel), 'le classeur a été créé');

  let classeur = await lireClasseur();
  verifier(classeur.lignes.length === 1, `le classeur contient 1 ligne (${classeur.lignes.length})`);
  verifier(classeur.lignes[0]!.Operateur === 'Testeur E2E', "la colonne Operateur est renseignée");

  console.log('\n2. Deuxième produit : ajout automatique de colonnes');
  const colonnesAvant = classeur.entetes.length;
  const b = await remplir(fenetre, 1, true);
  verifier(b.soumission?.ok === true, 'la soumission du second produit est acceptée');
  classeur = await lireClasseur();
  verifier(classeur.lignes.length === 2, `le classeur contient 2 lignes (${classeur.lignes.length})`);
  verifier(
    classeur.entetes.length > colonnesAvant,
    `de nouvelles colonnes sont apparues (${colonnesAvant} → ${classeur.entetes.length})`,
  );
  verifier(
    classeur.entetes.length === new Set(classeur.entetes).size,
    'aucun doublon dans les en-têtes',
  );
  verifier(
    classeur.lignes[0]!.ID_Cycle !== classeur.lignes[1]!.ID_Cycle,
    'les deux cycles ont des identifiants distincts',
  );
  verifier(Number(classeur.lignes[1]!.Nb_Alertes) === 1, 'le dépassement de borne est compté comme alerte');
  verifier(
    String(classeur.lignes[1]!.Alertes).includes('Depassement justifie'),
    'le commentaire de dépassement est exporté',
  );

  console.log('\n3. Saisie incomplète : elle doit être refusée');
  const incomplet = await fenetre.webContents.executeJavaScript(`
    window.olmix.soumettreCycle({
      produitId: 'granules_nutri_algue', operateur: 'Testeur E2E', matricule: '',
      debutIso: new Date().toISOString(), valeurs: {}, commentaires: {},
    })`);
  verifier(incomplet.ok === false, 'une saisie sans réponse obligatoire est rejetée');
  verifier(String(incomplet.erreur).includes('incomplète'), "le message d'erreur est explicite");

  console.log('\n3 bis. Matricule : exactement cinq chiffres, ou rien');
  const matriculeCourt = await fenetre.webContents.executeJavaScript(`
    window.olmix.soumettreCycle({
      produitId: 'granules_nutri_algue', operateur: 'Testeur E2E', matricule: '1042',
      debutIso: new Date().toISOString(), valeurs: {}, commentaires: {},
    })`);
  verifier(
    matriculeCourt.ok === false && String(matriculeCourt.erreur).includes('5 chiffres'),
    'un matricule de 4 chiffres est rejeté',
  );
  const matriculeLettres = await fenetre.webContents.executeJavaScript(`
    window.olmix.soumettreCycle({
      produitId: 'granules_nutri_algue', operateur: 'Testeur E2E', matricule: 'OP104',
      debutIso: new Date().toISOString(), valeurs: {}, commentaires: {},
    })`);
  verifier(matriculeLettres.ok === false, 'un matricule contenant des lettres est rejeté');
  verifier(
    classeur.lignes[0]!.Matricule === '09042',
    `le matricule à zéro initial reste intact dans Excel (${classeur.lignes[0]!.Matricule})`,
  );

  console.log('\n4. Classeur verrouillé : mise en file puis reprise');
  const verrou = path.join(path.dirname(cheminExcel), `~$${path.basename(cheminExcel)}`);
  fs.writeFileSync(verrou, '');
  const c = await remplir(fenetre, 0);
  verifier(c.soumission?.ok === true, 'la saisie est acceptée malgré le verrou');
  verifier(c.soumission?.valeur?.ecritDansExcel === false, "l'écriture est différée");
  const statutVerrou = await fenetre.webContents.executeJavaScript('window.olmix.statutSync()');
  verifier(statutVerrou.enAttente === 1, `1 saisie en file d'attente (${statutVerrou.enAttente})`);
  classeur = await lireClasseur();
  verifier(classeur.lignes.length === 2, 'le classeur est resté intact pendant le verrou');

  fs.rmSync(verrou, { force: true });
  const statutApres = await fenetre.webContents.executeJavaScript('window.olmix.forcerSync()');
  verifier(statutApres.enAttente === 0, 'la file se vide une fois le verrou levé');
  classeur = await lireClasseur();
  verifier(classeur.lignes.length === 3, `le cycle différé a bien été écrit (${classeur.lignes.length} lignes)`);

  console.log('\n5. Aucun doublon si la file est rejouée');
  await fenetre.webContents.executeJavaScript('window.olmix.forcerSync()');
  classeur = await lireClasseur();
  verifier(classeur.lignes.length === 3, 'un second passage n’ajoute aucune ligne');

  console.log('\n6. Brouillon');
  await fenetre.webContents.executeJavaScript(`
    window.olmix.ecrireBrouillon({
      produitId: 'granules_nutri_algue', produitNom: 'Granulés Nutri-Algue',
      operateur: 'Marc', matricule: '10425', debutIso: new Date().toISOString(),
      majIso: new Date().toISOString(), indexEtape: 2,
      valeurs: { 'reception.lot_matiere_premiere': 'L123' }, commentaires: {},
    })`);
  const relu = await fenetre.webContents.executeJavaScript('window.olmix.lireBrouillon()');
  verifier(relu?.indexEtape === 2, 'le brouillon est relu à la bonne étape');
  verifier(
    relu?.valeurs?.['reception.lot_matiere_premiere'] === 'L123',
    'les valeurs du brouillon sont conservées',
  );

  console.log('\n7. Garde-fou du mode administrateur');
  const refuse = await fenetre.webContents.executeJavaScript(
    'window.olmix.enregistrerConfiguration({ version: 1, produits: [] })',
  );
  verifier(refuse.ok === false, 'écrire la configuration sans session admin est refusé');
  const mauvais = await fenetre.webContents.executeJavaScript("window.olmix.connexionAdmin('mauvais')");
  verifier(mauvais.ok === false, 'un mot de passe erroné est rejeté');
  const bon = await fenetre.webContents.executeJavaScript("window.olmix.connexionAdmin('olmix')");
  verifier(bon.ok === true, 'le mot de passe initial ouvre la session');
  const accepte = await fenetre.webContents.executeJavaScript(
    'window.olmix.configurationComplete()',
  );
  verifier(accepte.ok === true, 'la configuration complète est lisible une fois connecté');

  console.log('\n8. Sauvegarde quotidienne');
  const sauvegardes = await fenetre.webContents.executeJavaScript('window.olmix.listerSauvegardes()');
  verifier(sauvegardes.length >= 1, `une sauvegarde a été créée (${sauvegardes.length})`);
}

amorcer();

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
    show: false,
    webPreferences: {
      preload: path.join(racineProjet, 'dist', 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await fenetre.loadFile(path.join(racineProjet, 'dist', 'renderer', 'index.html'));

  try {
    await executer(fenetre);
  } catch (e) {
    console.error('\nErreur inattendue :', e);
    echecs.push(String(e));
  }

  console.log(
    `\n${echecs.length === 0 ? '[OK] Tous les contrôles passent.' : `[ECHEC] ${echecs.length} échec(s) :`}`,
  );
  for (const echec of echecs) console.log(`   - ${echec}`);
  fs.rmSync(bac, { recursive: true, force: true });
  app.exit(echecs.length === 0 ? 0 : 1);
})();
