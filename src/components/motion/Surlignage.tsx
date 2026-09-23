/**
 * Mot surligné « demi-texte » du site olmix.com : une bande verte
 * translucide sur la moitié basse du texte, qui se dessine de gauche à
 * droite. À utiliser avec parcimonie.
 */

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { duree, ease, transitionAdaptee, useAnimationsReduites } from '../../lib/motion';

export default function Surlignage({
  children,
  actif = true,
  delai = 0.15,
}: {
  children: ReactNode;
  actif?: boolean;
  delai?: number;
}) {
  const reduit = useAnimationsReduites();
  return (
    <span className="surlignage">
      <motion.span
        className="surlignage__bande"
        aria-hidden
        initial={{ scaleX: reduit ? 1 : 0, opacity: reduit ? 0 : 1 }}
        animate={actif ? { scaleX: 1, opacity: 1 } : { scaleX: reduit ? 1 : 0, opacity: reduit ? 0 : 1 }}
        transition={transitionAdaptee(reduit, { duration: duree.lente, delay: actif ? delai : 0, ease: ease.inOut })}
      />
      <span className="surlignage__texte">{children}</span>
    </span>
  );
}
