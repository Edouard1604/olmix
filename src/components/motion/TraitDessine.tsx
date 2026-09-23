/**
 * Trait SVG qui se dessine (pathLength 0 → 1), et se retire si `actif`
 * repasse à faux. À placer dans un <svg> portant stroke et fill.
 */

import { motion, type SVGMotionProps } from 'framer-motion';
import { duree as durees, ease, FONDU_REDUIT, useAnimationsReduites } from '../../lib/motion';

interface Proprietes extends Omit<SVGMotionProps<SVGPathElement>, 'd'> {
  d: string;
  actif?: boolean;
  delai?: number;
  duree?: number;
  /** Vrai : trait fixe, sans animation (filigranes, rendus statiques). */
  statique?: boolean;
}

export default function TraitDessine({
  d,
  actif = true,
  delai = 0,
  duree = durees.lente,
  statique = false,
  ...reste
}: Proprietes) {
  const reduit = useAnimationsReduites();

  if (statique) return <motion.path d={d} {...reste} />;

  return (
    <motion.path
      d={d}
      // Invisible tant que la longueur est nulle : un bout arrondi laisserait un point.
      initial={{ pathLength: reduit ? 1 : 0, opacity: 0 }}
      animate={actif ? { pathLength: 1, opacity: 1 } : { pathLength: reduit ? 1 : 0, opacity: 0 }}
      transition={
        reduit
          ? { duration: FONDU_REDUIT }
          : {
              pathLength: { duration: duree, delay: delai, ease: ease.inOut },
              opacity: { duration: 0.05, delay: actif ? delai : duree },
            }
      }
      {...reste}
    />
  );
}
