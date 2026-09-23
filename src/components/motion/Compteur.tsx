/**
 * Chiffre qui compte jusqu'à sa valeur, comme les « milestones » du site
 * olmix.com : ease-out d'environ 1,2 s avec un léger flou de mouvement au
 * départ. Le texte est écrit directement dans le DOM : aucun rendu React
 * par image.
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';
import { ease, useAnimationsReduites } from '../../lib/motion';

interface Proprietes {
  valeur: number;
  decimales?: number;
  /** Durée du comptage (s). */
  duree?: number;
  delai?: number;
  className?: string;
}

export default function Compteur({ valeur, decimales = 0, duree = 1.2, delai = 0, className }: Proprietes) {
  const reduit = useAnimationsReduites();
  const noeud = useRef<HTMLSpanElement>(null);
  const affichee = useRef(reduit ? valeur : 0);
  const visible = useInView(noeud, { once: true, amount: 0.5 });

  const formater = (n: number) =>
    n.toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

  useLayoutEffect(() => {
    if (noeud.current) noeud.current.textContent = formater(affichee.current);
    // Premier affichage uniquement : la suite est pilotee par l'animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const element = noeud.current;
    if (!element) return;
    if (reduit) {
      affichee.current = valeur;
      element.textContent = formater(valeur);
      return;
    }
    if (!visible) return;

    const depart = affichee.current;
    const comptage = animate(depart, valeur, {
      duration: duree,
      delay: delai,
      ease: ease.out,
      onUpdate: (v) => {
        affichee.current = v;
        element.textContent = formater(v);
      },
    });
    const flou =
      depart === 0 && valeur !== 0
        ? animate(element, { filter: ['blur(3px)', 'blur(0px)'] }, { duration: duree * 0.45, delay: delai, ease: 'easeOut' })
        : null;
    return () => {
      comptage.stop();
      flou?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeur, visible, reduit, duree, delai, decimales]);

  return (
    <span className={`compteur${className ? ` ${className}` : ''}`}>
      <span ref={noeud} aria-hidden />
      <span className="sr-only">{formater(valeur)}</span>
    </span>
  );
}
