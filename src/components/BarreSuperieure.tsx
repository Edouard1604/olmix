/**
 * Bandeau permanent : identite de l'application, produit et operateur en cours,
 * progression, horloge et etat de synchronisation.
 */

import { useEffect, useState } from 'react';
import type { Produit, StatutSync, Theme } from '@shared/types';
import logoOlmix from '../assets/olmix-logo.png';
import { dateLongue, heure } from '../lib/format';
import Icone from './Icone';
import IndicateurSync from './IndicateurSync';

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

  useEffect(() => {
    const minuterie = setInterval(() => setMaintenant(new Date()), 15_000);
    return () => clearInterval(minuterie);
  }, []);

  const avancement = nbEtapes > 0 ? ((indexEtape + 1) / nbEtapes) * 100 : 0;

  return (
    <header className="barre">
      <div className="barre__marque">
        <img className="barre__logo" src={logoOlmix} alt="Olmix" />
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
              <div className="progression__jauge" style={{ width: `${avancement}%` }} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="barre__droite">
        {produit && (
          <span className="puce" title="Produit en cours de production">
            <span className="puce__point" style={{ background: produit.couleur ?? 'var(--vert-600)' }} />
            {produit.nom}
          </span>
        )}
        {operateur && (
          <span className="puce" title="Opérateur">
            <Icone nom="utilisateur" taille={16} />
            {operateur}
            {matricule ? ` · ${matricule}` : ''}
          </span>
        )}
        <IndicateurSync statut={statut} onForcer={onForcerSync} />
        <button
          type="button"
          className="btn btn--fantome"
          style={{ minHeight: 44, padding: '0 14px' }}
          onClick={onBasculerTheme}
          title={theme === 'sombre' ? 'Passer en thème clair' : 'Passer en thème sombre'}
        >
          <Icone nom={theme === 'sombre' ? 'soleil' : 'lune'} />
        </button>
        <button
          type="button"
          className="btn btn--fantome"
          style={{ minHeight: 44, padding: '0 14px' }}
          onClick={onAdmin}
          title="Mode administrateur"
        >
          <Icone nom="reglages" />
        </button>
      </div>
    </header>
  );
}
