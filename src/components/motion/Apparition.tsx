/**
 * Apparition « fade-in-from-bottom » du site olmix.com : fondu et montée
 * de 24 px, déclenchés à l'entrée dans la zone visible.
 * L'élément reste cliquable pendant toute l'animation.
 */

import { motion, type HTMLMotionProps } from 'framer-motion';
import { duree, ease, transitionAdaptee, useAnimationsReduites } from '../../lib/motion';

interface Proprietes extends HTMLMotionProps<'div'> {
  /** Délai avant l'apparition (s). */
  delai?: number;
  /** Amplitude de la montée (px). */
  decalage?: number;
  /** Durée de l'apparition (s). */
  dureeApparition?: number;
  /** Faux : l'animation part au montage plutôt qu'à l'entrée dans la vue. */
  auDefilement?: boolean;
}

export default function Apparition({
  delai = 0,
  decalage = 24,
  dureeApparition = duree.lente,
  auDefilement = true,
  children,
  ...reste
}: Proprietes) {
  const reduit = useAnimationsReduites();
  const cible = { opacity: 1, y: 0 };
  const declenchement = auDefilement
    ? { whileInView: cible, viewport: { once: true, amount: 0.1 } }
    : { animate: cible };

  return (
    <motion.div
      initial={{ opacity: 0, y: reduit ? 0 : decalage }}
      {...declenchement}
      transition={transitionAdaptee(reduit, { duration: dureeApparition, delay: delai, ease: ease.out })}
      {...reste}
    >
      {children}
    </motion.div>
  );
}
