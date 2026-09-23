/**
 * Motif de pousse original (tige, trois feuilles, racines) dessiné au
 * trait. Il « pousse » : la tige et les racines d'abord, puis les feuilles
 * de bas en haut. Ce n'est pas le logo Olmix, seulement un rappel de son
 * univers végétal.
 *
 * Le tracé est une animation CSS (stroke-dashoffset) et non une animation
 * JavaScript : il est souvent joué au démarrage, quand le fil principal est
 * chargé, et le navigateur le cale alors sur l'horloge réelle au lieu de
 * le ralentir. En mode « animations réduites », la règle globale coupe
 * l'animation et le motif s'affiche d'emblée entier.
 */

import type { CSSProperties } from 'react';

const SOL = 'M30 112 H90';
const TIGE = 'M60 112 C60 94 56 78 60 60 S64 38 60 26';
const RACINES = [
  'M60 112 C56 124 47 132 38 144',
  'M60 112 C60 126 58 138 61 152',
  'M60 112 C65 124 74 132 84 140',
];
/** De bas en haut : l'ordre d'apparition. */
const FEUILLES = [
  'M59 86 C48 85 36 77 30 64 C43 63 54 72 59 86 Z',
  'M61 68 C70 61 82 55 95 53 C89 64 77 70 61 68 Z',
  'M60 27 C54 21 52 13 56 5 C63 11 64 19 60 27 Z',
];
const NERVURES = ['M58 84 C50 79 42 73 34 66', 'M63 67 C72 62 81 58 91 55'];

interface Proprietes {
  className?: string;
  style?: CSSProperties;
  /** Faux : motif fixe, sans animation. */
  anime?: boolean;
  delai?: number;
  /** Multiplicateur de durée (1 ≈ 1,1 s au total). */
  vitesse?: number;
  sol?: boolean;
  racines?: boolean;
}

export default function MotifPousse({
  className,
  style,
  anime = true,
  delai = 0,
  vitesse = 1,
  sol = true,
  racines = true,
}: Proprietes) {
  const trait = (d: string, classe: string, depart: number, duree: number) => (
    <path
      key={d}
      d={d}
      pathLength={1}
      className={`pousse__trait ${classe}`}
      style={{ animationDelay: `${delai + depart * vitesse}s`, animationDuration: `${duree * vitesse}s` }}
    />
  );

  return (
    <svg
      className={`pousse${anime ? ' pousse--anime' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      viewBox="0 0 120 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {sol && trait(SOL, 'pousse__sol', 0, 0.4)}
      {racines && RACINES.map((d, i) => trait(d, 'pousse__racine', 0.12 + i * 0.06, 0.5))}
      {trait(TIGE, 'pousse__tige', 0.08, 0.55)}
      {FEUILLES.map((d, i) => trait(d, 'pousse__feuille', 0.42 + i * 0.12, 0.42))}
      {NERVURES.map((d, i) => trait(d, 'pousse__nervure', 0.6 + i * 0.12, 0.3))}
    </svg>
  );
}
