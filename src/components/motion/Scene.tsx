/**
 * Scène animée (écran ou étape) : l'ancienne sort d'un côté pendant que
 * la nouvelle entre de l'autre, en chevauchement — l'opérateur n'attend
 * jamais la fin d'une sortie pour agir.
 *
 * Pendant sa sortie, la scène devient `inert` : plus de clic, plus de
 * focus, donc aucune frappe ne peut modifier l'étape qu'on vient de
 * quitter.
 */

import { forwardRef, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, useIsPresent, type Variants } from 'framer-motion';
import { duree, ease, FONDU_REDUIT, useAnimationsReduites } from '../../lib/motion';

interface Proprietes {
  children: ReactNode;
  className?: string;
  /** 1 : vers l'avant (entrée par la droite) ; -1 : retour. */
  direction: number;
  /** Amplitude du glissement (px). */
  decalage?: number;
}

const Scene = forwardRef<HTMLDivElement, Proprietes>(function Scene(
  { children, className, direction, decalage = 56 },
  refExterne,
) {
  const present = useIsPresent();
  const reduit = useAnimationsReduites();
  const local = useRef<HTMLDivElement | null>(null);

  const attacher = useCallback(
    (element: HTMLDivElement | null) => {
      local.current = element;
      if (typeof refExterne === 'function') refExterne(element);
      else if (refExterne) refExterne.current = element;
    },
    [refExterne],
  );

  useEffect(() => {
    if (local.current) local.current.inert = !present;
  }, [present]);

  const variantes: Variants = reduit
    ? {
        entree: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: FONDU_REDUIT } },
        sortie: { opacity: 0, transition: { duration: FONDU_REDUIT } },
      }
    : {
        entree: (d: number) => ({ opacity: 0, x: d * decalage }),
        visible: { opacity: 1, x: 0, transition: { duration: duree.base, ease: ease.out } },
        sortie: (d: number) => ({
          opacity: 0,
          x: d * -decalage,
          transition: { duration: duree.rapide + 0.05, ease: ease.inOut },
        }),
      };

  return (
    <motion.div
      ref={attacher}
      className={className}
      custom={direction}
      variants={variantes}
      initial="entree"
      animate="visible"
      exit="sortie"
    >
      {children}
    </motion.div>
  );
});

export default Scene;
