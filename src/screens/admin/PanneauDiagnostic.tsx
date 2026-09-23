/**
 * Diagnostic : emplacements, etat de la synchronisation, dernieres saisies et
 * sauvegardes disponibles. C'est le premier ecran a ouvrir en cas de doute.
 */

import type { Sauvegarde } from '@shared/api';
import type { Cycle, InfosApplication, StatutSync } from '@shared/types';
import { dateHeure, octets } from '../../lib/format';

interface Proprietes {
  infos: InfosApplication | null;
  statut: StatutSync;
  cycles: Cycle[];
  sauvegardes: Sauvegarde[];
  onOuvrirDossier: (cible: 'excel' | 'donnees' | 'sauvegardes' | 'config') => void;
  onOuvrirClasseur: () => void;
  onForcerSync: () => void;
}

export default function PanneauDiagnostic({
  infos,
  statut,
  cycles,
  sauvegardes,
  onOuvrirDossier,
  onOuvrirClasseur,
  onForcerSync,
}: Proprietes) {
  return (
    <div className="carte admin__panneau">
      <div className="admin__section">
        <div className="admin__titre-section">Emplacements</div>
        <Ligne libelle="Version de l'application" valeur={infos?.version ?? '—'} />
        <Ligne
          libelle="Classeur Excel"
          valeur={infos?.cheminExcel ?? '—'}
          complement={infos?.excelExiste ? 'présent' : 'sera créé à la première validation'}
          action={
            <>
              <button type="button" className="btn btn--fantome" onClick={onOuvrirClasseur}>
                Ouvrir
              </button>
              <button type="button" className="btn btn--fantome" onClick={() => onOuvrirDossier('excel')}>
                Dossier
              </button>
            </>
          }
        />
        <Ligne
          libelle="Configuration produits"
          valeur={infos?.cheminConfig ?? '—'}
          action={
            <button type="button" className="btn btn--fantome" onClick={() => onOuvrirDossier('config')}>
              Dossier
            </button>
          }
        />
        <Ligne
          libelle="Données locales"
          valeur={infos?.dossierDonnees ?? '—'}
          action={
            <button type="button" className="btn btn--fantome" onClick={() => onOuvrirDossier('donnees')}>
              Dossier
            </button>
          }
        />
      </div>

      <div className="admin__section">
        <div className="rangee">
          <div className="admin__titre-section" style={{ margin: 0 }}>
            Synchronisation Excel
          </div>
          <button type="button" className="btn btn--secondaire pousser" onClick={onForcerSync}>
            Réessayer maintenant
          </button>
        </div>
        <Ligne libelle="État" valeur={statut.etat.replace('_', ' ')} />
        <Ligne libelle="Saisies en attente" valeur={String(statut.enAttente)} />
        <Ligne
          libelle="Dernière écriture réussie"
          valeur={statut.dernierSuccesIso ? dateHeure(statut.dernierSuccesIso) : 'aucune'}
        />
        {statut.message && <Ligne libelle="Dernier message" valeur={statut.message} />}
      </div>

      <div className="admin__section">
        <div className="admin__titre-section">20 dernières saisies enregistrées localement</div>
        {cycles.length === 0 ? (
          <p style={{ color: 'var(--texte-doux)', fontSize: 'var(--t-s)' }}>Aucune saisie pour le moment.</p>
        ) : (
          <table className="recap__table">
            <tbody>
              {cycles.slice(0, 20).map((cycle) => (
                <tr key={cycle.id}>
                  <td className="recap__q" style={{ width: '34%', fontFamily: 'ui-monospace, Consolas, monospace' }}>
                    {cycle.id}
                  </td>
                  <td style={{ fontSize: 'var(--t-s)' }}>
                    <strong>{cycle.produitNom}</strong> — {cycle.operateur}
                    <br />
                    <span style={{ color: 'var(--texte-doux)' }}>{dateHeure(cycle.finIso)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin__section">
        <div className="rangee">
          <div className="admin__titre-section" style={{ margin: 0 }}>
            Sauvegardes quotidiennes ({sauvegardes.length})
          </div>
          <button type="button" className="btn btn--secondaire pousser" onClick={() => onOuvrirDossier('sauvegardes')}>
            Ouvrir le dossier
          </button>
        </div>
        {sauvegardes.length === 0 ? (
          <p style={{ color: 'var(--texte-doux)', fontSize: 'var(--t-s)' }}>Aucune sauvegarde pour le moment.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--t-s)' }}>
            {sauvegardes.slice(0, 12).map((s) => (
              <li key={s.nom}>
                {s.nom} — {octets(s.taille)} — {dateHeure(s.dateIso)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Ligne({
  libelle,
  valeur,
  complement,
  action,
}: {
  libelle: string;
  valeur: string;
  complement?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin__ligne">
      <label>{libelle}</label>
      <div className="rangee" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 'var(--t-s)',
              fontWeight: 600,
              overflowWrap: 'anywhere',
              fontFamily: valeur.includes('\\') || valeur.includes('/') ? 'ui-monospace, Consolas, monospace' : undefined,
            }}
          >
            {valeur}
          </div>
          {complement && (
            <div style={{ fontSize: 'var(--t-xs)', color: 'var(--texte-doux)' }}>{complement}</div>
          )}
        </div>
        {action && <div className="rangee" style={{ gap: 6, flex: 'none' }}>{action}</div>}
      </div>
    </div>
  );
}
