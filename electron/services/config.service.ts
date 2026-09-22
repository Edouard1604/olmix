/**
 * Chargement et enregistrement de la configuration des produits.
 *
 * Au premier lancement, la configuration d'exemple embarquee dans l'installeur
 * est copiee dans le dossier de donnees utilisateur. L'operateur travaille
 * ensuite toujours sur cette copie : une mise a jour de l'application n'ecrase
 * jamais les produits de l'atelier.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ConfigurationProduits } from '../../shared/types';
import { validerConfiguration, type ResultatValidation } from '../../shared/schema';
import { cheminConfigExemple, cheminConfigProduits } from './paths';
import { ecrireJson } from './fs-utils';
import { journal, messageErreur } from './logger';

const CONFIG_VIDE: ConfigurationProduits = { version: 1, produits: [] };

let cache: ConfigurationProduits | null = null;
let problemesDernierChargement: ResultatValidation['problemes'] = [];

export function initialiserConfiguration(): void {
  const cible = cheminConfigProduits();
  if (fs.existsSync(cible)) return;
  try {
    const source = cheminConfigExemple();
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.copyFileSync(source, cible);
    journal.info('Configuration initialisee depuis l’exemple embarque', cible);
  } catch (e) {
    journal.avertissement('Impossible de copier la configuration d’exemple', e);
    ecrireJson(cible, CONFIG_VIDE);
  }
}

/** Recharge la configuration depuis le disque et la valide. */
export function chargerConfiguration(): ResultatValidation {
  const chemin = cheminConfigProduits();
  let brut: unknown;
  try {
    brut = JSON.parse(fs.readFileSync(chemin, 'utf-8'));
  } catch (e) {
    const message = fs.existsSync(chemin)
      ? `Le fichier de configuration est illisible (JSON invalide) : ${messageErreur(e)}`
      : `Fichier de configuration introuvable : ${chemin}`;
    journal.erreur('Chargement de la configuration impossible', message);
    problemesDernierChargement = [{ niveau: 'erreur', message }];
    return { valide: false, configuration: null, problemes: problemesDernierChargement };
  }

  const resultat = validerConfiguration(brut);
  problemesDernierChargement = resultat.problemes;
  if (resultat.valide && resultat.configuration) {
    cache = resultat.configuration;
    const bloquants = resultat.problemes.filter((p) => p.niveau === 'erreur');
    if (bloquants.length) journal.avertissement('Configuration chargee avec des anomalies', bloquants);
  } else {
    journal.erreur('Configuration invalide', resultat.problemes);
  }
  return resultat;
}

/** Configuration courante, en ne conservant que les produits actifs. */
export function configurationActive(): ConfigurationProduits {
  if (!cache) chargerConfiguration();
  if (!cache) return CONFIG_VIDE;
  return { ...cache, produits: cache.produits.filter((p) => p.actif !== false) };
}

/** Configuration complete, produits desactives inclus (mode administrateur). */
export function configurationComplete(): ConfigurationProduits {
  if (!cache) chargerConfiguration();
  return cache ?? CONFIG_VIDE;
}

export function problemesConfiguration(): ResultatValidation['problemes'] {
  return problemesDernierChargement;
}

/**
 * Enregistre une configuration depuis le mode administrateur.
 * Une sauvegarde horodatee de la version precedente est conservee a cote :
 * une erreur de manipulation reste ainsi toujours reversible.
 */
export function enregistrerConfiguration(brut: unknown): ResultatValidation {
  const resultat = validerConfiguration(brut);
  const bloquants = resultat.problemes.filter((p) => p.niveau === 'erreur');
  if (!resultat.valide || !resultat.configuration || bloquants.length) return resultat;

  const chemin = cheminConfigProduits();
  if (fs.existsSync(chemin)) {
    const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
    const archive = path.join(path.dirname(chemin), 'historique', `produits-${horodatage}.json`);
    fs.mkdirSync(path.dirname(archive), { recursive: true });
    fs.copyFileSync(chemin, archive);
  }

  ecrireJson(chemin, resultat.configuration);
  cache = resultat.configuration;
  problemesDernierChargement = resultat.problemes;
  journal.info('Configuration enregistree', `${resultat.configuration.produits.length} produit(s)`);
  return resultat;
}
