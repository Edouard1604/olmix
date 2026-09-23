/**
 * Confirmation animee. Le retour a l'accueil est automatique au bout de
 * quelques secondes pour enchainer les cycles sans intervention ; une jauge
 * en degrade signature materialise le temps restant, et le bouton
 * « Nouvelle saisie » permet de ne pas attendre.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { ResumeEnregistrement } from '@shared/types';
import Bandeau from '../components/Bandeau';
import ChiffresCles from '../components/ChiffresCles';
import Apparition from '../components/motion/Apparition';
import MotifPousse from '../components/motion/MotifPousse';
import Surlignage from '../components/motion/Surlignage';
import TraitDessine from '../components/motion/TraitDessine';
import { heure } from '../lib/format';
import { ease, transitionAdaptee, useAnimationsReduites } from '../lib/motion';

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
  const [enregistreLe] = useState(() => new Date());
  const reduit = useAnimationsReduites();
  /** La jauge part pleine puis se vide seconde par seconde. */
  const [jaugePartie, setJaugePartie] = useState(false);

  useEffect(() => {
    const image = requestAnimationFrame(() => setJaugePartie(true));
    return () => cancelAnimationFrame(image);
  }, []);

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
        initial={{ opacity: 0, y: reduit ? 0 : 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transitionAdaptee(reduit, { duration: 0.65, ease: ease.out })}
      >
        {/* La pousse se dessine (tige, racines, puis feuilles), puis la coche. */}
        <div className="confirmation__embleme" aria-hidden>
          <MotifPousse className="confirmation__pousse" sol={false} delai={0.15} vitesse={0.9} />
          <motion.div
            className="confirmation__coche"
            initial={{ scale: reduit ? 1 : 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              reduit
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 320, damping: 18, delay: 1.05 }
            }
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <TraitDessine d="M5.5 12.5 L10 17 L18.5 7.5" delai={1.2} duree={0.35} />
            </svg>
          </motion.div>
        </div>

        <Apparition auDefilement={false} delai={0.25}>
          <h1 className="confirmation__titre">
            Cycle <Surlignage delai={0.9}>enregistré</Surlignage>
          </h1>
          <p className="confirmation__merci">
            Merci {operateur.split(' ')[0]} — la saisie est conservée et horodatée.
          </p>
        </Apparition>

        <ChiffresCles
          delai={0.45}
          chiffres={[
            { cle: 'produit', sousTitre: 'Produit', texte: produitNom },
            {
              cle: 'heure',
              sousTitre: 'Enregistré à',
              texte: heure(enregistreLe),
              libelle: enregistreLe.toLocaleDateString('fr-FR'),
            },
            {
              cle: 'id',
              sousTitre: 'Identifiant du cycle',
              texte: <span className="confirmation__id">{resume.cycleId}</span>,
            },
            resume.ecritDansExcel
              ? { cle: 'export', sousTitre: 'Export Excel', texte: 'Ligne ajoutée ✓', ton: 'ok' }
              : { cle: 'export', sousTitre: 'Export Excel', texte: 'En attente ⏳', ton: 'alerte' },
          ]}
        />

        {!resume.ecritDansExcel && (
          <Bandeau ton="alerte" titre="Écriture différée">
            {resume.raisonAttente ??
              'Le classeur est momentanément indisponible. La saisie est enregistrée localement et sera ajoutée automatiquement.'}
          </Bandeau>
        )}

        <button type="button" className="btn btn--principal btn--grand" onClick={onTerminer} autoFocus>
          Nouvelle saisie ({Math.max(restant, 0)} s)
          <span className="btn__fleche" aria-hidden>
            →
          </span>
        </button>

        {/* Temps restant avant le retour automatique a l'accueil. */}
        <div
          className="confirmation__jauge"
          style={{ transform: `scaleX(${jaugePartie ? Math.max(restant - 1, 0) / SECONDES_AVANT_RETOUR : 1})` }}
          aria-hidden
        />
      </motion.div>
    </div>
  );
}
