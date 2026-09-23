/**
 * Editeur de produits, etapes et questions.
 *
 * Il ecrit exactement la meme structure que le fichier JSON : ce que l'on fait
 * ici est strictement equivalent a editer `produits.json` a la main, en evitant
 * les erreurs de syntaxe et les identifiants en double.
 */

import { useState } from 'react';
import { suggererColonne } from '@shared/schema';
import { normaliserEntete } from '@shared/columns';
import Icone from '../../components/Icone';
import type {
  ConfigurationProduits,
  EtapeProcessus,
  Produit,
  Question,
  TypeQuestion,
} from '@shared/types';

/** Accent proposé pour un nouveau produit ; repris du jeu de jetons. */
const COULEUR_PRODUIT_DEFAUT = '#269755';

const TYPES: { valeur: TypeQuestion; libelle: string }[] = [
  { valeur: 'texte', libelle: 'Texte court' },
  { valeur: 'textarea', libelle: 'Texte long' },
  { valeur: 'nombre', libelle: 'Nombre' },
  { valeur: 'booleen', libelle: 'Oui / Non' },
  { valeur: 'liste', libelle: 'Liste déroulante' },
  { valeur: 'choix_multiple', libelle: 'Choix multiple' },
  { valeur: 'date', libelle: 'Date' },
  { valeur: 'heure', libelle: 'Heure' },
  { valeur: 'datetime', libelle: 'Date et heure' },
];

/** Transforme un libelle en identifiant technique acceptable. */
function identifiantDepuis(libelle: string, secours: string): string {
  const base = normaliserEntete(libelle).toLowerCase().replace(/[^a-z0-9_]/g, '');
  return base || secours;
}

interface Proprietes {
  configuration: ConfigurationProduits;
  onChangement: (configuration: ConfigurationProduits) => void;
}

export default function EditeurProduits({ configuration, onChangement }: Proprietes) {
  const [selection, setSelection] = useState(0);
  const [etapeOuverte, setEtapeOuverte] = useState<string | null>(null);

  const produit = configuration.produits[selection];

  const majProduits = (produits: Produit[]) => onChangement({ ...configuration, produits });

  const majProduit = (modifie: Partial<Produit>) => {
    if (!produit) return;
    majProduits(configuration.produits.map((p, i) => (i === selection ? { ...p, ...modifie } : p)));
  };

  const majEtapes = (etapes: EtapeProcessus[]) => majProduit({ etapes });

  const majEtape = (etapeId: string, modifie: Partial<EtapeProcessus>) => {
    if (!produit) return;
    majEtapes(produit.etapes.map((e) => (e.id === etapeId ? { ...e, ...modifie } : e)));
  };

  const majQuestion = (etapeId: string, questionId: string, modifie: Partial<Question>) => {
    if (!produit) return;
    majEtapes(
      produit.etapes.map((e) =>
        e.id !== etapeId
          ? e
          : { ...e, questions: e.questions.map((q) => (q.id === questionId ? { ...q, ...modifie } : q)) },
      ),
    );
  };

  const deplacer = <T,>(liste: T[], index: number, sens: -1 | 1): T[] => {
    const cible = index + sens;
    if (cible < 0 || cible >= liste.length) return liste;
    const copie = [...liste];
    [copie[index], copie[cible]] = [copie[cible]!, copie[index]!];
    return copie;
  };

  const ajouterProduit = () => {
    const numero = configuration.produits.length + 1;
    const nouveau: Produit = {
      id: `produit_${numero}`,
      nom: `Nouveau produit ${numero}`,
      couleur: COULEUR_PRODUIT_DEFAUT,
      actif: true,
      etapes: [{ id: 'etape_1', nom: 'Étape 1', questions: [] }],
    };
    majProduits([...configuration.produits, nouveau]);
    setSelection(configuration.produits.length);
  };

  const supprimerProduit = () => {
    if (!produit) return;
    if (!confirm(`Supprimer définitivement le produit « ${produit.nom} » de la configuration ?`)) return;
    majProduits(configuration.produits.filter((_, i) => i !== selection));
    setSelection(Math.max(0, selection - 1));
  };

  const ajouterEtape = () => {
    if (!produit) return;
    const numero = produit.etapes.length + 1;
    majEtapes([...produit.etapes, { id: `etape_${numero}`, nom: `Étape ${numero}`, questions: [] }]);
  };

  const ajouterQuestion = (etape: EtapeProcessus) => {
    const numero = etape.questions.length + 1;
    const question: Question = {
      id: `question_${numero}`,
      colonne: `Question_${numero}`,
      libelle: `Nouvelle question ${numero}`,
      type: 'texte',
      obligatoire: false,
    };
    majEtape(etape.id, { questions: [...etape.questions, question] });
  };

  if (!produit) {
    return (
      <div className="carte vide">
        Aucun produit.
        <div style={{ marginTop: 18 }}>
          <button type="button" className="btn btn--principal" onClick={ajouterProduit}>
            + Créer un produit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin__grille">
      {/* ---------- Colonne de gauche : liste des produits ---------- */}
      <div className="carte admin__liste">
        {configuration.produits.map((p, index) => (
          <button
            key={`${p.id}-${index}`}
            type="button"
            className={`admin__element${index === selection ? ' admin__element--actif' : ''}`}
            onClick={() => setSelection(index)}
          >
            <span
              aria-hidden
              className="admin__pastille"
              style={{ ['--accent' as string]: p.couleur ?? 'var(--vert-600)' }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nom}</span>
            {p.actif === false && <span className="mini-puce">inactif</span>}
          </button>
        ))}
        <button type="button" className="btn btn--secondaire" style={{ marginTop: 8 }} onClick={ajouterProduit}>
          + Produit
        </button>
      </div>

      {/* ---------- Colonne de droite : edition ---------- */}
      <div className="carte admin__panneau">
        <div className="admin__section">
          <div className="rangee">
            <div className="admin__titre-section" style={{ margin: 0 }}>
              Produit
            </div>
            <button type="button" className="btn btn--fantome pousser" onClick={supprimerProduit}>
              <Icone nom="corbeille" taille={18} /> Supprimer ce produit
            </button>
          </div>

          <div className="admin__ligne">
            <label htmlFor="p-nom">Nom affiché</label>
            <input
              id="p-nom"
              className="saisie saisie--compacte"
              value={produit.nom}
              onChange={(e) => majProduit({ nom: e.target.value })}
            />
          </div>
          <div className="admin__ligne">
            <label htmlFor="p-id">Identifiant technique</label>
            <input
              id="p-id"
              className="saisie saisie--compacte"
              value={produit.id}
              onChange={(e) => majProduit({ id: identifiantDepuis(e.target.value, produit.id) })}
            />
          </div>
          <div className="admin__ligne">
            <label htmlFor="p-desc">Description</label>
            <input
              id="p-desc"
              className="saisie saisie--compacte"
              value={produit.description ?? ''}
              onChange={(e) => majProduit({ description: e.target.value })}
            />
          </div>
          <div className="admin__ligne">
            <label>Symbole et couleur</label>
            <div className="rangee">
              <input
                className="saisie saisie--compacte"
                style={{ width: 80, textAlign: 'center' }}
                value={produit.icone ?? ''}
                onChange={(e) => majProduit({ icone: e.target.value })}
                placeholder="Auto"
                title="Laissez vide pour afficher les initiales du produit"
                aria-label="Symbole du produit"
              />
              <input
                type="color"
                className="saisie saisie--compacte"
                style={{ width: 70, padding: 4 }}
                value={produit.couleur ?? COULEUR_PRODUIT_DEFAUT}
                onChange={(e) => majProduit({ couleur: e.target.value })}
                aria-label="Couleur d'accent"
              />
              <label className="rangee" style={{ gap: 8, fontSize: 'var(--t-s)', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={produit.actif !== false}
                  onChange={(e) => majProduit({ actif: e.target.checked })}
                />
                Visible par les opérateurs
              </label>
            </div>
          </div>
        </div>

        {/* ---------- Etapes ---------- */}
        <div className="admin__section">
          <div className="rangee">
            <div className="admin__titre-section" style={{ margin: 0 }}>
              Étapes du processus ({produit.etapes.length})
            </div>
            <button type="button" className="btn btn--secondaire pousser" onClick={ajouterEtape}>
              + Étape
            </button>
          </div>
          <p style={{ fontSize: 'var(--t-xs)', color: 'var(--texte-doux)', marginBottom: 14 }}>
            L'ordre des étapes est celui de la cartographie affichée à l'opérateur.
          </p>

          {produit.etapes.map((etape, indexEtape) => {
            const ouverte = etapeOuverte === etape.id;
            return (
              <div key={etape.id} className="admin__question" style={{ background: 'var(--surface)' }}>
                <div className="admin__question-entete">
                  <button
                    type="button"
                    className="btn btn--fantome"
                    style={{ minHeight: 38, padding: '0 10px' }}
                    onClick={() => setEtapeOuverte(ouverte ? null : etape.id)}
                    aria-expanded={ouverte}
                  >
                    {ouverte ? '▾' : '▸'}
                  </button>
                  <strong style={{ fontSize: 'var(--t-m)' }}>
                    {indexEtape + 1}. {etape.nom}
                  </strong>
                  <span className="mini-puce">{etape.questions.length} questions</span>
                  <div className="rangee pousser" style={{ gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn--fantome"
                      style={{ minHeight: 38, padding: '0 10px' }}
                      onClick={() => majEtapes(deplacer(produit.etapes, indexEtape, -1))}
                      disabled={indexEtape === 0}
                      title="Monter"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn--fantome"
                      style={{ minHeight: 38, padding: '0 10px' }}
                      onClick={() => majEtapes(deplacer(produit.etapes, indexEtape, 1))}
                      disabled={indexEtape === produit.etapes.length - 1}
                      title="Descendre"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn--fantome"
                      style={{ minHeight: 38, padding: '0 10px' }}
                      onClick={() => {
                        if (confirm(`Supprimer l'étape « ${etape.nom} » et ses questions ?`)) {
                          majEtapes(produit.etapes.filter((e) => e.id !== etape.id));
                        }
                      }}
                      title="Supprimer l'étape"
                    >
                      <Icone nom="corbeille" taille={18} />
                    </button>
                  </div>
                </div>

                {ouverte && (
                  <>
                    <div className="admin__grille-champs" style={{ marginBottom: 16 }}>
                      <div>
                        <span className="admin__mini">Nom de l'étape</span>
                        <input
                          className="saisie saisie--compacte"
                          value={etape.nom}
                          onChange={(e) => majEtape(etape.id, { nom: e.target.value })}
                        />
                      </div>
                      <div>
                        <span className="admin__mini">Identifiant</span>
                        <input
                          className="saisie saisie--compacte"
                          value={etape.id}
                          onChange={(e) => {
                            const nouvelId = identifiantDepuis(e.target.value, etape.id);
                            majEtapes(produit.etapes.map((x) => (x.id === etape.id ? { ...x, id: nouvelId } : x)));
                            setEtapeOuverte(nouvelId);
                          }}
                        />
                      </div>
                      <div>
                        <span className="admin__mini">Symbole</span>
                        <input
                          className="saisie saisie--compacte"
                          style={{ textAlign: 'center' }}
                          value={etape.icone ?? ''}
                          placeholder="Auto"
                          title="Laissez vide pour afficher le numéro de l'étape"
                          onChange={(e) => majEtape(etape.id, { icone: e.target.value })}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className="admin__mini">Description</span>
                        <input
                          className="saisie saisie--compacte"
                          value={etape.description ?? ''}
                          onChange={(e) => majEtape(etape.id, { description: e.target.value })}
                        />
                      </div>
                    </div>

                    {etape.questions.map((question, indexQuestion) => (
                      <EditeurQuestion
                        key={question.id}
                        question={question}
                        premier={indexQuestion === 0}
                        dernier={indexQuestion === etape.questions.length - 1}
                        onChangement={(modifie) => majQuestion(etape.id, question.id, modifie)}
                        onDeplacer={(sens) =>
                          majEtape(etape.id, { questions: deplacer(etape.questions, indexQuestion, sens) })
                        }
                        onSupprimer={() =>
                          majEtape(etape.id, {
                            questions: etape.questions.filter((q) => q.id !== question.id),
                          })
                        }
                      />
                    ))}

                    <button type="button" className="btn btn--secondaire" onClick={() => ajouterQuestion(etape)}>
                      + Question
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EditeurQuestion({
  question,
  premier,
  dernier,
  onChangement,
  onDeplacer,
  onSupprimer,
}: {
  question: Question;
  premier: boolean;
  dernier: boolean;
  onChangement: (modifie: Partial<Question>) => void;
  onDeplacer: (sens: -1 | 1) => void;
  onSupprimer: () => void;
}) {
  const avecOptions = question.type === 'liste' || question.type === 'choix_multiple';
  const numerique = question.type === 'nombre';

  return (
    <div className="admin__question">
      <div className="admin__question-entete">
        <input
          className="saisie saisie--compacte"
          style={{ flex: 1, fontWeight: 700 }}
          value={question.libelle}
          onChange={(e) => {
            const libelle = e.target.value;
            // Tant que la colonne n'a pas ete personnalisee, elle suit le libelle.
            const colonneAuto = question.colonne === suggererColonne(question.libelle, question.unite);
            onChangement(colonneAuto ? { libelle, colonne: suggererColonne(libelle, question.unite) } : { libelle });
          }}
          aria-label="Libellé de la question"
        />
        <div className="rangee" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn btn--fantome"
            style={{ minHeight: 38, padding: '0 10px' }}
            onClick={() => onDeplacer(-1)}
            disabled={premier}
            title="Monter"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn--fantome"
            style={{ minHeight: 38, padding: '0 10px' }}
            onClick={() => onDeplacer(1)}
            disabled={dernier}
            title="Descendre"
          >
            ↓
          </button>
          <button
            type="button"
            className="btn btn--fantome"
            style={{ minHeight: 38, padding: '0 10px' }}
            onClick={onSupprimer}
            title="Supprimer la question"
          >
            <Icone nom="corbeille" taille={18} />
          </button>
        </div>
      </div>

      <div className="admin__grille-champs">
        <div>
          <span className="admin__mini">Identifiant technique</span>
          <input
            className="saisie saisie--compacte"
            value={question.id}
            onChange={(e) => onChangement({ id: identifiantDepuis(e.target.value, question.id) })}
          />
        </div>
        <div>
          <span className="admin__mini">Colonne Excel (stable)</span>
          <input
            className="saisie saisie--compacte"
            value={question.colonne ?? ''}
            onChange={(e) => onChangement({ colonne: normaliserEntete(e.target.value) })}
            title="Renommer cette colonne casse les visuels Power BI qui s'y réfèrent."
          />
        </div>
        <div>
          <span className="admin__mini">Type de réponse</span>
          <select
            className="saisie saisie--compacte"
            value={question.type}
            onChange={(e) => {
              const type = e.target.value as TypeQuestion;
              // Les bornes n'ont de sens que pour un nombre.
              onChangement(type === 'nombre' ? { type } : { type, min: null, max: null });
            }}
          >
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.libelle}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="admin__mini">Obligatoire</span>
          <label className="rangee" style={{ gap: 9, minHeight: 46, fontSize: 'var(--t-s)', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={question.obligatoire}
              onChange={(e) => onChangement({ obligatoire: e.target.checked })}
            />
            Réponse exigée
          </label>
        </div>

        {numerique && (
          <>
            <div>
              <span className="admin__mini">Unité affichée</span>
              <input
                className="saisie saisie--compacte"
                value={question.unite ?? ''}
                placeholder="kg, °C, min…"
                onChange={(e) => onChangement({ unite: e.target.value || null })}
              />
            </div>
            <div>
              <span className="admin__mini">Minimum</span>
              <input
                className="saisie saisie--compacte"
                type="number"
                value={question.min ?? ''}
                onChange={(e) => onChangement({ min: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div>
              <span className="admin__mini">Maximum</span>
              <input
                className="saisie saisie--compacte"
                type="number"
                value={question.max ?? ''}
                onChange={(e) => onChangement({ max: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
            <div>
              <span className="admin__mini">Décimales</span>
              <input
                className="saisie saisie--compacte"
                type="number"
                min={0}
                max={6}
                value={question.decimales ?? 1}
                onChange={(e) => onChangement({ decimales: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <span className="admin__mini">Texte d'aide affiché sous la question</span>
          <input
            className="saisie saisie--compacte"
            value={question.aide ?? ''}
            onChange={(e) => onChangement({ aide: e.target.value })}
          />
        </div>

        {avecOptions && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span className="admin__mini">Options — une par ligne, au format « CODE | Libellé affiché »</span>
            <textarea
              className="saisie saisie--compacte"
              rows={Math.max(3, (question.options?.length ?? 0) + 1)}
              value={(question.options ?? []).map((o) => `${o.valeur} | ${o.libelle}`).join('\n')}
              onChange={(e) =>
                onChangement({
                  options: e.target.value
                    .split('\n')
                    .map((ligne) => ligne.trim())
                    .filter(Boolean)
                    .map((ligne) => {
                      const [code, ...reste] = ligne.split('|');
                      const valeur = (code ?? '').trim();
                      return { valeur, libelle: reste.join('|').trim() || valeur };
                    }),
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
