/**
 * Ecran d'accueil : identification de l'operateur puis choix du produit.
 * La liste de produits est filtrable des qu'elle depasse quelques cartes.
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Brouillon, Produit } from '@shared/types';
import Bandeau from '../components/Bandeau';
import Icone from '../components/Icone';
import { erreurMatricule, LONGUEUR_MATRICULE, nettoyerMatricule } from '@shared/validation';
import { dateHeure } from '../lib/format';

interface Proprietes {
  produits: Produit[];
  operateur: string;
  matricule: string;
  brouillon: Brouillon | null;
  problemesConfig: { niveau: string; message: string }[];
  onIdentite: (operateur: string, matricule: string) => void;
  onChoisir: (produit: Produit) => void;
  onReprendre: () => void;
  onAbandonnerBrouillon: () => void;
}

export default function EcranAccueil({
  produits,
  operateur,
  matricule,
  brouillon,
  problemesConfig,
  onIdentite,
  onChoisir,
  onReprendre,
  onAbandonnerBrouillon,
}: Proprietes) {
  const [recherche, setRecherche] = useState('');
  const [tentative, setTentative] = useState(false);

  const filtres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return produits;
    return produits.filter((p) =>
      `${p.nom} ${p.description ?? ''} ${p.id}`.toLowerCase().includes(terme),
    );
  }, [produits, recherche]);

  const nomComplet = operateur.trim().length >= 2;
  const problemeMatricule = erreurMatricule(matricule);
  const identiteComplete = nomComplet && !problemeMatricule;

  const choisir = (produit: Produit) => {
    if (identiteComplete) {
      onChoisir(produit);
      return;
    }
    setTentative(true);
    document.getElementById(nomComplet ? 'champ-matricule' : 'champ-operateur')?.focus();
  };

  const erreurs = problemesConfig.filter((p) => p.niveau === 'erreur');
  const avertissements = problemesConfig.filter((p) => p.niveau === 'avertissement');

  return (
    <div className="ecran__interieur">
      {erreurs.length > 0 && (
        <Bandeau ton="erreur" titre="Configuration produits invalide">
          {erreurs.map((p) => (
            <div key={p.message}>• {p.message}</div>
          ))}
        </Bandeau>
      )}
      {avertissements.length > 0 && (
        <Bandeau ton="alerte" titre="Points de vigilance dans la configuration">
          {avertissements.map((p) => (
            <div key={p.message}>• {p.message}</div>
          ))}
        </Bandeau>
      )}

      {brouillon && (
        <Bandeau
          ton="alerte"
          icone="sauvegarde"
          titre="Une saisie non terminée a été retrouvée"
          actions={
            <>
              <button type="button" className="btn btn--secondaire" onClick={onAbandonnerBrouillon}>
                Abandonner
              </button>
              <button type="button" className="btn btn--principal" onClick={onReprendre}>
                Reprendre
              </button>
            </>
          }
        >
          {brouillon.produitNom} — {brouillon.operateur || 'opérateur inconnu'}, interrompue le{' '}
          {dateHeure(brouillon.majIso)}.
        </Bandeau>
      )}

      <div className="accueil__entete">
        <div>
          <h1 className="titre-ecran">Bonjour</h1>
          <p className="sous-titre-ecran">
            Identifiez-vous, puis choisissez le produit dont le cycle vient de se terminer.
          </p>
        </div>
      </div>

      <div className="accueil__identite">
        <div>
          <label className="admin__mini" htmlFor="champ-operateur">
            Nom de l'opérateur *
          </label>
          <input
            id="champ-operateur"
            className="saisie"
            type="text"
            autoFocus
            autoComplete="off"
            placeholder="Ex. : Marc Le Gall"
            value={operateur}
            onChange={(e) => onIdentite(e.target.value, matricule)}
            style={
              tentative && !nomComplet ? { borderColor: 'var(--erreur)', background: 'var(--erreur-fond)' } : undefined
            }
          />
          {tentative && !nomComplet && (
            <div className="message message--erreur">
              <span className="message__icone" aria-hidden>
                <Icone nom="erreur" taille={18} />
              </span>
              <span>Saisissez votre nom avant de choisir un produit.</span>
            </div>
          )}
        </div>
        <div>
          <label className="admin__mini" htmlFor="champ-matricule">
            Matricule ({LONGUEUR_MATRICULE} chiffres, facultatif)
          </label>
          <input
            id="champ-matricule"
            className="saisie"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={LONGUEUR_MATRICULE}
            placeholder={`Ex. : ${'1'.padEnd(LONGUEUR_MATRICULE, '0')}`}
            value={matricule}
            /* La saisie est filtrée à la frappe : seuls les chiffres passent,
               et jamais plus que la longueur attendue. Le seul état invalide
               possible est donc un matricule commencé puis laissé incomplet. */
            onChange={(e) => onIdentite(operateur, nettoyerMatricule(e.target.value))}
            style={
              problemeMatricule ? { borderColor: 'var(--erreur)', background: 'var(--erreur-fond)' } : undefined
            }
          />
          {problemeMatricule && (
            <div className="message message--erreur">
              <span className="message__icone" aria-hidden>
                <Icone nom="erreur" taille={18} />
              </span>
              <span>{problemeMatricule}</span>
            </div>
          )}
        </div>
      </div>

      <h2
        style={{
          margin: '26px 0 4px',
          fontSize: 'var(--t-xl)',
          fontWeight: 720,
          letterSpacing: '-0.01em',
        }}
      >
        Quel produit vient de terminer son <span className="surlignage">cycle</span>&nbsp;?
      </h2>

      {produits.length > 4 && (
        <div className="accueil__recherche">
          <span className="accueil__loupe" aria-hidden>
            <Icone nom="recherche" taille={22} />
          </span>
          <input
            className="saisie"
            type="search"
            placeholder="Rechercher un produit…"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </div>
      )}

      {produits.length === 0 ? (
        <div className="carte vide">
          <div className="vide__icone" aria-hidden>
            <Icone nom="liste" taille={52} epaisseur={1.5} style={{ margin: '0 auto' }} />
          </div>
          <div>
            Aucun produit actif dans la configuration.
            <br />
            Ouvrez le mode administrateur pour en ajouter.
          </div>
        </div>
      ) : (
        <div className="grille-produits">
          {/* La carte ne porte que le nom du produit : c'est la seule
              information dont l'opérateur a besoin pour choisir, et une tuile
              dépouillée se repère plus vite qu'une fiche détaillée. */}
          {filtres.map((produit, index) => (
            <motion.button
              key={produit.id}
              type="button"
              className="produit"
              style={{ ['--accent' as string]: produit.couleur ?? 'var(--vert-600)' }}
              onClick={() => choisir(produit)}
              title={produit.description}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="produit__nom">{produit.nom}</span>
            </motion.button>
          ))}
          {filtres.length === 0 && (
            <div className="carte vide" style={{ gridColumn: '1 / -1' }}>
              Aucun produit ne correspond à « {recherche} ».
            </div>
          )}
        </div>
      )}
    </div>
  );
}
