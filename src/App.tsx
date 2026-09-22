/**
 * Orchestration de l'application : chargement de la configuration, theme,
 * etat de synchronisation, sauvegarde du brouillon et transitions entre ecrans.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ConfigurationChargee } from '@shared/api';
import type { Brouillon, Produit, ResumeEnregistrement, StatutSync, Theme } from '@shared/types';
import { useSession, useValidationEtape } from './state/useSession';
import BarreSuperieure from './components/BarreSuperieure';
import Bandeau from './components/Bandeau';
import EcranAccueil from './screens/EcranAccueil';
import EcranFormulaire from './screens/EcranFormulaire';
import EcranRecapitulatif from './screens/EcranRecapitulatif';
import EcranConfirmation from './screens/EcranConfirmation';
import EcranAdmin from './screens/EcranAdmin';

const STATUT_INITIAL: StatutSync = { etat: 'a_jour', enAttente: 0, dernierSuccesIso: null, message: null };

/** Glissement horizontal entre les ecrans, dans le sens de la navigation. */
const transitions = {
  initial: (direction: number) => ({ opacity: 0, x: direction * 42 }),
  animate: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -42 }),
};

export default function App() {
  const session = useSession();
  const validation = useValidationEtape();

  const [chargement, setChargement] = useState(true);
  const [config, setConfig] = useState<ConfigurationChargee | null>(null);
  const [erreurConfig, setErreurConfig] = useState<string | null>(null);
  const [statut, setStatut] = useState<StatutSync>(STATUT_INITIAL);
  const [theme, setTheme] = useState<Theme>('clair');
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [indexMaxAtteint, setIndexMaxAtteint] = useState(0);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreurSoumission, setErreurSoumission] = useState<string | null>(null);
  const [resume, setResume] = useState<ResumeEnregistrement | null>(null);

  const minuterieBrouillon = useRef<number | null>(null);

  /* ---------------- Chargement initial ---------------- */

  const rechargerConfiguration = useCallback(async () => {
    const resultat = await window.olmix.chargerConfiguration();
    if (resultat.ok) {
      setConfig(resultat.valeur);
      setErreurConfig(null);
    } else {
      setConfig({ configuration: { version: 1, produits: [] }, problemes: [] });
      setErreurConfig(resultat.erreur);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await rechargerConfiguration();
      const [reglages, statutInitial, brouillonEnregistre] = await Promise.all([
        window.olmix.lireReglages(),
        window.olmix.statutSync(),
        window.olmix.lireBrouillon(),
      ]);
      setTheme(reglages.theme);
      setStatut(statutInitial);
      setBrouillon(brouillonEnregistre);
      setChargement(false);
    })();
  }, [rechargerConfiguration]);

  useEffect(() => window.olmix.surStatutSync(setStatut), []);

  useEffect(() => {
    const applique =
      theme === 'systeme'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'sombre'
          : 'clair'
        : theme;
    document.documentElement.dataset.theme = applique;
  }, [theme]);

  /* ---------------- Suivi de l'etape maximale atteinte ---------------- */

  useEffect(() => {
    setIndexMaxAtteint((max) => Math.max(max, session.indexEtape));
  }, [session.indexEtape]);

  /* ---------------- Sauvegarde automatique du brouillon ---------------- */

  useEffect(() => {
    if (session.vue !== 'formulaire' || !session.produit || !session.debutIso) return;
    const produit = session.produit;
    const debutIso = session.debutIso;

    if (minuterieBrouillon.current) window.clearTimeout(minuterieBrouillon.current);
    minuterieBrouillon.current = window.setTimeout(() => {
      void window.olmix.ecrireBrouillon({
        produitId: produit.id,
        produitNom: produit.nom,
        operateur: session.operateur,
        matricule: session.matricule,
        debutIso,
        majIso: new Date().toISOString(),
        indexEtape: session.indexEtape,
        valeurs: session.valeurs,
        commentaires: session.commentaires,
      });
    }, 500);

    return () => {
      if (minuterieBrouillon.current) window.clearTimeout(minuterieBrouillon.current);
    };
  }, [
    session.vue,
    session.produit,
    session.debutIso,
    session.operateur,
    session.matricule,
    session.indexEtape,
    session.valeurs,
    session.commentaires,
  ]);

  /* ---------------- Actions ---------------- */

  const produits = config?.configuration.produits ?? [];

  const demarrer = (produit: Produit) => {
    setIndexMaxAtteint(0);
    setBrouillon(null);
    setErreurSoumission(null);
    void window.olmix.supprimerBrouillon();
    session.demarrer(produit);
  };

  const reprendreBrouillon = () => {
    if (!brouillon) return;
    const produit = produits.find((p) => p.id === brouillon.produitId);
    if (!produit) {
      setErreurConfig(
        `La saisie interrompue portait sur le produit « ${brouillon.produitNom} », absent de la configuration actuelle.`,
      );
      setBrouillon(null);
      return;
    }
    setIndexMaxAtteint(brouillon.indexEtape);
    session.reprendre(brouillon, produit);
    setBrouillon(null);
  };

  const abandonnerBrouillon = () => {
    void window.olmix.supprimerBrouillon();
    setBrouillon(null);
  };

  const valider = async () => {
    if (!session.produit || !session.debutIso) return;
    setEnregistrement(true);
    setErreurSoumission(null);

    const resultat = await window.olmix.soumettreCycle({
      produitId: session.produit.id,
      operateur: session.operateur,
      matricule: session.matricule,
      debutIso: session.debutIso,
      valeurs: session.valeurs,
      commentaires: session.commentaires,
    });

    setEnregistrement(false);
    if (!resultat.ok) {
      setErreurSoumission(resultat.erreur);
      return;
    }
    setResume(resultat.valeur);
    session.allerVue('confirmation', 1);
  };

  const terminer = useCallback(() => {
    setResume(null);
    setIndexMaxAtteint(0);
    session.reinitialiserSaisie();
  }, [session]);

  const basculerTheme = async () => {
    const nouveau: Theme = theme === 'sombre' ? 'clair' : 'sombre';
    setTheme(nouveau);
    await window.olmix.ecrireReglages({ theme: nouveau });
  };

  const etapeCourante = session.produit?.etapes[session.indexEtape] ?? null;

  const contenu = useMemo(() => {
    if (chargement) return null;

    switch (session.vue) {
      case 'formulaire':
        return session.produit ? (
          <EcranFormulaire
            produit={session.produit}
            indexEtape={session.indexEtape}
            indexMaxAtteint={indexMaxAtteint}
            valeurs={session.valeurs}
            commentaires={session.commentaires}
            validation={validation}
            tentative={session.tentative}
            onValeur={session.definirValeur}
            onCommentaire={session.definirCommentaire}
            onSuivant={() => session.suivant(session.produit!.etapes.length)}
            onPrecedent={session.precedent}
            onAllerEtape={session.allerEtape}
            onTentative={session.marquerTentative}
          />
        ) : null;

      case 'recapitulatif':
        return session.produit ? (
          <EcranRecapitulatif
            produit={session.produit}
            operateur={session.operateur}
            matricule={session.matricule}
            valeurs={session.valeurs}
            commentaires={session.commentaires}
            enregistrement={enregistrement}
            erreur={erreurSoumission}
            onModifier={session.modifierDepuisRecapitulatif}
            onValider={() => void valider()}
            onRetour={() => session.modifierDepuisRecapitulatif(session.produit!.etapes.length - 1)}
          />
        ) : null;

      case 'confirmation':
        return resume ? (
          <EcranConfirmation
            resume={resume}
            produitNom={session.produit?.nom ?? ''}
            operateur={session.operateur}
            onTerminer={terminer}
          />
        ) : null;

      case 'admin':
        return (
          <EcranAdmin
            statut={statut}
            onQuitter={() => session.allerVue('accueil', -1)}
            onConfigurationModifiee={() => void rechargerConfiguration()}
          />
        );

      default:
        return (
          <EcranAccueil
            produits={produits}
            operateur={session.operateur}
            matricule={session.matricule}
            brouillon={brouillon}
            problemesConfig={config?.problemes ?? []}
            onIdentite={session.definirIdentite}
            onChoisir={demarrer}
            onReprendre={reprendreBrouillon}
            onAbandonnerBrouillon={abandonnerBrouillon}
          />
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement, session, validation, indexMaxAtteint, enregistrement, erreurSoumission, resume, statut, brouillon, config, produits]);

  if (chargement) {
    return (
      <div className="confirmation">
        <div className="carte confirmation__carte">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="app">
      <BarreSuperieure
        produit={session.vue === 'formulaire' || session.vue === 'recapitulatif' ? session.produit : null}
        operateur={session.operateur}
        matricule={session.matricule}
        indexEtape={session.indexEtape}
        nbEtapes={session.vue === 'formulaire' ? (session.produit?.etapes.length ?? 0) : 0}
        nomEtape={etapeCourante?.nom ?? null}
        statut={statut}
        theme={theme}
        onForcerSync={() => void window.olmix.forcerSync().then(setStatut)}
        onBasculerTheme={() => void basculerTheme()}
        onAdmin={() => session.allerVue('admin', 1)}
      />

      {erreurConfig && (
        <div style={{ padding: '14px 26px 0' }}>
          <Bandeau
            ton="erreur"
            titre="Configuration inutilisable"
            actions={
              <button type="button" className="btn btn--secondaire" onClick={() => void rechargerConfiguration()}>
                Recharger
              </button>
            }
          >
            <div style={{ whiteSpace: 'pre-line' }}>{erreurConfig}</div>
          </Bandeau>
        </div>
      )}

      <main className="contenu">
        <AnimatePresence mode="wait" custom={session.direction} initial={false}>
          <motion.div
            key={`${session.vue}-${session.vue === 'formulaire' ? session.indexEtape : ''}`}
            className="ecran"
            custom={session.direction}
            variants={transitions}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }}
          >
            {contenu}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
