/**
 * Relecture complete avant enregistrement.
 * Chaque etape peut etre rouverte d'un clic ; les valeurs hors plage et leur
 * justification sont mises en evidence.
 */

import { useMemo, useState } from 'react';
import { cleReponse } from '@shared/columns';
import { resoudreAffichage } from '@shared/cycle';
import { estHorsBornes, estVide, validerEtape } from '@shared/validation';
import type { Produit, ValeurReponse } from '@shared/types';
import Bandeau from '../components/Bandeau';
import Icone from '../components/Icone';
import ChiffresCles, { type Chiffre } from '../components/ChiffresCles';
import Apparition from '../components/motion/Apparition';

interface Proprietes {
  produit: Produit;
  operateur: string;
  matricule: string;
  /** Debut de la saisie : sert a afficher sa duree. */
  debutIso: string | null;
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
  debutIso,
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

  // Fige a l'ouverture de l'ecran : la duree ne defile pas pendant la relecture.
  const [ouverture] = useState(() => new Date());

  const chiffres = useMemo<Chiffre[]>(() => {
    const questions = produit.etapes.flatMap((etape) => etape.questions.map((q) => ({ etape, q })));
    const renseignees = questions.filter(
      ({ etape, q }) => q.type === 'booleen' || !estVide(valeurs[cleReponse(etape.id, q.id)] ?? null),
    ).length;
    const secondes = debutIso ? Math.max(0, Math.round((ouverture.getTime() - Date.parse(debutIso)) / 1000)) : 0;
    const nbEtapes = produit.etapes.length;
    const duree: Chiffre =
      secondes < 60
        ? { cle: 'duree', sousTitre: 'Durée de saisie', valeur: secondes, unite: 's', libelle: 'depuis le choix du produit' }
        : {
            cle: 'duree',
            sousTitre: 'Durée de saisie',
            valeur: Math.round(secondes / 60),
            unite: 'min',
            libelle: 'depuis le choix du produit',
          };
    return [
      {
        cle: 'etapes',
        sousTitre: 'Étapes',
        valeur: nbEtapes - incompletes.length,
        unite: `/ ${nbEtapes}`,
        libelle: incompletes.length === 0 ? 'toutes complètes' : 'étapes complètes',
      },
      {
        cle: 'reponses',
        sousTitre: 'Réponses',
        valeur: renseignees,
        unite: `/ ${questions.length}`,
        libelle: 'questions renseignées',
      },
      {
        cle: 'alertes',
        sousTitre: 'Alertes',
        valeur: nbAlertes,
        libelle: nbAlertes > 0 ? 'hors plage, commentées' : 'aucune valeur hors plage',
        ton: nbAlertes > 0 ? 'alerte' : undefined,
      },
      duree,
    ];
  }, [produit, valeurs, incompletes.length, nbAlertes, debutIso, ouverture]);

  return (
    <div className="ecran__interieur">
      <Apparition auDefilement={false}>
        <div className="sur-titre">Avant validation</div>
        <h1 className="titre-ecran">Récapitulatif</h1>
        <p className="sous-titre-ecran">
          Relisez vos réponses, corrigez si nécessaire, puis validez pour enregistrer le cycle.
        </p>
      </Apparition>

      <div style={{ marginTop: 24 }}>
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
                  style={{ minHeight: 40, padding: '0 14px', fontSize: 'var(--t-xs)' }}
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

        <Apparition auDefilement={false} delai={0.1}>
          <ChiffresCles
            delai={0.2}
            chiffres={chiffres}
            meta={
              <>
                <span>
                  Produit <strong>{produit.nom}</strong>
                </span>
                <span>
                  Opérateur{' '}
                  <strong>
                    {operateur}
                    {matricule ? ` · ${matricule}` : ''}
                  </strong>
                </span>
                <span>
                  Date et heure <strong>{ouverture.toLocaleString('fr-FR')}</strong>
                </span>
              </>
            }
          />
        </Apparition>
      </div>

      {/* Blocs en cascade : les premiers a l'ouverture, les suivants a
          l'entree dans la zone visible. */}
      {produit.etapes.map((etape, index) => (
        <Apparition key={etape.id} delai={index < 2 ? 0.35 + index * 0.15 : 0} className="carte recap__bloc">
          <header className="recap__entete">
            <h2 className="recap__etape">
              <span className="recap__pastille" aria-hidden>
                {etape.icone ?? index + 1}
              </span>
              {etape.nom}
            </h2>
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
        </Apparition>
      ))}

      <div className="actions">
        <button type="button" className="btn btn--secondaire btn--grand" onClick={onRetour} disabled={enregistrement}>
          <span className="btn__fleche btn__fleche--retour" aria-hidden>
            ←
          </span>
          Revenir à la dernière étape
        </button>
        <div className="actions__info">
          {enregistrement ? 'Enregistrement en cours…' : 'La validation est définitive pour ce cycle.'}
        </div>
        <button type="button" className="btn btn--principal btn--grand" disabled={!pretAValider} onClick={onValider}>
          {enregistrement ? 'Enregistrement…' : 'Valider et enregistrer'}
        </button>
      </div>
    </div>
  );
}
