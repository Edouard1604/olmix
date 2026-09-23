/**
 * Bandeau affiche uniquement sur la version web de demonstration.
 *
 * Un visiteur doit comprendre en une phrase ce qu'il a sous les yeux : une
 * vitrine, et non le poste de saisie de l'atelier. Sans cet avertissement, on
 * pourrait croire que les saisies partent vraiment dans le classeur Excel.
 *
 * Le bandeau est en position fixe : il se superpose a l'interface sans en
 * deplacer la mise en page, qui reste donc identique a celle du poste reel.
 */

import { useState } from 'react';
import Icone from './Icone';
import { AnimatePresence, motion } from 'framer-motion';

export default function BandeauDemoWeb() {
  const [visible, setVisible] = useState(true);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 18,
            transform: 'translateX(-50%)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            maxWidth: 'min(760px, calc(100vw - 32px))',
            padding: '13px 18px',
            borderRadius: 'var(--r-m)',
            background: 'var(--alerte-fond)',
            border: '1px solid var(--alerte-bord)',
            color: '#8a5512',
            boxShadow: 'var(--ombre-3)',
            fontSize: 'var(--t-s)',
          }}
        >
          <Icone nom="globe" taille={26} style={{ flex: 'none' }} />
          <div style={{ minWidth: 0 }}>
            <strong>Version web de démonstration.</strong> L'interface et les règles de saisie sont
            celles de l'application réelle, mais les cycles validés restent dans ce navigateur : aucun
            classeur Excel n'est alimenté, et personne d'autre ne voit vos saisies. L'application
            installée en atelier fonctionne hors connexion et écrit dans un classeur cumulatif.
          </div>
          <button
            type="button"
            className="btn btn--fantome"
            style={{ minHeight: 38, padding: '0 12px', flex: 'none', color: 'inherit' }}
            onClick={() => setVisible(false)}
            title="Masquer cet avertissement"
          >
            Masquer
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
