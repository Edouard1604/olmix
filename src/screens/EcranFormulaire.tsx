/**
 * Page de questions : 55 % de questions a gauche, 45 % de cartographie a droite.
 *
 * Le bouton « Suivant » reste desactive tant que l'etape comporte un probleme
 * bloquant. Un clic dessus dans cet etat (il reste focusable) declenche la mise
 * en evidence des champs fautifs plutot qu'un silence.
 */

import { useCallback, useEffect, useRef } from 'react';
import { cleReponse } from '@shared/columns';
import type { Produit, ValeurReponse } from '@shared/types';
import type { EtatEtape } from '@shared/validation';
import Champ from '../components/fields/Champ';
import Cartographie from '../components/Cartographie';

interface Proprietes {
  produit: Produit;
  indexEtape: number;
  indexMaxAtteint: number;
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
  const accent = produit.couleur ?? 'var(--vert-600)';
  const derniere = indexEtape === produit.etapes.length - 1;
  const haut = useRef<HTMLDivElement>(null);

  // Chaque changement d'etape ramene la vue en haut de la liste de questions.
  useEffect(() => {
    haut.current?.scrollIntoView({ block: 'start' });
  }, [indexEtape]);

  const tenterSuivant = useCallback(() => {
    if (validation.complete) onSuivant();
    else onTentative();
  }, [validation.complete, onSuivant, onTentative]);

  /** Entrée = étape suivante, sauf dans une zone de texte multiligne. */
  const surTouche = (evenement: React.KeyboardEvent) => {
    if (evenement.key !== 'Enter') return;
    const cible = evenement.target as HTMLElement;
    if (cible.tagName === 'TEXTAREA' || cible.tagName === 'BUTTON') return;
    evenement.preventDefault();
    tenterSuivant();
  };

  return (
    <div className="ecran__interieur" onKeyDown={surTouche}>
      <div className="formulaire">
        <section className="questions" ref={haut}>
          <div className="etape-entete" style={{ ['--accent' as string]: accent }}>
            <div className="etape-entete__icone" aria-hidden>
              {etape.icone ?? indexEtape + 1}
            </div>
            <div>
              <h2 className="etape-entete__nom">{etape.nom}</h2>
              {etape.description && <div className="etape-entete__desc">{etape.description}</div>}
            </div>
          </div>

          {etape.questions.map((question) => {
            const cle = cleReponse(etape.id, question.id);
            return (
              <Champ
                key={question.id}
                question={question}
                valeur={valeurs[cle] ?? null}
                commentaire={commentaires[cle] ?? ''}
                probleme={validation.problemes[question.id]}
                forcerAffichage={tentative}
                onValeur={(valeur) => onValeur(etape.id, question.id, valeur)}
                onCommentaire={(commentaire) => onCommentaire(etape.id, question.id, commentaire)}
              />
            );
          })}

          <div className="actions">
            <button type="button" className="btn btn--secondaire btn--grand" onClick={onPrecedent}>
              ← Précédent
            </button>

            <div className="actions__info">
              {validation.complete ? (
                validation.nbAvertissements > 0 ? (
                  <>
                    ⚠️ {validation.nbAvertissements} valeur{validation.nbAvertissements > 1 ? 's' : ''} hors plage,
                    commentée{validation.nbAvertissements > 1 ? 's' : ''} — vous pouvez continuer.
                  </>
                ) : (
                  <>✓ Étape complète</>
                )
              ) : (
                <>
                  {validation.nbBloquants} réponse{validation.nbBloquants > 1 ? 's' : ''} manquante
                  {validation.nbBloquants > 1 ? 's' : ''} ou invalide{validation.nbBloquants > 1 ? 's' : ''}
                </>
              )}
            </div>

            {/* Le bouton reste cliquable pour pouvoir signaler ce qui manque. */}
            <button
              type="button"
              className="btn btn--principal btn--grand"
              aria-disabled={!validation.complete}
              style={validation.complete ? undefined : { opacity: 0.45, cursor: 'not-allowed' }}
              onClick={tenterSuivant}
            >
              {derniere ? 'Vérifier la saisie' : 'Suivant'} →
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
