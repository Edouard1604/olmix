/**
 * Système de mouvement, calé sur les sensations du site olmix.com
 * (thème Salient) : apparitions « fade-in-from-bottom » en cascade,
 * compteurs, traits qui se dessinent.
 *
 * Deux interrupteurs coupent le décoratif : la préférence système
 * `prefers-reduced-motion` et le réglage « Animations réduites » de
 * l'administration. Dans les deux cas, il ne reste que des fondus courts.
 */

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { Transition } from 'framer-motion';

type Courbe = [number, number, number, number];

// Courbes relevées sur olmix.com
export const ease = {
  out: [0.3, 1, 0.3, 1] as Courbe, // --nectar-cubic-bezier-out
  doux: [0.25, 1, 0.33, 1] as Courbe, // transitions boutons/survols
  inOut: [0.76, 0, 0.24, 1] as Courbe, // --nectar-cubic-bezier-in-out
};
export const duree = { rapide: 0.2, base: 0.45, lente: 0.65, scene: 0.8 };
export const cascade = 0.15; // décalage entre éléments successifs

/** Durée maximale d'un fondu lorsque les animations sont réduites. */
export const FONDU_REDUIT = 0.15;

/* ------------------------------------------------------------------ */

interface EtatMouvement {
  /** Réglage « Animations réduites » (Admin → Réglages). */
  reglageReduit: boolean;
  definirReglage: (reduit: boolean) => void;
}

export const useMouvement = create<EtatMouvement>((set) => ({
  reglageReduit: false,
  definirReglage: (reglageReduit) => set({ reglageReduit }),
}));

const REQUETE_SYSTEME = '(prefers-reduced-motion: reduce)';

function systemeReduit(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(REQUETE_SYSTEME).matches;
}

/** Vrai si le système OU le réglage demandent des animations réduites. */
export function useAnimationsReduites(): boolean {
  const reglage = useMouvement((e) => e.reglageReduit);
  const [systeme, setSysteme] = useState(systemeReduit);

  useEffect(() => {
    const requete = window.matchMedia(REQUETE_SYSTEME);
    const surChangement = () => setSysteme(requete.matches);
    requete.addEventListener('change', surChangement);
    return () => requete.removeEventListener('change', surChangement);
  }, []);

  return reglage || systeme;
}

/**
 * Transition adaptée au mode courant : la transition demandée en temps
 * normal, un fondu court sans délai en mode réduit.
 */
export function transitionAdaptee(reduit: boolean, normale: Transition): Transition {
  return reduit ? { duration: FONDU_REDUIT, ease: 'linear' } : normale;
}
