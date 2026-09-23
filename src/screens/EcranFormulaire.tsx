/**
 * Page de questions : 55 % de questions a gauche, 45 % de cartographie a droite.
 *
 * Le bouton « Suivant » reste desactive tant que l'etape comporte un probleme
 * bloquant. Un clic dessus dans cet etat (il reste focusable) declenche la mise
 * en evidence des champs fautifs plutot qu'un silence.
 *
 * Seules les questions changent d'une etape a l'autre (glissement en
 * chevauchement) : la cartographie et la barre d'actions restent en place,
 * le bouton « Suivant » ne disparait donc jamais sous le doigt.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cleReponse } from '@shared/columns';
import type { Produit, ValeurReponse } from '@shared/types';
import type { EtatEtape } from '@shared/validation';
import Champ from '../components/fields/Champ';
import Cartographie from '../components/Cartographie';
import Icone from '../components/Icone';
import Scene from '../components/motion/Scene';
import { useAnimationsReduites } from '../lib/motion';

interface Proprietes {
  produit: Produit;
  indexEtape: number;
  indexMaxAtteint: number;
  /** Sens de la derniere navigation : 1 en avant, -1 en arriere. */
  direction: number;
  valeurs: Record<string, ValeurReponse>;
  commentaires: Record<string, string>;
  validation: EtatEtape;
  tentative: boolean;
  onValeur: (etapeId: string, questionId: string, valeur: ValeurReponse) => void;
  onCommentaire: (etapeId: string, questionId: string, commentaire: string) => void;
  onSuivant: () => void;
  onPrecedent: () => void;
  onAllerEtape: (index: number) => void;
  onTentative: () => void;
}

export default function EcranFormulaire({
  produit,
  indexEtape,
  indexMaxAtteint,
  direction,
  valeurs,
  commentaires,
  validation,
  tentative,
  onValeur,
  onCommentaire,
  onSuivant,
  onPrecedent,
  onAllerEtape,
  onTentative,
}: Proprietes) {
  const etape = produit.etapes[indexEtape]!;
  const accent = produit.couleur ?? 'var(--olmix-petrole)';
  const derniere = indexEtape === produit.etapes.length - 1;
  const haut = useRef<HTMLElement>(null);
  const reduit = useAnimationsReduites();
  /** Compte les clics sur « Suivant » refuses : chacun relance la pulsation. */
  const [essaisRefuses, setEssaisRefuses] = useState(0);

  // Chaque changement d'etape ramene la vue en haut de la liste de questions.
  useEffect(() => {
    haut.current?.scrollIntoView({ block: 'start' });
    setEssaisRefuses(0);
  }, [indexEtape]);

  // Mise en evidence : on amene le PREMIER champ fautif sous les yeux.
  useEffect(() => {
    if (essaisRefuses === 0) return;
    // L'etape qui sort est `inert` : elle est exclue de la recherche.
    const premier = haut.current?.querySelector<HTMLElement>('.etape:not([inert]) .champ[data-bloquant="true"]');
    premier?.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'center' });
  }, [essaisRefuses, reduit]);

  const tenterSuivant = useCallback(() => {
    if (validation.complete) onSuivant();
    else {
      onTentative();
      setEssaisRefuses((n) => n + 1);
    }
  }, [validation.complete, onSuivant, onTentative]);

  /** Entrée = étape suivante, sauf dans une zone de texte multiligne. */
  const surTouche = (evenement: React.KeyboardEvent) => {
    if (evenement.key !== 'Enter') return;
    const cible = evenement.target as HTMLElement;
    if (cible.tagName === 'TEXTAREA' || cible.tagName === 'BUTTON') return;
    evenement.preventDefault();
    tenterSuivant();
  };

  const info = validation.complete
    ? validation.nbAvertissements > 0
      ? {
          ton: 'alerte',
          icone: 'alerte' as const,
          texte: `${validation.nbAvertissements} valeur${validation.nbAvertissements > 1 ? 's' : ''} hors plage, commentée${
            validation.nbAvertissements > 1 ? 's' : ''
          } — vous pouvez continuer.`,
        }
      : { ton: 'ok', icone: 'coche' as const, texte: 'Étape complète' }
    : {
        ton: '',
        texte: `${validation.nbBloquants} réponse${validation.nbBloquants > 1 ? 's' : ''} manquante${
          validation.nbBloquants > 1 ? 's' : ''
        } ou invalide${validation.nbBloquants > 1 ? 's' : ''}`,
      };

  return (
    <div className="ecran__interieur" onKeyDown={surTouche}>
      <div className="formulaire">
        <section className="questions" ref={haut}>
          <div className="questions__scene">
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <Scene key={etape.id} className="etape" direction={direction}>
                <div className="etape-entete" style={{ ['--accent' as string]: accent }}>
                  <div className="etape-entete__icone" aria-hidden>
                    {etape.icone ?? indexEtape + 1}
                  </div>
                  <div>
                    <div className="sur-titre">
                      Étape {indexEtape + 1} sur {produit.etapes.length}
                    </div>
                    <h2 className="etape-entete__nom">{etape.nom}</h2>
                    {etape.description && <div className="etape-entete__desc">{etape.description}</div>}
                  </div>
                </div>

                {etape.questions.map((question, rang) => {
                  const cle = cleReponse(etape.id, question.id);
                  return (
                    <Champ
                      key={question.id}
                      rang={rang}
                      question={question}
                      valeur={valeurs[cle] ?? null}
                      commentaire={commentaires[cle] ?? ''}
                      probleme={validation.problemes[question.id]}
                      forcerAffichage={tentative}
                      signalManquant={essaisRefuses}
                      onValeur={(valeur) => onValeur(etape.id, question.id, valeur)}
                      onCommentaire={(commentaire) => onCommentaire(etape.id, question.id, commentaire)}
                    />
                  );
                })}
              </Scene>
            </AnimatePresence>
          </div>

          <div className="actions">
            <button type="button" className="btn btn--secondaire btn--grand" onClick={onPrecedent}>
              <span className="btn__fleche btn__fleche--retour" aria-hidden>
                ←
              </span>
              Précédent
            </button>

            <div className={`actions__info${info.ton ? ` actions__info--${info.ton}` : ''}`}>
              {'icone' in info && info.icone && <Icone nom={info.icone} taille={17} />}
              <span>{info.texte}</span>
            </div>

            {/* Le bouton reste cliquable pour pouvoir signaler ce qui manque. */}
            <button
              type="button"
              className={`btn btn--principal btn--grand${validation.complete ? '' : ' btn--inactif'}`}
              aria-disabled={!validation.complete}
              onClick={tenterSuivant}
            >
              {/* Reflet joue une fois, quand l'etape devient complete. */}
              <span
                key={validation.complete ? `complet-${etape.id}` : 'incomplet'}
                className={`btn__reflet${validation.complete ? ' btn__reflet--actif' : ''}`}
                aria-hidden
              />
              {derniere ? 'Vérifier la saisie' : 'Suivant'}
              <span className="btn__fleche" aria-hidden>
                →
              </span>
            </button>
          </div>
        </section>

        <Cartographie
          etapes={produit.etapes}
          indexCourant={indexEtape}
          indexMaxAtteint={indexMaxAtteint}
          accent={accent}
          onAller={onAllerEtape}
        />
      </div>
    </div>
  );
}
