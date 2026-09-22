/**
 * Passe un fichier de configuration dans le validateur de l'application et
 * affiche le detail des colonnes Excel qui en decouleraient.
 * Usage : node scripts/run-ts.mjs scripts/valider-config.ts [chemin]
 */

import fs from 'node:fs';
import path from 'node:path';
import { validerConfiguration } from '../shared/schema';
import { colonneDeQuestion, COLONNES_FIXES_SAISIES } from '../shared/columns';

const chemin = process.argv[2] ?? path.join(process.cwd(), 'config', 'produits.example.json');
const validation = validerConfiguration(JSON.parse(fs.readFileSync(chemin, 'utf-8')));

console.log(`Fichier : ${chemin}\n`);

if (!validation.valide || !validation.configuration) {
  console.error('❌ Configuration REFUSEE :');
  for (const p of validation.problemes) console.error(`   [${p.niveau}] ${p.message}`);
  process.exit(1);
}

const erreurs = validation.problemes.filter((p) => p.niveau === 'erreur');
const avertissements = validation.problemes.filter((p) => p.niveau === 'avertissement');

for (const p of erreurs) console.error(`   ❌ ${p.message}`);
for (const p of avertissements) console.warn(`   ⚠️  ${p.message}`);
if (!validation.problemes.length) console.log('✅ Aucune anomalie, aucun avertissement.\n');

// Recense les colonnes et le nombre de produits qui les alimentent.
const parColonne = new Map<string, string[]>();
for (const produit of validation.configuration.produits) {
  for (const etape of produit.etapes) {
    for (const question of etape.questions) {
      const colonne = colonneDeQuestion(question);
      parColonne.set(colonne, [...(parColonne.get(colonne) ?? []), produit.nom]);
    }
  }
}

const partagees = [...parColonne].filter(([, p]) => p.length > 1);
const propres = [...parColonne].filter(([, p]) => p.length === 1);

console.log(`Colonnes de T_Saisies : ${COLONNES_FIXES_SAISIES.length} fixes + ${parColonne.size} issues des questions`);
console.log(`  partagées par plusieurs produits : ${partagees.length}`);
console.log(`  propres à un seul produit        : ${propres.length}\n`);

for (const produit of validation.configuration.produits) {
  const colonnes = produit.etapes.flatMap((e) => e.questions.map(colonneDeQuestion));
  const uniques = colonnes.filter((c) => parColonne.get(c)!.length === 1);
  console.log(`${produit.nom} (${produit.id})`);
  console.log(`  ${produit.etapes.length} étapes : ${produit.etapes.map((e) => e.nom).join(' → ')}`);
  console.log(`  ${colonnes.length} questions, dont ${uniques.length} colonne(s) qui lui sont propres` +
    (uniques.length ? ` : ${uniques.join(', ')}` : ''));
}
