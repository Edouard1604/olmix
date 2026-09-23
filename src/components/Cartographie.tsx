/**
 * Cartographie du processus de production du produit selectionne.
 *
 * Schema de flux vertical : chaque etape est un noeud relie au suivant par une
 * fleche. L'etape courante est mise en surbrillance et animee, les etapes
 * terminees portent une coche verte, les suivantes sont grisees.
 * Les etapes deja atteintes sont cliquables : c'est le chemin le plus rapide
 * pour revenir corriger une reponse.
 */

import { motion } from 'framer-motion';
import type { EtapeProcessus } from '@shared/types';
import Icone from './Icone';

interface Proprietes {
  etapes: EtapeProcessus[];
  indexCourant: number;
  /** Index maximal deja atteint : au-dela, la navigation directe est interdite. */
  indexMaxAtteint: number;
  accent: string;
  onAller: (index: number) => void;
}

export default function Cartographie({ etapes, indexCourant, indexMaxAtteint, accent, onAller }: Proprietes) {
  return (
    <aside className="carte carto" style={{ ['--accent' as string]: accent }}>
      <div className="carto__titre">Cartographie du process</div>
      <div className="carto__flux">
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
                <div className={`fleche${faite || courante ? ' fleche--franchie' : ''}`} aria-hidden>
                  <div className="fleche__trait" />
                </div>
              )}
              <motion.button
                type="button"
                className={classe}
                disabled={!accessible}
                onClick={() => accessible && onAller(index)}
                aria-current={courante ? 'step' : undefined}
                title={accessible ? `Aller à « ${etape.nom} »` : 'Étape non encore atteinte'}
                whileTap={accessible ? { scale: 0.985 } : undefined}
                layout
              >
                <div className="noeud__pastille">
                  {faite ? <Icone nom="coche" taille={26} epaisseur={2.6} /> : (etape.icone ?? index + 1)}
                </div>
                <div className="noeud__texte">
                  <div className="noeud__nom">{etape.nom}</div>
                  <div className="noeud__etat">
                    {faite ? 'Terminée' : courante ? 'En cours de saisie' : 'À venir'}
                  </div>
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
