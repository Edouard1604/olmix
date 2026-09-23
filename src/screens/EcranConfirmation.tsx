/**
 * Confirmation animee. Le retour a l'accueil est automatique au bout de
 * quelques secondes pour enchainer les cycles sans intervention.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ResumeEnregistrement } from '@shared/types';
import Bandeau from '../components/Bandeau';

const SECONDES_AVANT_RETOUR = 8;

export default function EcranConfirmation({
  resume,
  produitNom,
  operateur,
  onTerminer,
}: {
  resume: ResumeEnregistrement;
  produitNom: string;
  operateur: string;
  onTerminer: () => void;
}) {
  const [restant, setRestant] = useState(SECONDES_AVANT_RETOUR);

  useEffect(() => {
    const minuterie = setInterval(() => setRestant((r) => r - 1), 1000);
    return () => clearInterval(minuterie);
  }, []);

  useEffect(() => {
    if (restant <= 0) onTerminer();
  }, [restant, onTerminer]);

  return (
    <div className="confirmation">
      <motion.div
        className="carte confirmation__carte"
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <motion.div
          className="confirmation__pastille"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
        >
          <svg className="confirmation__coche" viewBox="0 0 52 52" aria-hidden>
            <path d="M14 27 L23 36 L39 18" />
          </svg>
        </motion.div>

        <h1 className="titre-ecran" style={{ fontSize: 'var(--t-2xl)' }}>
          Cycle enregistré
        </h1>
        <p className="sous-titre-ecran" style={{ fontSize: 'var(--t-m)' }}>
          Merci {operateur.split(' ')[0]} — la saisie est conservée et horodatée.
        </p>

        <div className="confirmation__details">
          <div className="confirmation__ligne">
            <span>Identifiant du cycle</span>
            <span style={{ fontFamily: 'ui-monospace, Consolas, monospace' }}>{resume.cycleId}</span>
          </div>
          <div className="confirmation__ligne">
            <span>Produit</span>
            <span>{produitNom}</span>
          </div>
          <div className="confirmation__ligne">
            <span>Enregistré le</span>
            <span>{new Date().toLocaleString('fr-FR')}</span>
          </div>
          <div className="confirmation__ligne">
            <span>Export Excel</span>
            <span style={{ color: resume.ecritDansExcel ? 'var(--succes-texte)' : 'var(--alerte-texte)' }}>
              {resume.ecritDansExcel ? 'Ligne ajoutée' : 'En attente'}
            </span>
          </div>
        </div>

        {!resume.ecritDansExcel && (
          <Bandeau ton="alerte" titre="Écriture différée">
            {resume.raisonAttente ??
              'Le classeur est momentanément indisponible. La saisie est enregistrée localement et sera ajoutée automatiquement.'}
          </Bandeau>
        )}

        <button type="button" className="btn btn--principal btn--grand" onClick={onTerminer} autoFocus>
          Nouvelle saisie ({restant} s)
        </button>
      </motion.div>
    </div>
  );
}
