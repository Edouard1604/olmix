/**
 * Jeu d'icônes en SVG inline.
 *
 * Remplace les émojis utilisés auparavant : ceux-ci dépendent de la police
 * installée sur le poste, changent d'aspect d'une version de Windows à l'autre
 * et ne prennent pas la couleur du texte. Ces tracés héritent de
 * `currentColor`, donc ils suivent le thème clair ou sombre sans réglage.
 */

import type { CSSProperties, ReactNode } from 'react';

const TRACES: Record<string, ReactNode> = {
  coche: <path d="M20 6 9 17l-5-5" />,
  croix: <path d="M18 6 6 18M6 6l12 12" />,
  alerte: (
    <>
      <path d="m12 3.2 9.4 16.3a1 1 0 0 1-.87 1.5H3.47a1 1 0 0 1-.87-1.5Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17.2h.01" />
    </>
  ),
  erreur: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.2h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  succes: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.2 12.3 2.6 2.6 5-5.2" />
    </>
  ),
  recherche: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.6-3.6" />
    </>
  ),
  utilisateur: (
    <>
      <path d="M4.5 20.5v-1a5.5 5.5 0 0 1 5.5-5.5h4a5.5 5.5 0 0 1 5.5 5.5v1" />
      <circle cx="12" cy="7.5" r="4" />
    </>
  ),
  reglages: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.1 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97Z" />
    </>
  ),
  lune: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  soleil: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
    </>
  ),
  corbeille: (
    <path d="M3.5 6h17M9 6V4.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6M18.5 6l-.9 13.8a2 2 0 0 1-2 1.9H8.4a2 2 0 0 1-2-1.9L5.5 6" />
  ),
  crayon: <path d="M12 20.5h8.5M16.4 3.6a2.1 2.1 0 0 1 3 3L7.2 18.8l-4 1 1-4Z" />,
  importer: <path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5M7.5 10.5l4.5 4.5 4.5-4.5M12 15V3" />,
  exporter: <path d="M21 15.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.5M16.5 7.5 12 3 7.5 7.5M12 3v12" />,
  liste: (
    <>
      <path d="M9.5 2.8h5a1 1 0 0 1 1 1v1.9h-7V3.8a1 1 0 0 1 1-1Z" />
      <path d="M15.5 4.8h2.2a2 2 0 0 1 2 2v12.4a2 2 0 0 1-2 2H6.3a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2h2.2" />
      <path d="M8.5 11h7M8.5 15h4.5" />
    </>
  ),
  diagnostic: <path d="M22 12h-4l-3 8.5L9 3.5l-3 8.5H2" />,
  verrou: (
    <>
      <rect x="4" y="10.5" width="16" height="10.5" rx="2" />
      <path d="M7.8 10.5V7.2a4.2 4.2 0 0 1 8.4 0v3.3" />
    </>
  ),
  sauvegarde: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10.5L21 8.5V19a2 2 0 0 1-2 2Z" />
      <path d="M16.5 21v-7.5h-9V21M7.5 3v4.5h7" />
    </>
  ),
  commentaire: (
    <path d="M20.5 11.6a8.2 8.2 0 0 1-8.8 8.2 8.6 8.6 0 0 1-3.7-.9l-4.5 1.6 1.7-4.4a8.2 8.2 0 0 1 6.5-12.7 8.2 8.2 0 0 1 8.8 8.2Z" />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 12h17.6M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" />
    </>
  ),
  dossier: <path d="M3.5 7.2a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v8.6a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" />,
  usine: <path d="M3 21h18M4 21V10l5 3.2V10l5 3.2V10l5 3.2V21M8.5 17.5h1M13 17.5h1M17.5 17.5h1" />,
};

export type NomIcone = keyof typeof TRACES;

export default function Icone({
  nom,
  taille = 20,
  epaisseur = 2,
  className,
  style,
  titre,
}: {
  nom: NomIcone;
  taille?: number;
  epaisseur?: number;
  className?: string;
  style?: CSSProperties;
  /** Renseigné seulement si l'icône porte une information absente du texte. */
  titre?: string;
}) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: 'none', display: 'block', ...style }}
      role={titre ? 'img' : undefined}
      aria-hidden={titre ? undefined : true}
      aria-label={titre}
      focusable="false"
    >
      {titre && <title>{titre}</title>}
      {TRACES[nom]}
    </svg>
  );
}
