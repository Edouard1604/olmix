/**
 * Pastille d'etat de la synchronisation vers le classeur Excel.
 * Discrete par defaut, elle devient orange des qu'une saisie attend d'etre
 * ecrite : l'operateur sait ainsi que rien n'est perdu.
 */

import type { StatutSync } from '@shared/types';

const LIBELLES: Record<StatutSync['etat'], string> = {
  a_jour: 'Excel à jour',
  ecriture: 'Enregistrement…',
  en_attente: 'En attente',
  erreur: 'Erreur Excel',
};

export default function IndicateurSync({
  statut,
  onForcer,
}: {
  statut: StatutSync;
  onForcer: () => void;
}) {
  const texte =
    statut.etat === 'en_attente' ? `${statut.enAttente} en attente` : LIBELLES[statut.etat];

  const infobulle = [
    statut.message,
    statut.dernierSuccesIso ? `Dernière écriture : ${new Date(statut.dernierSuccesIso).toLocaleString('fr-FR')}` : null,
    'Cliquer pour réessayer maintenant.',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <button type="button" className={`sync sync--${statut.etat}`} title={infobulle} onClick={onForcer}>
      <span className="sync__point" aria-hidden />
      {texte}
    </button>
  );
}
