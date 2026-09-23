/**
 * Ecran d'accueil : identification de l'operateur puis choix du produit.
 * La liste de produits est filtrable des qu'elle depasse quelques cartes.
 */

import { useMemo, useState } from 'react';
import type { Brouillon, Produit } from '@shared/types';
import Bandeau from '../components/Bandeau';
import Apparition from '../components/motion/Apparition';
import Cascade from '../components/motion/Cascade';
import Compteur from '../components/motion/Compteur';
import MotifPousse from '../components/motion/MotifPousse';
import Surlignage from '../components/motion/Surlignage';
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

  const identiteComplete = operateur.trim().length >= 2;
  const prenom = operateur.trim().split(/\s+/)[0] ?? '';

  const choisir = (produit: Produit) => {
    if (!identiteComplete) {
      setTentative(true);
      document.getElementById('champ-operateur')?.focus();
      return;
    }
    onChoisir(produit);
  };

  const erreurs = problemesConfig.filter((p) => p.niveau === 'erreur');
  const avertissements = problemesConfig.filter((p) => p.niveau === 'avertissement');

  return (
    <>
      {/* Filigrane vegetal, tres pale, qui derive lentement. */}
      <div className="filigrane" aria-hidden>
        <MotifPousse vitesse={2.4} delai={0.2} />
      </div>

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
            icone="💾"
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

        <Apparition auDefilement={false} className="accueil__entete">
          <div>
            <div className="sur-titre">Fin de cycle de production</div>
            <h1 className="titre-ecran">
              Bonjour
              {prenom.length >= 2 && (
                <>
                  ,{' '}
                  <Surlignage>{prenom}</Surlignage>
                </>
              )}
            </h1>
            <p className="sous-titre-ecran">
              Identifiez-vous, puis choisissez le produit dont le cycle vient de se terminer.
            </p>
          </div>
        </Apparition>

        <Apparition auDefilement={false} delai={0.15} className="accueil__identite">
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
                tentative && !identiteComplete
                  ? { borderColor: 'var(--erreur)', background: 'var(--erreur-fond)' }
                  : undefined
              }
            />
            {tentative && !identiteComplete && (
              <div className="message message--erreur">
                <span className="message__icone" aria-hidden>
                  ⛔
                </span>
                <span>Saisissez votre nom avant de choisir un produit.</span>
              </div>
            )}
          </div>
          <div>
            <label className="admin__mini" htmlFor="champ-matricule">
              Matricule (facultatif)
            </label>
            <input
              id="champ-matricule"
              className="saisie"
              type="text"
              autoComplete="off"
              placeholder="Ex. : OP1042"
              value={matricule}
              onChange={(e) => onIdentite(operateur, e.target.value)}
            />
          </div>
        </Apparition>

        <Apparition auDefilement={false} delai={0.3}>
          <h2 className="accueil__question">Quel produit vient de terminer son cycle&nbsp;?</h2>

          {produits.length > 4 && (
            <div className="accueil__recherche">
              <svg className="accueil__loupe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.6-3.6" />
              </svg>
              <input
                className="saisie"
                type="search"
                placeholder="Rechercher un produit…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
              />
            </div>
          )}
        </Apparition>

        {produits.length === 0 ? (
          <div className="carte vide">
            <div className="vide__icone" aria-hidden>
              📋
            </div>
            <div>
              Aucun produit actif dans la configuration.
              <br />
              Ouvrez le mode administrateur (⚙️) pour en ajouter.
            </div>
          </div>
        ) : (
          <>
            <Cascade
              className="grille-produits"
              classeElement="grille-produits__cellule"
              delaiInitial={0.3}
              auDefilement={false}
            >
              {filtres.map((produit) => (
                <CarteProduit key={produit.id} produit={produit} onChoisir={choisir} />
              ))}
            </Cascade>
            {filtres.length === 0 && (
              <div className="carte vide" style={{ marginTop: 20 }}>
                Aucun produit ne correspond à « {recherche} ».
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/** Carte produit façon bloc « solutions » d'olmix.com. */
function CarteProduit({ produit, onChoisir }: { produit: Produit; onChoisir: (p: Produit) => void }) {
  const nbQuestions = produit.etapes.reduce((n, e) => n + e.questions.length, 0);
  const nbEtapes = produit.etapes.length;
  return (
    <button
      type="button"
      className="produit"
      style={{ ['--accent' as string]: produit.couleur ?? 'var(--olmix-petrole)' }}
      onClick={() => onChoisir(produit)}
    >
      <div className="produit__visuel" aria-hidden>
        <div className="produit__visuel-fond" />
        <div className="produit__icone">{produit.icone ?? '🏭'}</div>
      </div>
      <div className="produit__bande">
        <div className="produit__nom">{produit.nom}</div>
        {produit.description && <div className="produit__desc">{produit.description}</div>}
        <div className="produit__pied">
          <span className="mini-puce">
            <Compteur valeur={nbEtapes} duree={0.9} delai={0.5} /> étape{nbEtapes > 1 ? 's' : ''}
          </span>
          <span className="mini-puce">
            <Compteur valeur={nbQuestions} duree={1.2} delai={0.5} /> question{nbQuestions > 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </button>
  );
}
