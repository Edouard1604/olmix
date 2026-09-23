/**
 * Orchestration de l'application : chargement de la configuration, theme,
 * etat de synchronisation, sauvegarde du brouillon et transitions entre ecrans.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
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
import Scene from './components/motion/Scene';
import Splash, { splashAttendu } from './components/motion/Splash';
import { useAnimationsReduites, useMouvement } from './lib/motion';

const STATUT_INITIAL: StatutSync = { etat: 'a_jour', enAttente: 0, dernierSuccesIso: null, message: null };

/** Evalue une seule fois, au chargement du module (et non a chaque rendu). */
const SPLASH_AU_DEMARRAGE = splashAttendu();

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

  const reduit = useAnimationsReduites();
  const definirMouvementReduit = useMouvement((e) => e.definirReglage);
  const [splash, setSplash] = useState(SPLASH_AU_DEMARRAGE);
  const finSplash = useCallback(() => setSplash(false), []);

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
      definirMouvementReduit(reglages.animationsReduites ?? false);
      setStatut(statutInitial);
      setBrouillon(brouillonEnregistre);
      setChargement(false);
    })();
  }, [rechargerConfiguration, definirMouvementReduit]);

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

  useEffect(() => {
    document.documentElement.dataset.mouvement = reduit ? 'reduit' : 'normal';
  }, [reduit]);

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
            direction={session.direction}
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
            debutIso={session.debutIso}
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

  return (
    // En mode reduit, framer-motion ne joue plus que les fondus (ni
    // translation, ni mise en page animee) : filet de securite global.
    <MotionConfig reducedMotion={reduit ? 'always' : 'never'}>
      {chargement ? (
        <div className="chargement">Chargement…</div>
      ) : (
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
            {/* Les ecrans se chevauchent : le nouveau est utilisable des son
                apparition. Les etapes du formulaire sont animees a l'interieur
                de l'ecran, pour que la cartographie reste en place. */}
            <AnimatePresence custom={session.direction} initial={false}>
              <Scene key={session.vue} className="ecran" direction={session.direction}>
                {contenu}
              </Scene>
            </AnimatePresence>
          </main>
        </div>
      )}
      {/* Meme position dans l'arbre pendant et apres le chargement : le
          splash n'est jamais remonte, donc jamais rejoue. */}
      <Splash visible={splash} onFin={finSplash} />
    </MotionConfig>
  );
}
