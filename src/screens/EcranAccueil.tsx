/**
 * Ecran d'accueil : identification de l'operateur puis choix du produit.
 * La liste de produits est filtrable des qu'elle depasse quelques cartes.
 */

import { useMemo, useState } from 'react';
import type { Brouillon, Produit } from '@shared/types';
import { erreurMatricule, LONGUEUR_MATRICULE, nettoyerMatricule } from '@shared/validation';
import Bandeau from '../components/Bandeau';
import Icone from '../components/Icone';
import Apparition from '../components/motion/Apparition';
import Cascade from '../components/motion/Cascade';
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

  const nomComplet = operateur.trim().length >= 2;
  const problemeMatricule = erreurMatricule(matricule);
  const identiteComplete = nomComplet && !problemeMatricule;
  const prenom = operateur.trim().split(/\s+/)[0] ?? '';

  const choisir = (produit: Produit) => {
    if (!identiteComplete) {
      // Le focus va sur le premier champ fautif, pas systématiquement sur le nom.
      setTentative(true);
      document.getElementById(nomComplet ? 'champ-matricule' : 'champ-operateur')?.focus();
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
                tentative && !nomComplet
                  ? { borderColor: 'var(--erreur)', background: 'var(--erreur-fond)' }
                  : undefined
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
                problemeMatricule
                  ? { borderColor: 'var(--erreur)', background: 'var(--erreur-fond)' }
                  : undefined
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
              <Icone nom="liste" taille={52} epaisseur={1.5} style={{ margin: '0 auto' }} />
            </div>
            <div>
              Aucun produit actif dans la configuration.
              <br />
              Ouvrez le mode administrateur pour en ajouter.
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

/**
 * Carte produit façon bloc « solutions » d'olmix.com, réduite à son titre :
 * c'est la seule information dont l'opérateur a besoin pour choisir, et une
 * tuile dépouillée se repère plus vite qu'une fiche détaillée.
 */
function CarteProduit({ produit, onChoisir }: { produit: Produit; onChoisir: (p: Produit) => void }) {
  return (
    <button
      type="button"
      className="produit"
      style={{ ['--accent' as string]: produit.couleur ?? 'var(--olmix-petrole)' }}
      onClick={() => onChoisir(produit)}
      title={produit.description}
    >
      <div className="produit__visuel" aria-hidden>
        <div className="produit__visuel-fond" />
      </div>
      <div className="produit__bande">
        <div className="produit__nom">{produit.nom}</div>
      </div>
    </button>
  );
}
