/**
 * Reglages : emplacement du classeur, nommage des feuilles et tableaux,
 * sauvegardes, et mot de passe administrateur.
 */

import { useState } from 'react';
import type { Reglages } from '@shared/types';
import Bandeau from '../../components/Bandeau';

interface Proprietes {
  reglages: Reglages;
  motDePasseParDefaut: boolean;
  onEnregistrer: (partiel: Partial<Reglages>) => Promise<string | null>;
  onParcourir: () => Promise<string | null>;
  onChangerMotDePasse: (ancien: string, nouveau: string) => Promise<string | null>;
}

export default function PanneauReglages({
  reglages,
  motDePasseParDefaut,
  onEnregistrer,
  onParcourir,
  onChangerMotDePasse,
}: Proprietes) {
  const [brouillon, setBrouillon] = useState<Reglages>(reglages);
  const [message, setMessage] = useState<{ ton: 'succes' | 'erreur'; texte: string } | null>(null);
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const modifie = JSON.stringify(brouillon) !== JSON.stringify(reglages);

  const enregistrer = async () => {
    const erreur = await onEnregistrer({
      cheminExcel: brouillon.cheminExcel,
      nomFeuilleSaisies: brouillon.nomFeuilleSaisies,
      nomTableSaisies: brouillon.nomTableSaisies,
      nomFeuilleReponses: brouillon.nomFeuilleReponses,
      nomTableReponses: brouillon.nomTableReponses,
      nomFeuilleQuestions: brouillon.nomFeuilleQuestions,
      nomTableQuestions: brouillon.nomTableQuestions,
      sauvegardeQuotidienne: brouillon.sauvegardeQuotidienne,
      retentionSauvegardesJours: brouillon.retentionSauvegardesJours,
      intervalleFileAttenteMs: brouillon.intervalleFileAttenteMs,
    });
    setMessage(
      erreur ? { ton: 'erreur', texte: erreur } : { ton: 'succes', texte: 'Réglages enregistrés.' },
    );
  };

  const parcourir = async () => {
    const chemin = await onParcourir();
    if (chemin) setBrouillon({ ...brouillon, cheminExcel: chemin });
  };

  const changerMotDePasse = async () => {
    if (nouveau !== confirmation) {
      setMessage({ ton: 'erreur', texte: 'La confirmation ne correspond pas au nouveau mot de passe.' });
      return;
    }
    const erreur = await onChangerMotDePasse(ancien, nouveau);
    setMessage(
      erreur ? { ton: 'erreur', texte: erreur } : { ton: 'succes', texte: 'Mot de passe modifié.' },
    );
    if (!erreur) {
      setAncien('');
      setNouveau('');
      setConfirmation('');
    }
  };

  return (
    <div className="carte admin__panneau">
      {message && (
        <Bandeau ton={message.ton} titre={message.ton === 'succes' ? 'Enregistré' : 'Erreur'}>
          <div style={{ whiteSpace: 'pre-line' }}>{message.texte}</div>
        </Bandeau>
      )}

      {motDePasseParDefaut && (
        <Bandeau ton="alerte" titre="Mot de passe administrateur par défaut">
          Le mot de passe d'usine est toujours actif. Changez-le dans la section « Sécurité » ci-dessous.
        </Bandeau>
      )}

      <div className="admin__section">
        <div className="admin__titre-section">Classeur Excel cumulatif</div>
        <p style={{ fontSize: 'var(--t-s)', color: 'var(--texte-doux)', marginBottom: 14 }}>
          Un seul fichier, enrichi à chaque validation. Placez-le dans un dossier réseau ou OneDrive
          partagé pour que Power BI puisse s'y connecter.
        </p>
        <div className="admin__ligne">
          <label htmlFor="r-chemin">Chemin complet</label>
          <div className="rangee" style={{ flexWrap: 'nowrap' }}>
            <input
              id="r-chemin"
              className="saisie saisie--compacte"
              style={{ flex: 1 }}
              value={brouillon.cheminExcel}
              onChange={(e) => setBrouillon({ ...brouillon, cheminExcel: e.target.value })}
            />
            <button type="button" className="btn btn--secondaire" style={{ minHeight: 46 }} onClick={parcourir}>
              Parcourir…
            </button>
          </div>
        </div>
      </div>

      <div className="admin__section">
        <div className="admin__titre-section">Nommage des feuilles et tableaux</div>
        <p style={{ fontSize: 'var(--t-s)', color: 'var(--texte-doux)', marginBottom: 14 }}>
          Ces noms sont ceux que Power BI voit. Les modifier sur un classeur déjà alimenté crée de
          nouvelles feuilles vides à côté des anciennes : à ne faire qu'avant la mise en service.
        </p>
        {(
          [
            ['Feuille « une ligne par cycle »', 'nomFeuilleSaisies'],
            ['Tableau correspondant', 'nomTableSaisies'],
            ['Feuille « une ligne par réponse »', 'nomFeuilleReponses'],
            ['Tableau correspondant', 'nomTableReponses'],
            ['Feuille catalogue des questions', 'nomFeuilleQuestions'],
            ['Tableau correspondant', 'nomTableQuestions'],
          ] as const
        ).map(([libelle, cle]) => (
          <div className="admin__ligne" key={cle}>
            <label htmlFor={`r-${cle}`}>{libelle}</label>
            <input
              id={`r-${cle}`}
              className="saisie saisie--compacte"
              value={brouillon[cle]}
              onChange={(e) => setBrouillon({ ...brouillon, [cle]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="admin__section">
        <div className="admin__titre-section">Sauvegardes et file d'attente</div>
        <div className="admin__ligne">
          <label>Sauvegarde quotidienne</label>
          <label className="rangee" style={{ gap: 9, fontSize: 'var(--t-s)', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={brouillon.sauvegardeQuotidienne}
              onChange={(e) => setBrouillon({ ...brouillon, sauvegardeQuotidienne: e.target.checked })}
            />
            Copier le classeur une fois par jour avant la première écriture
          </label>
        </div>
        <div className="admin__ligne">
          <label htmlFor="r-retention">Conserver les sauvegardes (jours)</label>
          <input
            id="r-retention"
            className="saisie saisie--compacte"
            type="number"
            min={1}
            max={365}
            value={brouillon.retentionSauvegardesJours}
            onChange={(e) => setBrouillon({ ...brouillon, retentionSauvegardesJours: Number(e.target.value) })}
          />
        </div>
        <div className="admin__ligne">
          <label htmlFor="r-intervalle">Nouvelle tentative d'écriture (secondes)</label>
          <input
            id="r-intervalle"
            className="saisie saisie--compacte"
            type="number"
            min={5}
            max={600}
            value={Math.round(brouillon.intervalleFileAttenteMs / 1000)}
            onChange={(e) =>
              setBrouillon({ ...brouillon, intervalleFileAttenteMs: Math.max(5, Number(e.target.value)) * 1000 })
            }
          />
        </div>
      </div>

      <div className="rangee">
        <button type="button" className="btn btn--secondaire" onClick={() => setBrouillon(reglages)} disabled={!modifie}>
          Annuler
        </button>
        <button type="button" className="btn btn--principal pousser" onClick={enregistrer} disabled={!modifie}>
          Enregistrer les réglages
        </button>
      </div>

      <div className="admin__section">
        <div className="admin__titre-section">Sécurité — mot de passe administrateur</div>
        <div className="admin__ligne">
          <label htmlFor="mdp-ancien">Mot de passe actuel</label>
          <input
            id="mdp-ancien"
            className="saisie saisie--compacte"
            type="password"
            value={ancien}
            onChange={(e) => setAncien(e.target.value)}
          />
        </div>
        <div className="admin__ligne">
          <label htmlFor="mdp-nouveau">Nouveau mot de passe</label>
          <input
            id="mdp-nouveau"
            className="saisie saisie--compacte"
            type="password"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
          />
        </div>
        <div className="admin__ligne">
          <label htmlFor="mdp-confirm">Confirmation</label>
          <input
            id="mdp-confirm"
            className="saisie saisie--compacte"
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn btn--secondaire"
          onClick={changerMotDePasse}
          disabled={!ancien || nouveau.length < 4}
        >
          Changer le mot de passe
        </button>
      </div>
    </div>
  );
}
