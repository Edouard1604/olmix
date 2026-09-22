/**
 * Ecriture incrementale dans le classeur cumulatif.
 *
 * Principes :
 *  - Un seul fichier .xlsx, enrichi cycle apres cycle (jamais un fichier par saisie).
 *  - Les donnees vivent dans des Tableaux Excel nommes : Power BI suit
 *    automatiquement les nouvelles lignes a chaque actualisation, sans avoir a
 *    rediriger la requete.
 *  - On n'ecrit JAMAIS par-dessus les lignes existantes : les nouvelles lignes
 *    sont ajoutees sous la derniere ligne du tableau, et les nouvelles colonnes
 *    a droite de la derniere colonne. L'ordre des colonnes existantes n'est
 *    jamais modifie, ce qui garantit qu'aucune mesure Power BI ne casse.
 *  - Une saisie deja presente (meme ID_Cycle) n'est jamais reecrite : la file
 *    d'attente peut donc etre rejouee sans risque de doublon.
 */

import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import type { Cycle, Produit, Reglages } from '../../shared/types';
import {
  COLONNES_FIXES_SAISIES,
  COLONNES_QUESTIONS,
  COLONNES_REPONSES,
  colonneDeQuestion,
  valeurCellule,
  valeurCode,
  valeurNumerique,
} from '../../shared/columns';
import { classeurOuvertDansExcel, estErreurVerrou } from './fs-utils';
import { journal } from './logger';

export class ClasseurVerrouilleError extends Error {
  constructor(chemin: string) {
    super(
      `Le classeur « ${path.basename(chemin)} » est ouvert dans Excel ou verrouille par un autre poste.`,
    );
    this.name = 'ClasseurVerrouilleError';
  }
}

const FORMAT_DATE = 'dd/mm/yyyy';
const FORMAT_DATE_HEURE = 'dd/mm/yyyy hh:mm';
const STYLE_TABLEAU = { theme: 'TableStyleMedium9', showRowStripes: true } as const;

type ValeurCellule = string | number | Date | null;
type Ligne = Record<string, ValeurCellule>;

/**
 * Les typages fournis par ExcelJS decrivent les proprietes passees a
 * `addTable`, pas l'objet renvoye par `getTable`, qui expose le modele brut
 * sous `.table`. On le redecrit ici pour pouvoir etendre la plage du tableau.
 */
interface ColonneTable {
  name: string;
  totalsRowFunction?: string;
  totalsRowLabel?: string;
  filterButton?: boolean;
}

interface ModeleTable {
  name: string;
  displayName: string;
  tableRef: string;
  autoFilterRef: string;
  headerRow: boolean;
  totalsRow: boolean;
  columns: ColonneTable[];
}

function modeleTable(feuille: ExcelJS.Worksheet, nom: string): ModeleTable | null {
  const brut = feuille.getTable(nom) as unknown as { table?: ModeleTable } | undefined;
  return brut?.table ?? null;
}

/* ------------------------------------------------------------------ */
/* Utilitaires de reperage                                             */
/* ------------------------------------------------------------------ */

function lettreColonne(index: number): string {
  let n = index;
  let sortie = '';
  while (n > 0) {
    const reste = (n - 1) % 26;
    sortie = String.fromCharCode(65 + reste) + sortie;
    n = (n - reste - 1) / 26;
  }
  return sortie;
}

function ligneDeRef(ref: string): number {
  return Number.parseInt(ref.replace(/[^0-9]/g, ''), 10);
}

/**
 * Un tableau gere par l'application : ses en-tetes, sa derniere ligne, et de
 * quoi l'etendre. `modele` vaut null tant que le tableau n'existe pas encore.
 */
interface ContexteTable {
  feuille: ExcelJS.Worksheet;
  nomTable: string;
  entetes: string[];
  derniereLigne: number;
  modele: ModeleTable | null;
  /** Vrai si le tableau doit etre cree de zero au moment de la finalisation. */
  aCreer: boolean;
  formats: Map<string, string>;
}

function ouvrirTable(
  classeur: ExcelJS.Workbook,
  nomFeuille: string,
  nomTable: string,
  colonnesInitiales: string[],
): ContexteTable {
  let feuille = classeur.getWorksheet(nomFeuille);
  if (!feuille) {
    feuille = classeur.addWorksheet(nomFeuille, { views: [{ state: 'frozen', ySplit: 1 }] });
  }

  const modeleExistant = modeleTable(feuille, nomTable);
  if (modeleExistant?.tableRef) {
    const modele = modeleExistant;
    const entetes = modele.columns.map((c) => String(c.name));
    return {
      feuille,
      nomTable,
      entetes,
      derniereLigne: ligneDeRef(modele.tableRef.split(':')[1]),
      modele,
      aCreer: false,
      formats: new Map(),
    };
  }

  // Feuille preexistante sans tableau nomme : on reprend son en-tete tel quel
  // pour ne perdre aucune colonne ajoutee a la main, et on posera le tableau
  // par-dessus lors de la finalisation.
  const entetesExistants = lireEnteteFeuille(feuille);
  if (entetesExistants.length && feuille.rowCount >= 1) {
    journal.avertissement(
      `Feuille « ${nomFeuille} » sans tableau nomme « ${nomTable} » : le tableau va etre recree sur la plage existante.`,
    );
    return {
      feuille,
      nomTable,
      entetes: entetesExistants,
      derniereLigne: Math.max(feuille.rowCount, 1),
      modele: null,
      aCreer: true,
      formats: new Map(),
    };
  }

  return {
    feuille,
    nomTable,
    entetes: [...colonnesInitiales],
    derniereLigne: 1,
    modele: null,
    aCreer: true,
    formats: new Map(),
  };
}

function lireEnteteFeuille(feuille: ExcelJS.Worksheet): string[] {
  const entetes: string[] = [];
  const premiere = feuille.getRow(1);
  for (let i = 1; i <= feuille.columnCount; i += 1) {
    const valeur = premiere.getCell(i).value;
    if (valeur === null || valeur === undefined || String(valeur).trim() === '') break;
    entetes.push(String(valeur).trim());
  }
  return entetes;
}

/** Ajoute a droite les colonnes absentes, sans jamais deplacer les existantes. */
function assurerColonnes(contexte: ContexteTable, colonnes: string[]): void {
  for (const colonne of colonnes) {
    if (contexte.entetes.includes(colonne)) continue;
    contexte.entetes.push(colonne);
    if (contexte.modele) {
      contexte.modele.columns.push({ name: colonne, totalsRowFunction: 'none', filterButton: true });
    }
    journal.info(`Nouvelle colonne ajoutee au tableau ${contexte.nomTable}`, colonne);
  }
}

function definirFormat(contexte: ContexteTable, colonne: string, format: string): void {
  contexte.formats.set(colonne, format);
}

/** Ecrit une ligne sous la derniere ligne du tableau. */
function ajouterLigne(contexte: ContexteTable, valeurs: Ligne): void {
  contexte.derniereLigne += 1;
  const ligne = contexte.feuille.getRow(contexte.derniereLigne);
  contexte.entetes.forEach((entete, index) => {
    const cellule = ligne.getCell(index + 1);
    const valeur = valeurs[entete];
    cellule.value = valeur === undefined ? null : valeur;
    const format = contexte.formats.get(entete);
    if (format && valeur instanceof Date) cellule.numFmt = format;
  });
  ligne.commit();
}

/** Remet en place l'en-tete, le tableau et sa plage. */
function finaliser(contexte: ContexteTable): void {
  if (!contexte.entetes.length) return;
  const derniereColonne = lettreColonne(contexte.entetes.length);
  // Une ligne d'en-tete + au moins une ligne de donnees sont requises par Excel.
  if (contexte.derniereLigne < 2) return;
  const ref = `A1:${derniereColonne}${contexte.derniereLigne}`;

  // L'en-tete est toujours reecrit : lorsqu'une colonne est ajoutee a un
  // tableau existant, la declarer dans le modele ne suffit pas, il faut aussi
  // que la cellule porte le libelle, sinon Excel signale un fichier a reparer.
  const entete = contexte.feuille.getRow(1);
  contexte.entetes.forEach((nom, index) => {
    entete.getCell(index + 1).value = nom;
  });
  entete.commit();

  if (contexte.modele) {
    contexte.modele.tableRef = ref;
    contexte.modele.autoFilterRef = ref;
  } else {
    if (contexte.aCreer && contexte.feuille.getTable(contexte.nomTable)) {
      contexte.feuille.removeTable(contexte.nomTable);
    }
    contexte.feuille.addTable({
      name: contexte.nomTable,
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: { ...STYLE_TABLEAU },
      columns: contexte.entetes.map((nom) => ({ name: nom, filterButton: true })),
      // Les lignes sont deja ecrites en cellules ; on laisse `rows` vide et on
      // corrige la plage juste apres pour qu'elle les englobe.
      rows: [],
    });
    const cree = modeleTable(contexte.feuille, contexte.nomTable);
    if (cree) {
      cree.tableRef = ref;
      cree.autoFilterRef = ref;
      contexte.modele = cree;
    }
  }

  styliserEntete(contexte);
}

function styliserEntete(contexte: ContexteTable): void {
  const entete = contexte.feuille.getRow(1);
  entete.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  entete.height = 22;
  entete.alignment = { vertical: 'middle' };
  contexte.entetes.forEach((nom, index) => {
    const colonne = contexte.feuille.getColumn(index + 1);
    const largeur = Math.min(Math.max(nom.length + 4, 12), 34);
    if (!colonne.width || colonne.width < largeur) colonne.width = largeur;
  });
}

/* ------------------------------------------------------------------ */
/* Construction des lignes                                             */
/* ------------------------------------------------------------------ */

function dureeEnMinutes(cycle: Cycle): number | null {
  const debut = new Date(cycle.debutIso).getTime();
  const fin = new Date(cycle.finIso).getTime();
  if (!Number.isFinite(debut) || !Number.isFinite(fin) || fin < debut) return null;
  return Math.round(((fin - debut) / 60_000) * 10) / 10;
}

function ligneSaisie(cycle: Cycle): Ligne {
  const fin = new Date(cycle.finIso);
  const alertes = cycle.reponses
    .filter((r) => r.horsBornes)
    .map((r) => `${r.colonne}=${r.affichage}${r.commentaire ? ` (${r.commentaire})` : ''}`);

  const ligne: Ligne = {
    ID_Cycle: cycle.id,
    Date: dateSeule(fin),
    Heure: fin.toTimeString().slice(0, 5),
    Date_Heure: fin,
    Operateur: cycle.operateur,
    Matricule: cycle.matricule,
    Produit: cycle.produitNom,
    Produit_ID: cycle.produitId,
    Duree_Saisie_min: dureeEnMinutes(cycle),
    Nb_Alertes: alertes.length,
    Alertes: alertes.join(' ; '),
  };

  for (const reponse of cycle.reponses) {
    // Les listes partent en clair ; tout le reste garde son type natif
    // (nombre, date) pour rester exploitable tel quel dans Power BI.
    ligne[reponse.colonne] =
      reponse.type === 'liste' || reponse.type === 'choix_multiple'
        ? reponse.affichage || null
        : valeurCellule(reponse.type, reponse.valeur);
  }
  return ligne;
}

function lignesReponses(cycle: Cycle): Ligne[] {
  const fin = new Date(cycle.finIso);
  return cycle.reponses.map((r) => ({
    ID_Cycle: cycle.id,
    Date: dateSeule(fin),
    Heure: fin.toTimeString().slice(0, 5),
    Operateur: cycle.operateur,
    Matricule: cycle.matricule,
    Produit: cycle.produitNom,
    Produit_ID: cycle.produitId,
    Etape_Ordre: r.etapeOrdre,
    Etape: r.etapeNom,
    Question_ID: r.questionId,
    // Cle de jointure directe vers le catalogue T_Questions, cote Power BI.
    Cle_Question: `${cycle.produitId}::${r.questionId}`,
    Question: r.libelle,
    Colonne: r.colonne,
    Type: r.type,
    Valeur_Texte: r.affichage,
    Valeur_Code: valeurCode(r.valeur),
    Valeur_Num: valeurNumerique(r.type, r.valeur),
    Unite: r.unite ?? '',
    Hors_Bornes: r.horsBornes ? 'OUI' : 'NON',
    Commentaire: r.commentaire ?? '',
  }));
}

function lignesCatalogue(produits: Produit[]): Ligne[] {
  const lignes: Ligne[] = [];
  for (const produit of produits) {
    produit.etapes.forEach((etape, indexEtape) => {
      for (const question of etape.questions) {
        lignes.push({
          Cle_Question: `${produit.id}::${question.id}`,
          Produit_ID: produit.id,
          Produit: produit.nom,
          Etape_Ordre: indexEtape + 1,
          Etape_ID: etape.id,
          Etape: etape.nom,
          Question_ID: question.id,
          Colonne: colonneDeQuestion(question),
          Libelle: question.libelle,
          Type: question.type,
          Obligatoire: question.obligatoire ? 'OUI' : 'NON',
          Unite: question.unite ?? '',
          Min: question.min ?? null,
          Max: question.max ?? null,
        });
      }
    });
  }
  return lignes;
}

/** Minuit local, pour que la cellule soit une vraie date sans composante horaire. */
function dateSeule(instant: Date): Date {
  return new Date(instant.getFullYear(), instant.getMonth(), instant.getDate());
}

/* ------------------------------------------------------------------ */
/* Ecriture                                                            */
/* ------------------------------------------------------------------ */

export interface ResultatEcriture {
  /** Identifiants effectivement ajoutes au classeur. */
  ajoutes: string[];
  /** Identifiants deja presents, volontairement ignores. */
  deja: string[];
}

/**
 * Ajoute les cycles fournis au classeur cumulatif.
 * @throws {ClasseurVerrouilleError} si le fichier est ouvert ou verrouille.
 */
export async function ajouterCyclesAuClasseur(
  cycles: Cycle[],
  produits: Produit[],
  reglages: Reglages,
): Promise<ResultatEcriture> {
  const chemin = reglages.cheminExcel;
  if (classeurOuvertDansExcel(chemin)) throw new ClasseurVerrouilleError(chemin);

  fs.mkdirSync(path.dirname(chemin), { recursive: true });

  const classeur = new ExcelJS.Workbook();
  classeur.creator = 'Olmix — Saisie Production';
  classeur.lastModifiedBy = 'Olmix — Saisie Production';
  if (fs.existsSync(chemin)) {
    try {
      await classeur.xlsx.readFile(chemin);
    } catch (e) {
      if (estErreurVerrou(e)) throw new ClasseurVerrouilleError(chemin);
      throw new Error(
        `Le classeur existe mais n'a pas pu etre lu (${(e as Error).message}). ` +
          `Deplacez-le ou renommez-le pour qu'un nouveau classeur soit cree.`,
      );
    }
  }

  const saisies = ouvrirTable(classeur, reglages.nomFeuilleSaisies, reglages.nomTableSaisies, [
    ...COLONNES_FIXES_SAISIES,
  ]);
  const deja = new Set(identifiantsExistants(saisies));
  const nouveaux = cycles.filter((c) => !deja.has(c.id));
  const ignores = cycles.filter((c) => deja.has(c.id)).map((c) => c.id);

  if (!nouveaux.length) {
    journal.info('Aucun cycle a ecrire : tous deja presents dans le classeur.');
    return { ajoutes: [], deja: ignores };
  }

  // --- Feuille large -------------------------------------------------
  definirFormat(saisies, 'Date', FORMAT_DATE);
  definirFormat(saisies, 'Date_Heure', FORMAT_DATE_HEURE);
  assurerColonnes(saisies, [...COLONNES_FIXES_SAISIES]);
  for (const cycle of nouveaux) {
    assurerColonnes(
      saisies,
      cycle.reponses.map((r) => r.colonne),
    );
    for (const r of cycle.reponses) {
      if (r.type === 'date') definirFormat(saisies, r.colonne, FORMAT_DATE);
      if (r.type === 'datetime') definirFormat(saisies, r.colonne, FORMAT_DATE_HEURE);
    }
  }
  for (const cycle of nouveaux) ajouterLigne(saisies, ligneSaisie(cycle));
  finaliser(saisies);

  // --- Feuille longue ------------------------------------------------
  const reponses = ouvrirTable(classeur, reglages.nomFeuilleReponses, reglages.nomTableReponses, [
    ...COLONNES_REPONSES,
  ]);
  definirFormat(reponses, 'Date', FORMAT_DATE);
  assurerColonnes(reponses, [...COLONNES_REPONSES]);
  for (const cycle of nouveaux) {
    for (const ligne of lignesReponses(cycle)) ajouterLigne(reponses, ligne);
  }
  finaliser(reponses);

  // --- Catalogue des questions --------------------------------------
  majCatalogue(classeur, produits, reglages);

  await ecrireClasseur(classeur, chemin);

  const ajoutes = nouveaux.map((c) => c.id);
  journal.info(`Classeur mis a jour : ${ajoutes.length} cycle(s) ajoute(s)`, chemin);
  return { ajoutes, deja: ignores };
}

/**
 * Le catalogue est une table de dimension derivee de la configuration : les
 * lignes existantes sont mises a jour sur place, les nouvelles questions
 * ajoutees a la suite. Aucune ligne n'est supprimee, pour ne pas casser les
 * relations Power BI portant sur des questions retirees depuis.
 */
function majCatalogue(classeur: ExcelJS.Workbook, produits: Produit[], reglages: Reglages): void {
  const catalogue = ouvrirTable(classeur, reglages.nomFeuilleQuestions, reglages.nomTableQuestions, [
    ...COLONNES_QUESTIONS,
  ]);
  assurerColonnes(catalogue, [...COLONNES_QUESTIONS]);

  const colonneCle = catalogue.entetes.indexOf('Cle_Question') + 1;
  const lignesParCle = new Map<string, number>();
  if (colonneCle > 0) {
    for (let r = 2; r <= catalogue.derniereLigne; r += 1) {
      const cle = catalogue.feuille.getRow(r).getCell(colonneCle).value;
      if (cle) lignesParCle.set(String(cle), r);
    }
  }

  for (const ligne of lignesCatalogue(produits)) {
    const existante = lignesParCle.get(String(ligne.Cle_Question));
    if (existante) {
      const cible = catalogue.feuille.getRow(existante);
      catalogue.entetes.forEach((entete, index) => {
        if (entete in ligne) cible.getCell(index + 1).value = ligne[entete];
      });
      cible.commit();
    } else {
      ajouterLigne(catalogue, ligne);
    }
  }
  finaliser(catalogue);
}

function identifiantsExistants(contexte: ContexteTable): string[] {
  const index = contexte.entetes.indexOf('ID_Cycle') + 1;
  if (index <= 0) return [];
  const sortie: string[] = [];
  for (let r = 2; r <= contexte.derniereLigne; r += 1) {
    const valeur = contexte.feuille.getRow(r).getCell(index).value;
    if (valeur !== null && valeur !== undefined && String(valeur).trim() !== '') {
      sortie.push(String(valeur).trim());
    }
  }
  return sortie;
}

/**
 * Ecriture via un fichier temporaire du meme dossier puis renommage : le
 * classeur d'origine reste intact si l'ecriture echoue en cours de route.
 */
async function ecrireClasseur(classeur: ExcelJS.Workbook, chemin: string): Promise<void> {
  const temporaire = path.join(path.dirname(chemin), `.~olmix-${process.pid}-${Date.now()}.xlsx`);
  try {
    await classeur.xlsx.writeFile(temporaire);
    fs.renameSync(temporaire, chemin);
  } catch (e) {
    fs.rmSync(temporaire, { force: true });
    if (estErreurVerrou(e)) throw new ClasseurVerrouilleError(chemin);
    throw e;
  }
}
