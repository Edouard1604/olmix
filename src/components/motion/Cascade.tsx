/**
 * Enfants qui apparaissent l'un après l'autre (0 / 150 / 300 ms…), comme
 * les blocs du site olmix.com. Chaque enfant est enveloppé dans une
 * <Apparition> : le conteneur garde sa mise en page (grille, pile…).
 */

import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react';
import { cascade as pasParDefaut, duree } from '../../lib/motion';
import Apparition from './Apparition';

interface Proprietes {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Classe de l'enveloppe de chaque enfant. */
  classeElement?: string;
  /** Décalage entre deux enfants (s). */
  pas?: number;
  /** Délai avant le premier enfant (s). */
  delaiInitial?: number;
  /** Plafond du décalage cumulé : une longue liste ne doit pas traîner. */
  delaiMax?: number;
  dureeApparition?: number;
  decalage?: number;
  auDefilement?: boolean;
}

export default function Cascade({
  children,
  className,
  style,
  classeElement,
  pas = pasParDefaut,
  delaiInitial = 0,
  delaiMax = 0.6,
  dureeApparition = duree.lente,
  decalage,
  auDefilement = true,
}: Proprietes) {
  return (
    <div className={className} style={style}>
      {Children.toArray(children).map((enfant, index) => (
        <Apparition
          key={isValidElement(enfant) && enfant.key != null ? enfant.key : index}
          className={classeElement}
          delai={delaiInitial + Math.min(index * pas, delaiMax)}
          dureeApparition={dureeApparition}
          decalage={decalage}
          auDefilement={auDefilement}
        >
          {enfant}
        </Apparition>
      ))}
    </div>
  );
}
