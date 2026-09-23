/**
 * Mode administrateur, protege par mot de passe.
 *
 * La session est ouverte cote processus principal : tant qu'elle ne l'est pas,
 * les canaux d'ecriture de la configuration refusent toute demande, meme si
 * l'interface etait contournee.
 */

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Sauvegarde } from '@shared/api';
import type { ConfigurationProduits, Cycle, InfosApplication, Reglages, StatutSync } from '@shared/types';
import Bandeau from '../components/Bandeau';
import Icone from '../components/Icone';
import LogoOlmix from '../components/motion/LogoOlmix';
import { duree, FONDU_REDUIT, useAnimationsReduites, useMouvement } from '../lib/motion';
import EditeurProduits from './admin/EditeurProduits';
import PanneauReglages from './admin/PanneauReglages';
import PanneauDiagnostic from './admin/PanneauDiagnostic';

type Onglet = 'produits' | 'reglages' | 'diagnostic';

interface Proprietes {
  statut: StatutSync;
  onQuitter: () => void;
  onConfigurationModifiee: () => void;
}

export default function EcranAdmin({ statut, onQuitter, onConfigurationModifiee }: Proprietes) {
  const [connecte, setConnecte] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurConnexion, setErreurConnexion] = useState<string | null>(null);
  const [motDePasseParDefaut, setMotDePasseParDefaut] = useState(false);

  const [onglet, setOnglet] = useState<Onglet>('produits');
  const [configuration, setConfiguration] = useState<ConfigurationProduits | null>(null);
  const [brouillonConfig, setBrouillonConfig] = useState<ConfigurationProduits | null>(null);
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [infos, setInfos] = useState<InfosApplication | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [sauvegardes, setSauvegardes] = useState<Sauvegarde[]>([]);
  const [messageConfig, setMessageConfig] = useState<{ ton: 'succes' | 'erreur'; texte: string } | null>(null);
  const reduit = useAnimationsReduites();
  const definirMouvementReduit = useMouvement((e) => e.definirReglage);

  const chargerTout = useCallback(async () => {
    const [config, regl, inf, cyc, sauv] = await Promise.all([
      window.olmix.configurationComplete(),
      window.olmix.lireReglages(),
      window.olmix.infos(),
      window.olmix.listerCycles(20),
      window.olmix.listerSauvegardes(),
    ]);
    if (config.ok) {
      setConfiguration(config.valeur);
      setBrouillonConfig(config.valeur);
    }
    setReglages(regl);
    setInfos(inf);
    setCycles(cyc);
    setSauvegardes(sauv);
  }, []);

  useEffect(() => {
    if (connecte) void chargerTout();
  }, [connecte, chargerTout]);

  // La session administrateur se referme en quittant l'ecran.
  useEffect(() => () => void window.olmix.deconnexionAdmin(), []);

  const seConnecter = async () => {
    const resultat = await window.olmix.connexionAdmin(motDePasse);
    if (!resultat.ok) {
      setErreurConnexion(resultat.erreur);
      setMotDePasse('');
      return;
    }
    setMotDePasseParDefaut(resultat.valeur.motDePasseParDefaut);
    setErreurConnexion(null);
    setConnecte(true);
  };

  if (!connecte) {
    return (
      <div className="connexion">
        <div className="carte connexion__carte">
          <LogoOlmix hauteur={88} />
          <h1 className="titre-ecran" style={{ fontSize: 'var(--t-2xl)' }}>
            Mode administrateur
          </h1>
          <p className="sous-titre-ecran" style={{ fontSize: 'var(--t-s)', marginBottom: 24 }}>
            Réservé au responsable de production.
          </p>
          {erreurConnexion && (
            <Bandeau ton="erreur" titre="Accès refusé">
              {erreurConnexion}
            </Bandeau>
          )}
          <input
            className="saisie"
            type="password"
            autoFocus
            placeholder="Mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void seConnecter()}
          />
          <div className="rangee" style={{ marginTop: 18 }}>
            <button type="button" className="btn btn--secondaire" onClick={onQuitter}>
              Annuler
            </button>
            <button type="button" className="btn btn--principal pousser" onClick={() => void seConnecter()}>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  const configModifiee = JSON.stringify(configuration) !== JSON.stringify(brouillonConfig);

  const enregistrerConfig = async () => {
    if (!brouillonConfig) return;
    const resultat = await window.olmix.enregistrerConfiguration(brouillonConfig);
    if (!resultat.ok) {
      setMessageConfig({ ton: 'erreur', texte: resultat.erreur });
      return;
    }
    setConfiguration(brouillonConfig);
    setMessageConfig({
      ton: 'succes',
      texte: `Configuration enregistrée (${brouillonConfig.produits.length} produit(s)). La version précédente est archivée.`,
    });
    onConfigurationModifiee();
  };

  return (
    <div className="ecran__interieur">
      <div className="rangee" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="titre-ecran" style={{ fontSize: 'var(--t-2xl)' }}>
            Administration
          </h1>
          <p className="sous-titre-ecran" style={{ fontSize: 'var(--t-s)' }}>
            Produits, questions, emplacement du classeur et diagnostic.
          </p>
        </div>
        <button type="button" className="btn btn--secondaire pousser" onClick={onQuitter}>
          ← Retour à la saisie
        </button>
      </div>

      {/* Onglets en pilule : le fond degrade de l'onglet actif apparait en fondu. */}
      <div className="onglets" role="tablist">
        {(
          [
            ['produits', 'liste', 'Produits et questions'],
            ['reglages', 'reglages', 'Réglages'],
            ['diagnostic', 'diagnostic', 'Diagnostic'],
          ] as const
        ).map(([cle, icone, libelle]) => (
          <button
            key={cle}
            type="button"
            role="tab"
            aria-selected={onglet === cle}
            className={`btn onglet${onglet === cle ? ' onglet--actif' : ''}`}
            onClick={() => setOnglet(cle)}
          >
            <Icone nom={icone} taille={19} />
            {libelle}
          </button>
        ))}
      </div>

      {/* Transition d'onglet : simple fondu, l'administration reste sobre. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={onglet}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduit ? FONDU_REDUIT : duree.rapide }}
        >
          {onglet === 'produits' && brouillonConfig && (
            <>
              {messageConfig && (
                <Bandeau ton={messageConfig.ton} titre={messageConfig.ton === 'succes' ? 'Enregistré' : 'Refusé'}>
                  <div style={{ whiteSpace: 'pre-line' }}>{messageConfig.texte}</div>
                </Bandeau>
              )}
              <div className="rangee" style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn btn--secondaire"
                  onClick={async () => {
                    const resultat = await window.olmix.importerConfiguration();
                    if (!resultat.ok) setMessageConfig({ ton: 'erreur', texte: resultat.erreur });
                    else if (resultat.valeur) {
                      await chargerTout();
                      setMessageConfig({ ton: 'succes', texte: 'Configuration importée.' });
                      onConfigurationModifiee();
                    }
                  }}
                >
                  <Icone nom="importer" taille={19} /> Importer un JSON
                </button>
                <button
                  type="button"
                  className="btn btn--secondaire"
                  onClick={async () => {
                    const resultat = await window.olmix.exporterConfiguration();
                    if (!resultat.ok) setMessageConfig({ ton: 'erreur', texte: resultat.erreur });
                    else if (resultat.valeur)
                      setMessageConfig({ ton: 'succes', texte: `Exporté vers ${resultat.valeur}` });
                  }}
                >
                  <Icone nom="exporter" taille={19} /> Exporter en JSON
                </button>
                <div className="pousser rangee">
                  <button
                    type="button"
                    className="btn btn--secondaire"
                    disabled={!configModifiee}
                    onClick={() => setBrouillonConfig(configuration)}
                  >
                    Annuler les modifications
                  </button>
                  <button type="button" className="btn btn--principal" disabled={!configModifiee} onClick={enregistrerConfig}>
                    Enregistrer la configuration
                  </button>
                </div>
              </div>
              <EditeurProduits configuration={brouillonConfig} onChangement={setBrouillonConfig} />
            </>
          )}

          {onglet === 'reglages' && reglages && (
            <PanneauReglages
              reglages={reglages}
              motDePasseParDefaut={motDePasseParDefaut}
              onEnregistrer={async (partiel) => {
                const resultat = await window.olmix.ecrireReglages(partiel);
                if (!resultat.ok) return resultat.erreur;
                setReglages(resultat.valeur);
                // Applique tout de suite le reglage « Animations reduites ».
                definirMouvementReduit(resultat.valeur.animationsReduites ?? false);
                setInfos(await window.olmix.infos());
                return null;
              }}
              onParcourir={async () => {
                const resultat = await window.olmix.choisirFichierExcel();
                return resultat.ok ? resultat.valeur : null;
              }}
              onChangerMotDePasse={async (ancien, nouveau) => {
                const resultat = await window.olmix.changerMotDePasseAdmin(ancien, nouveau);
                if (!resultat.ok) return resultat.erreur;
                setMotDePasseParDefaut(false);
                return null;
              }}
            />
          )}

          {onglet === 'diagnostic' && (
            <PanneauDiagnostic
              infos={infos}
              statut={statut}
              cycles={cycles}
              sauvegardes={sauvegardes}
              onOuvrirDossier={(cible) => void window.olmix.ouvrirDossier(cible)}
              onOuvrirClasseur={() => void window.olmix.ouvrirClasseur()}
              onForcerSync={async () => {
                await window.olmix.forcerSync();
                await chargerTout();
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
