/** Message contextuel (information, alerte, erreur) affiche en haut d'un ecran. */

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { duree, ease, transitionAdaptee, useAnimationsReduites } from '../lib/motion';

export default function Bandeau({
  ton = 'info',
  icone,
  titre,
  children,
  actions,
}: {
  ton?: 'info' | 'alerte' | 'erreur' | 'succes';
  icone?: string;
  titre?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const icones = { info: 'ℹ️', alerte: '⚠️', erreur: '⛔', succes: '✅' } as const;
  const reduit = useAnimationsReduites();
  return (
    <motion.div
      className={`bandeau${ton === 'info' ? '' : ` bandeau--${ton}`}`}
      initial={{ opacity: 0, y: reduit ? 0 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transitionAdaptee(reduit, { duration: duree.base, ease: ease.out })}
    >
      <span className="bandeau__icone" aria-hidden>
        {icone ?? icones[ton]}
      </span>
      <div style={{ minWidth: 0 }}>
        {titre && <div className="bandeau__titre">{titre}</div>}
        {children}
      </div>
      {actions && <div className="bandeau__actions">{actions}</div>}
    </motion.div>
  );
}
