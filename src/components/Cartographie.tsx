/**
 * Cartographie du processus de production du produit selectionne.
 *
 * Schema de flux vertical : chaque etape est un noeud relie au suivant par un
 * connecteur. L'etape courante porte une surbrillance qui glisse d'une etape a
 * l'autre et un anneau vert qui pulse lentement ; les etapes terminees
 * recoivent une coche qui se dessine et leur connecteur se trace au moment ou
 * l'on valide ; les suivantes restent en sauge desaturee.
 * Les etapes deja atteintes sont cliquables : c'est le chemin le plus rapide
 * pour revenir corriger une reponse.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { EtapeProcessus } from '@shared/types';
import { duree, ease, transitionAdaptee, useAnimationsReduites } from '../lib/motion';
import TraitDessine from './motion/TraitDessine';

interface Proprietes {
  etapes: EtapeProcessus[];
  indexCourant: number;
  /** Index maximal deja atteint : au-dela, la navigation directe est interdite. */
  indexMaxAtteint: number;
  accent: string;
  onAller: (index: number) => void;
}

export default function Cartographie({ etapes, indexCourant, indexMaxAtteint, accent, onAller }: Proprietes) {
  const reduit = useAnimationsReduites();
  const flux = useRef<HTMLDivElement>(null);
  const noeuds = useRef<(HTMLButtonElement | null)[]>([]);
  /** Position de la surbrillance : un seul calque, deplace en translateY. */
  const [cadre, setCadre] = useState<{ y: number; hauteur: number } | null>(null);

  // Pas de layoutId ici : un element « layout » qui sort sans successeur
  // bloque la fin de sortie de l'ecran dans AnimatePresence.
  useLayoutEffect(() => {
    const mesurer = () => {
      const noeud = noeuds.current[indexCourant];
      if (noeud) setCadre({ y: noeud.offsetTop, hauteur: noeud.offsetHeight });
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    if (flux.current) observateur.observe(flux.current);
    return () => observateur.disconnect();
  }, [indexCourant, etapes]);

  return (
    <aside className="carte carto" style={{ ['--accent' as string]: accent }}>
      <div className="sur-titre">
        Process · {etapes.length} étape{etapes.length > 1 ? 's' : ''}
      </div>
      <h3 className="carto__titre">Cartographie du process</h3>
      <div className="carto__flux" ref={flux}>
        {cadre && (
          <motion.div
            className="noeud__surbrillance"
            aria-hidden
            initial={false}
            animate={{ y: cadre.y }}
            style={{ height: cadre.hauteur }}
            transition={transitionAdaptee(reduit, { duration: duree.base, ease: ease.out })}
          />
        )}
        {etapes.map((etape, index) => {
          const faite = index < indexCourant;
          const courante = index === indexCourant;
          const accessible = index <= indexMaxAtteint;
          const classe = [
            'noeud',
            faite ? 'noeud--faite' : '',
            courante ? 'noeud--courante' : '',
            !faite && !courante ? 'noeud--a-venir' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div key={etape.id}>
              {index > 0 && (
                <div className="fleche" aria-hidden>
                  <svg viewBox="0 0 2 24" preserveAspectRatio="none" fill="none" strokeWidth={2} strokeLinecap="round">
                    <path className="fleche__base" d="M1 1 V23" />
                    {/* Le trait vert se trace quand on franchit l'etape precedente. */}
                    <TraitDessine
                      className="fleche__trace"
                      d="M1 1 V23"
                      actif={faite || courante}
                      duree={duree.base}
                      delai={0.1}
                    />
                  </svg>
                </div>
              )}
              <button
                ref={(element) => {
                  noeuds.current[index] = element;
                }}
                type="button"
                className={classe}
                disabled={!accessible}
                onClick={() => accessible && onAller(index)}
                aria-current={courante ? 'step' : undefined}
                title={accessible ? `Aller à « ${etape.nom} »` : 'Étape non encore atteinte'}
              >
                <div className="noeud__pastille">
                  {courante && <span className="noeud__anneau" aria-hidden />}
                  {faite ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <TraitDessine d="M6 12.5 L10.2 16.5 L18 8" duree={0.4} delai={0.15} />
                    </svg>
                  ) : (
                    (etape.icone ?? index + 1)
                  )}
                </div>
                <div className="noeud__texte">
                  <div className="noeud__nom">{etape.nom}</div>
                  <div className="noeud__etat">
                    {faite ? 'Terminée' : courante ? 'En cours de saisie' : 'À venir'}
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
