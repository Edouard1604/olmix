/**
 * Relecture complete avant enregistrement.
 * Chaque etape peut etre rouverte d'un clic ; les valeurs hors plage et leur
 * justification sont mises en evidence.
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cleReponse } from '@shared/columns';
import { resoudreAffichage } from '@shared/cycle';
import { estHorsBornes, estVide, validerEtape } from '@shared/validation';
import type { Produit, ValeurReponse } from '@shared/types';
import Bandeau from '../components/Bandeau';
import Icone from '../components/Icone';

interface Proprietes {
  produit: Produit;
  operateur: string;
  matricule: string;
  valeurs: Record<string, ValeurReponse>;
  commentaires: Record<string, string>;
  enregistrement: boolean;
  erreur: string | null;
  onModifier: (index: number) => void;
  onValider: () => void;
  onRetour: () => void;
}

export default function EcranRecapitulatif({
  produit,
  operateur,
  matricule,
  valeurs,
  commentaires,
  enregistrement,
  erreur,
  onModifier,
  onValider,
  onRetour,
}: Proprietes) {
  /** Verification globale : une etape precedente a pu etre videe apres coup. */
  const incompletes = useMemo(
    () =>
      produit.etapes
        .map((etape, index) => {
          const v: Record<string, ValeurReponse> = {};
          const c: Record<string, string> = {};
          for (const q of etape.questions) {
            v[q.id] = valeurs[cleReponse(etape.id, q.id)] ?? null;
            c[q.id] = commentaires[cleReponse(etape.id, q.id)] ?? '';
          }
          return { index, etape, etat: validerEtape(etape.questions, v, c) };
        })
        .filter((e) => !e.etat.complete),
    [produit, valeurs, commentaires],
  );

  const nbAlertes = produit.etapes.reduce(
    (total, etape) =>
      total +
      etape.questions.filter((q) => estHorsBornes(q, valeurs[cleReponse(etape.id, q.id)] ?? null)).length,
    0,
  );

  const pretAValider = incompletes.length === 0 && !enregistrement;

  return (
    <div className="ecran__interieur">
      <h1 className="titre-ecran">Récapitulatif</h1>
      <p className="sous-titre-ecran">
        Relisez vos réponses, corrigez si nécessaire, puis validez pour enregistrer le cycle.
      </p>

      <div style={{ marginTop: 22 }}>
        {erreur && (
          <Bandeau ton="erreur" titre="Enregistrement impossible">
            <div style={{ whiteSpace: 'pre-line' }}>{erreur}</div>
          </Bandeau>
        )}

        {incompletes.length > 0 && (
          <Bandeau ton="erreur" titre="Des réponses obligatoires sont manquantes">
            {incompletes.map(({ index, etape, etat }) => (
              <div key={etape.id}>
                • {etape.nom} : {etat.nbBloquants} réponse{etat.nbBloquants > 1 ? 's' : ''} à compléter{' '}
                <button
                  type="button"
                  className="btn btn--fantome"
                  style={{ minHeight: 32, padding: '0 10px', fontSize: 'var(--t-xs)' }}
                  onClick={() => onModifier(index)}
                >
                  Corriger
                </button>
              </div>
            ))}
          </Bandeau>
        )}

        {nbAlertes > 0 && incompletes.length === 0 && (
          <Bandeau ton="alerte" titre={`${nbAlertes} valeur${nbAlertes > 1 ? 's' : ''} hors plage`}>
            Ces valeurs sont conservées et signalées dans l'export ; elles n'empêchent pas la validation.
          </Bandeau>
        )}

        <div className="carte" style={{ padding: '18px 24px' }}>
          <div className="rangee" style={{ gap: 26 }}>
            <div>
              <div className="admin__mini">Produit</div>
              <strong style={{ fontSize: 'var(--t-l)' }}>{produit.nom}</strong>
            </div>
            <div>
              <div className="admin__mini">Opérateur</div>
              <strong style={{ fontSize: 'var(--t-l)' }}>
                {operateur}
                {matricule ? ` · ${matricule}` : ''}
              </strong>
            </div>
            <div>
              <div className="admin__mini">Date et heure</div>
              <strong style={{ fontSize: 'var(--t-l)' }}>{new Date().toLocaleString('fr-FR')}</strong>
            </div>
          </div>
        </div>
      </div>

      {produit.etapes.map((etape, index) => (
        <motion.section
          key={etape.id}
          className="carte recap__bloc"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(index * 0.05, 0.25) }}
        >
          <header className="recap__entete">
            <div className="recap__etape">
              <span aria-hidden>{etape.icone ?? index + 1}</span>
              {etape.nom}
            </div>
            <button type="button" className="btn btn--secondaire" onClick={() => onModifier(index)}>
              <Icone nom="crayon" taille={18} /> Modifier
            </button>
          </header>
          <table className="recap__table">
            <tbody>
              {etape.questions.map((question) => {
                const cle = cleReponse(etape.id, question.id);
                const valeur = valeurs[cle] ?? null;
                const alerte = estHorsBornes(question, valeur);
                const vide = question.type !== 'booleen' && estVide(valeur);
                const affichage = resoudreAffichage(question, valeur);
                return (
                  <tr key={question.id} className={alerte ? 'ligne--alerte' : undefined}>
                    <td className="recap__q">{question.libelle}</td>
                    <td>
                      <div className={`recap__v${vide ? ' recap__v--vide' : ''}`}>
                        {vide ? 'Non renseigné' : affichage}
                        {!vide && question.unite ? ` ${question.unite}` : ''}
                        {alerte && (
                          <span style={{ marginLeft: 10, color: 'var(--alerte)', display: 'inline-flex' }}>
                            <Icone nom="alerte" taille={18} titre="Valeur hors plage" />
                          </span>
                        )}
                      </div>
                      {alerte && commentaires[cle] && (
                        <div className="recap__commentaire">
                          <Icone nom="commentaire" taille={16} />
                          {commentaires[cle]}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.section>
      ))}

      <div className="actions">
        <button type="button" className="btn btn--secondaire btn--grand" onClick={onRetour} disabled={enregistrement}>
          ← Revenir à la dernière étape
        </button>
        <div className="actions__info">
          {enregistrement ? 'Enregistrement en cours…' : 'La validation est définitive pour ce cycle.'}
        </div>
        <button
          type="button"
          className="btn btn--principal btn--grand"
          disabled={!pretAValider}
          onClick={onValider}
        >
          {enregistrement ? 'Enregistrement…' : 'Valider et enregistrer'}
        </button>
      </div>
    </div>
  );
}
