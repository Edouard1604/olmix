/**
 * Mini-écran d'ouverture (≤ 1,2 s) : la pousse se dessine, le logo
 * apparaît en fondu. Joué au premier lancement de la journée seulement,
 * jamais deux fois dans la même session, et passable d'un clic ou d'une
 * touche — la touche n'est pas interceptée : elle arrive au champ
 * « Nom de l'opérateur » qui a déjà le focus.
 *
 * Tout le tracé est en CSS : au démarrage le fil principal est occupé
 * (configuration, premier rendu de l'accueil) et une animation JavaScript
 * y prendrait du retard.
 */

import { useEffect } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import { useAnimationsReduites } from '../../lib/motion';
import LogoOlmix from './LogoOlmix';
import MotifPousse from './MotifPousse';

const CLE_JOUR = 'olmix.splash.jour';
const DUREE_MS = 1200;

let dejaJoueDansLaSession = false;

/** Vrai au premier appel de la journée ; marque la journée comme vue. */
export function splashAttendu(): boolean {
  if (dejaJoueDansLaSession) return false;
  dejaJoueDansLaSession = true;
  try {
    const jour = new Date().toDateString();
    if (window.localStorage.getItem(CLE_JOUR) === jour) return false;
    window.localStorage.setItem(CLE_JOUR, jour);
    return true;
  } catch {
    return false;
  }
}

export default function Splash({ visible, onFin }: { visible: boolean; onFin: () => void }) {
  const reduit = useAnimationsReduites();

  useEffect(() => {
    if (!visible) return;
    if (reduit) {
      onFin();
      return;
    }
    // Le compte part de la premiere image affichee, pas du montage.
    let minuterie = 0;
    const image = requestAnimationFrame(() => {
      minuterie = window.setTimeout(onFin, DUREE_MS);
    });
    window.addEventListener('keydown', onFin);
    return () => {
      cancelAnimationFrame(image);
      window.clearTimeout(minuterie);
      window.removeEventListener('keydown', onFin);
    };
  }, [visible, reduit, onFin]);

  return <AnimatePresence>{visible && !reduit && <Contenu key="splash" onFin={onFin} />}</AnimatePresence>;
}

function Contenu({ onFin }: { onFin: () => void }) {
  // Pendant sa disparition, l'ecran ne doit plus intercepter les clics.
  const present = useIsPresent();

  return (
    <motion.div
      className="splash"
      style={{ pointerEvents: present ? 'auto' : 'none' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onPointerDown={onFin}
    >
      <MotifPousse className="splash__pousse" vitesse={0.85} />
      <div className="splash__logo">
        <LogoOlmix hauteur={112} />
      </div>
    </motion.div>
  );
}
