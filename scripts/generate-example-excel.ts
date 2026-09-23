/**
 * Genere le classeur d'exemple pre-rempli livre avec le projet.
 *
 * Le script utilise exactement le meme service d'ecriture que l'application :
 * le fichier produit est donc representatif au bit pres de ce que l'atelier
 * obtiendra. Il ecrit en DEUX passes pour demontrer le comportement
 * incremental (ajout de lignes, puis ajout de lignes ET de colonnes).
 */

import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { ajouterCyclesAuClasseur } from '../electron/services/excel.service';
import { validerConfiguration } from '../shared/schema';
import { construireCycle, genererIdCycle, type SaisieBrute } from '../shared/cycle';
import type { Produit, Reglages, ValeurReponse } from '../shared/types';

// Le script est lance par `npm run`, donc depuis la racine du projet.
const racine = process.cwd();
const sortie = path.join(racine, 'exemples', 'Saisies_Production_exemple.xlsx');

const reglages: Reglages = {
  cheminExcel: sortie,
  nomFeuilleSaisies: 'Saisies',
  nomTableSaisies: 'T_Saisies',
  nomFeuilleReponses: 'Reponses',
  nomTableReponses: 'T_Reponses',
  nomFeuilleQuestions: 'Catalogue',
  nomTableQuestions: 'T_Questions',
  theme: 'clair',
  adminSel: '',
  adminHash: '',
  sauvegardeQuotidienne: true,
  retentionSauvegardesJours: 30,
  intervalleFileAttenteMs: 20_000,
};

/* Generateur pseudo-aleatoire deterministe : le fichier d'exemple est
   reproductible a l'identique d'une execution a l'autre. */
let graine = 20260922;
function alea(): number {
  graine = (graine * 1_103_515_245 + 12_345) % 2_147_483_648;
  return graine / 2_147_483_648;
}
function entre(min: number, max: number, decimales = 0): number {
  return Number((min + alea() * (max - min)).toFixed(decimales));
}
function piocher<T>(liste: T[]): T {
  return liste[Math.floor(alea() * liste.length)] as T;
}

const OPERATEURS = [
  { nom: 'Marc Le Gall', matricule: '10425' },
  { nom: 'Sophie Tanguy', matricule: '11873' },
  { nom: 'Yann Kerhervé', matricule: '02561' },
  { nom: 'Nadia Bouchard', matricule: '13017' },
];

/** Remplit toutes les questions d'un produit avec des valeurs plausibles. */
function valeursPour(produit: Produit, forcerHorsBornes: boolean): SaisieBrute['valeurs'] {
  const valeurs: SaisieBrute['valeurs'] = {};
  let horsBornesPose = false;

  for (const etape of produit.etapes) {
    for (const question of etape.questions) {
      const cle = `${etape.id}.${question.id}`;
      let valeur: ValeurReponse;

      switch (question.type) {
        case 'nombre': {
          const min = question.min ?? 0;
          const max = question.max ?? 100;
          const dec = question.decimales ?? 1;
          if (forcerHorsBornes && !horsBornesPose && question.max != null) {
            // Un depassement volontaire, pour illustrer les colonnes d'alerte.
            valeur = Number((max * 1.08).toFixed(dec));
            horsBornesPose = true;
          } else {
            const marge = (max - min) * 0.15;
            valeur = entre(min + marge, max - marge, dec);
          }
          break;
        }
        case 'booleen':
          valeur = alea() > 0.12;
          break;
        case 'liste':
          valeur = piocher(question.options ?? []).valeur;
          break;
        case 'choix_multiple':
          valeur = alea() > 0.6 ? [piocher(question.options ?? []).valeur] : [];
          break;
        case 'date':
          valeur = '2026-09-18';
          break;
        case 'heure':
          valeur = `${String(entre(6, 20)).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}`;
          break;
        case 'datetime':
          valeur = '2026-09-18T08:30';
          break;
        case 'textarea':
          valeur = alea() > 0.6 ? 'Cycle nominal, rien à signaler.' : '';
          break;
        default:
          valeur = `L${Math.floor(entre(100000, 999999))}`;
      }
      valeurs[cle] = valeur;
    }
  }
  return valeurs;
}

function fabriquerCycle(produit: Produit, jour: number, heure: number, index: number) {
  const debut = new Date(2026, 8, jour, heure, 5, 0);
  const fin = new Date(2026, 8, jour, heure, 5 + Math.floor(entre(4, 18)), 0);
  const operateur = OPERATEURS[index % OPERATEURS.length]!;
  const forcerHorsBornes = index % 4 === 2;
  const valeurs = valeursPour(produit, forcerHorsBornes);

  const commentaires: Record<string, string> = {};
  for (const etape of produit.etapes) {
    for (const question of etape.questions) {
      const cle = `${etape.id}.${question.id}`;
      if (question.type !== 'nombre' || question.max == null) continue;
      if (Number(valeurs[cle]) > question.max) {
        commentaires[cle] = 'Dépassement validé par le chef d’équipe — lot suivi en qualité.';
      }
    }
  }

  const saisie: SaisieBrute = {
    produitId: produit.id,
    operateur: operateur.nom,
    matricule: operateur.matricule,
    debutIso: debut.toISOString(),
    valeurs,
    commentaires,
  };

  const id = genererIdCycle(fin, `E${index}0A`);
  return construireCycle(produit, saisie, id, fin.toISOString(), 1);
}

async function principal(): Promise<void> {
  const brut = JSON.parse(fs.readFileSync(path.join(racine, 'config', 'produits.example.json'), 'utf-8'));
  const validation = validerConfiguration(brut);
  if (!validation.valide || !validation.configuration) {
    console.error('Configuration d’exemple invalide :');
    for (const p of validation.problemes) console.error(` - [${p.niveau}] ${p.message}`);
    process.exit(1);
  }
  for (const p of validation.problemes) console.warn(` ! [${p.niveau}] ${p.message}`);

  const produits = validation.configuration.produits;
  const premier = produits[0]!;

  fs.rmSync(sortie, { force: true });
  fs.mkdirSync(path.dirname(sortie), { recursive: true });

  // Passe 1 : creation du classeur avec un seul produit.
  const passe1 = [
    fabriquerCycle(premier, 15, 6, 0),
    fabriquerCycle(premier, 15, 14, 1),
    fabriquerCycle(premier, 16, 6, 2),
  ];
  const r1 = await ajouterCyclesAuClasseur(passe1, produits, reglages);
  console.log(`Passe 1 : ${r1.ajoutes.length} cycle(s) ajoute(s).`);

  // Passe 2 : les autres produits -> de NOUVELLES colonnes apparaissent a
  // droite, sans toucher aux lignes deja ecrites.
  let index = 3;
  let jour = 16;
  const passe2 = [fabriquerCycle(premier, 17, 14, index += 1)];
  for (const produit of produits.slice(1)) {
    passe2.push(fabriquerCycle(produit, jour, 13, index += 1));
    passe2.push(fabriquerCycle(produit, jour + 1, 6, index += 1));
    jour += 1;
  }
  const r2 = await ajouterCyclesAuClasseur(passe2, produits, reglages);
  console.log(`Passe 2 : ${r2.ajoutes.length} cycle(s) ajoute(s) sur ${produits.length - 1} autre(s) produit(s).`);

  // Passe 3 : on rejoue la passe 1 pour verifier l'absence de doublon.
  const r3 = await ajouterCyclesAuClasseur(passe1, produits, reglages);
  console.log(`Passe 3 (rejeu) : ${r3.ajoutes.length} ajout(s), ${r3.deja.length} ignore(s) car deja present(s).`);
  if (r3.ajoutes.length !== 0) throw new Error('La deduplication par ID_Cycle ne fonctionne pas.');

  await verifier();
}

/** Controle final : structure, tableaux nommes, absence de ligne vide. */
async function verifier(): Promise<void> {
  const classeur = new ExcelJS.Workbook();
  await classeur.xlsx.readFile(sortie);
  console.log('\n--- Verification du classeur genere ---');
  for (const nom of ['Saisies', 'Reponses', 'Catalogue']) {
    const feuille = classeur.getWorksheet(nom)!;
    const table = (feuille.getTable(nom === 'Saisies' ? 'T_Saisies' : nom === 'Reponses' ? 'T_Reponses' : 'T_Questions') as unknown as { table: { tableRef: string; columns: { name: string }[] } }).table;
    const vides: number[] = [];
    const fin = Number.parseInt(table.tableRef.split(':')[1]!.replace(/[^0-9]/g, ''), 10);
    for (let r = 2; r <= fin; r += 1) {
      const premiere = feuille.getRow(r).getCell(1).value;
      if (premiere === null || premiere === undefined || String(premiere).trim() === '') vides.push(r);
    }
    console.log(
      `${nom.padEnd(10)} plage=${table.tableRef.padEnd(12)} colonnes=${String(table.columns.length).padStart(3)} lignes=${String(fin - 1).padStart(3)} lignes_vides=${vides.length}`,
    );
    if (vides.length) throw new Error(`Lignes vides detectees dans ${nom} : ${vides.join(', ')}`);
  }
  const saisies = classeur.getWorksheet('Saisies')!;
  console.log('\nEn-tetes T_Saisies :');
  console.log('  ' + saisies.getRow(1).values!.toString().replace(/^,/, '').split(',').join(' | '));
  console.log(`\nClasseur d'exemple ecrit : ${sortie}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
