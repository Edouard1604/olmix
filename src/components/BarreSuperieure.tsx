/**
 * Bandeau permanent : identite de l'application, produit et operateur en cours,
 * progression, horloge et etat de synchronisation.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Produit, StatutSync, Theme } from '@shared/types';
import { dateLongue, heure } from '../lib/format';
import { duree, ease, transitionAdaptee, useAnimationsReduites } from '../lib/motion';
import IndicateurSync from './IndicateurSync';
import LogoOlmix from './motion/LogoOlmix';

interface Proprietes {
  produit: Produit | null;
  operateur: string;
  matricule: string;
  indexEtape: number;
  nbEtapes: number;
  nomEtape: string | null;
  statut: StatutSync;
  theme: Theme;
  onForcerSync: () => void;
  onBasculerTheme: () => void;
  onAdmin: () => void;
}

export default function BarreSuperieure({
  produit,
  operateur,
  matricule,
  indexEtape,
  nbEtapes,
  nomEtape,
  statut,
  theme,
  onForcerSync,
  onBasculerTheme,
  onAdmin,
}: Proprietes) {
  const [maintenant, setMaintenant] = useState(() => new Date());
  const reduit = useAnimationsReduites();

  useEffect(() => {
    const minuterie = setInterval(() => setMaintenant(new Date()), 15_000);
    return () => clearInterval(minuterie);
  }, []);

  const avancement = nbEtapes > 0 ? (indexEtape + 1) / nbEtapes : 0;

  return (
    <header className="barre">
      <div className="barre__marque">
        <LogoOlmix hauteur={56} />
        <span className="barre__separateur" aria-hidden />
        <div>
          <div className="barre__titre">Saisie de fin de cycle</div>
          <div className="barre__sous-titre">
            {dateLongue(maintenant)} · {heure(maintenant)}
          </div>
        </div>
      </div>

      <div className="barre__centre">
        {produit && nbEtapes > 0 ? (
          <div className="progression">
            <div className="progression__ligne">
              <span className="progression__etape">
                Étape {indexEtape + 1} / {nbEtapes}
              </span>
              {nomEtape && <span className="progression__reste">{nomEtape}</span>}
            </div>
            <div
              className="progression__piste"
              role="progressbar"
              aria-valuenow={indexEtape + 1}
              aria-valuemin={1}
              aria-valuemax={nbEtapes}
            >
              {/* scaleX plutot que width : l'allongement reste sur le compositeur. */}
              <motion.div
                className="progression__jauge"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: avancement }}
                transition={transitionAdaptee(reduit, { duration: duree.lente, ease: ease.out })}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="barre__droite">
        {produit && (
          <span className="puce" title="Produit en cours de production">
            <span className="puce__point" style={{ background: produit.couleur ?? 'var(--olmix-vert)' }} />
            {produit.nom}
          </span>
        )}
        {operateur && (
          <span className="puce" title="Opérateur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
            {operateur}
            {matricule ? ` · ${matricule}` : ''}
          </span>
        )}
        <IndicateurSync statut={statut} onForcer={onForcerSync} />
        <button
          type="button"
          className="btn btn--fantome btn--icone btn--theme"
          onClick={onBasculerTheme}
          title={theme === 'sombre' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          aria-label={theme === 'sombre' ? 'Passer en thème clair' : 'Passer en thème sombre'}
        >
          {theme === 'sombre' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="btn btn--fantome btn--icone btn--admin"
          onClick={onAdmin}
          title="Mode administrateur"
          aria-label="Mode administrateur"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
