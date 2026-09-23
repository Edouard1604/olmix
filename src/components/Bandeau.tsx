/** Message contextuel (information, alerte, erreur) affiche en haut d'un ecran. */

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Icone, { type NomIcone } from './Icone';

export default function Bandeau({
  ton = 'info',
  icone,
  titre,
  children,
  actions,
}: {
  ton?: 'info' | 'alerte' | 'erreur' | 'succes';
  icone?: NomIcone;
  titre?: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const icones: Record<'info' | 'alerte' | 'erreur' | 'succes', NomIcone> = {
    info: 'info',
    alerte: 'alerte',
    erreur: 'erreur',
    succes: 'succes',
  };
  return (
    <motion.div
      className={`bandeau${ton === 'info' ? '' : ` bandeau--${ton}`}`}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <span className="bandeau__icone" aria-hidden>
        <Icone nom={icone ?? icones[ton]} taille={24} />
      </span>
      <div style={{ minWidth: 0 }}>
        {titre && <div className="bandeau__titre">{titre}</div>}
        {children}
      </div>
      {actions && <div className="bandeau__actions">{actions}</div>}
    </motion.div>
  );
}
