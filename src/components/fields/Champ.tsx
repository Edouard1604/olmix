/**
 * Rendu d'une question, tous types confondus.
 *
 * Deux moments d'affichage des messages :
 *  - l'AVERTISSEMENT (valeur hors bornes) apparait immediatement, car c'est une
 *    information utile pendant la frappe ;
 *  - l'ERREUR bloquante n'apparait qu'apres sortie du champ ou apres une
 *    tentative de passer a l'etape suivante, pour ne pas crier sur un champ que
 *    l'operateur n'a pas encore rempli.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OptionQuestion, Question, ValeurReponse } from '@shared/types';
import { estHorsBornes, estVide, libelleBornes, type ProblemeChamp } from '@shared/validation';

interface ProprietesChamp {
  question: Question;
  valeur: ValeurReponse;
  commentaire: string;
  probleme?: ProblemeChamp;
  /** Force l'affichage des erreurs (tentative de passage a l'etape suivante). */
  forcerAffichage: boolean;
  onValeur: (valeur: ValeurReponse) => void;
  onCommentaire: (commentaire: string) => void;
}

export default function Champ({
  question,
  valeur,
  commentaire,
  probleme,
  forcerAffichage,
  onValeur,
  onCommentaire,
}: ProprietesChamp) {
  const [touche, setTouche] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  const bloquant = probleme?.gravite === 'bloquant';
  const commentaireManquant = probleme?.code === 'commentaire_requis';
  // Le depassement de bornes est un etat visuel a part entiere : il vire a
  // l'orange des la frappe, qu'un commentaire ait ete saisi ou non.
  const horsBornes = estHorsBornes(question, valeur);
  const montrerErreur = bloquant && !commentaireManquant && (touche || forcerAffichage);
  const renseigne = question.type === 'booleen' || !estVide(valeur);
  const valide = !probleme && renseigne;

  // Mise en evidence : on amene le premier champ fautif sous les yeux.
  useEffect(() => {
    if (forcerAffichage && bloquant) {
      conteneur.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Un seul champ doit defiler : le parent ne force l'affichage qu'une fois.
  }, [forcerAffichage, bloquant]);

  const classes = [
    'champ',
    montrerErreur ? 'champ--erreur' : '',
    !montrerErreur && horsBornes ? 'champ--alerte' : '',
    !montrerErreur && !horsBornes && valide ? 'champ--valide' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const bornes = libelleBornes(question);

  return (
    <motion.div
      ref={conteneur}
      className={classes}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.2, 0.7, 0.3, 1] }}
    >
      <div className="champ__entete">
        <div>
          <div className="champ__libelle">
            {question.libelle}
            {question.obligatoire && (
              <span className="champ__obligatoire" title="Réponse obligatoire">
                *
              </span>
            )}
            <AnimatePresence>
              {valide && (
                <motion.span
                  key="coche"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                  style={{ marginLeft: 10, color: 'var(--succes)', fontSize: '1rem' }}
                  aria-hidden
                >
                  ✓
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {question.aide && <div className="champ__aide">{question.aide}</div>}
        </div>
        {bornes && <div className="champ__bornes">{bornes}</div>}
      </div>

      <div onBlur={() => setTouche(true)}>
        <SaisieParType question={question} valeur={valeur} onValeur={onValeur} />
      </div>

      <AnimatePresence>
        {(montrerErreur || horsBornes) && (
          <motion.div
            key={montrerErreur ? 'erreur' : 'alerte'}
            className={`message message--${montrerErreur ? 'erreur' : 'alerte'}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <span className="message__icone" aria-hidden>
              {montrerErreur ? '⛔' : '⚠️'}
            </span>
            <span>
              {montrerErreur ? probleme?.message : `Valeur hors plage (${libelleBornes(question)}).`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Le commentaire n'est demande que lorsque la valeur sort des bornes. */}
      <AnimatePresence>
        {horsBornes && (
          <motion.div
            key="commentaire"
            className="commentaire-requis"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="commentaire-requis__titre">
              Commentaire obligatoire : pourquoi cette valeur sort-elle de la plage&nbsp;?
            </div>
            <textarea
              className="saisie"
              rows={2}
              value={commentaire}
              placeholder="Ex. : consigne modifiée par le chef d'équipe, matière première atypique…"
              onChange={(e) => onCommentaire(e.target.value)}
              style={
                commentaireManquant && (touche || forcerAffichage)
                  ? { borderColor: 'var(--erreur)' }
                  : undefined
              }
            />
            {commentaireManquant && (touche || forcerAffichage) && (
              <div className="message message--erreur">
                <span className="message__icone" aria-hidden>
                  ⛔
                </span>
                <span>Sans ce commentaire, l'étape ne peut pas être validée.</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */

function SaisieParType({
  question,
  valeur,
  onValeur,
}: {
  question: Question;
  valeur: ValeurReponse;
  onValeur: (valeur: ValeurReponse) => void;
}) {
  switch (question.type) {
    case 'nombre':
      return <ChampNombre question={question} valeur={valeur} onValeur={onValeur} />;
    case 'booleen':
      return <ChampBooleen valeur={valeur === true} onValeur={onValeur} />;
    case 'liste':
      return <ChampListe options={question.options ?? []} valeur={valeur} onValeur={onValeur} />;
    case 'choix_multiple':
      return (
        <ChampChoixMultiple
          options={question.options ?? []}
          valeur={Array.isArray(valeur) ? valeur : []}
          onValeur={onValeur}
        />
      );
    case 'textarea':
      return (
        <textarea
          className="saisie"
          value={(valeur as string) ?? ''}
          onChange={(e) => onValeur(e.target.value)}
        />
      );
    case 'date':
    case 'heure':
    case 'datetime':
      return (
        <input
          className="saisie"
          type={question.type === 'datetime' ? 'datetime-local' : question.type === 'date' ? 'date' : 'time'}
          value={(valeur as string) ?? ''}
          onChange={(e) => onValeur(e.target.value || null)}
        />
      );
    default:
      return (
        <input
          className="saisie"
          type="text"
          value={(valeur as string) ?? ''}
          onChange={(e) => onValeur(e.target.value)}
        />
      );
  }
}

function ChampNombre({
  question,
  valeur,
  onValeur,
}: {
  question: Question;
  valeur: ValeurReponse;
  onValeur: (valeur: ValeurReponse) => void;
}) {
  // La saisie reste une chaine tant que l'operateur tape : cela autorise la
  // virgule comme separateur decimal et les etats intermediaires (« 12, »).
  const texte = valeur === null || valeur === undefined ? '' : String(valeur);
  return (
    <div className={`champ-nombre${question.unite ? '' : ' champ-nombre--sans-unite'}`}>
      <input
        className="saisie"
        type="text"
        inputMode="decimal"
        value={texte}
        placeholder={question.min != null && question.max != null ? `${question.min} – ${question.max}` : ''}
        onChange={(e) => {
          const brut = e.target.value.replace(/[^0-9,.\-]/g, '');
          onValeur(brut === '' ? null : brut);
        }}
      />
      {question.unite && <div className="champ-nombre__unite">{question.unite}</div>}
    </div>
  );
}

function ChampBooleen({ valeur, onValeur }: { valeur: boolean; onValeur: (v: ValeurReponse) => void }) {
  return (
    <div className="bascule" role="radiogroup">
      <button
        type="button"
        role="radio"
        aria-checked={valeur}
        className={`bascule__option${valeur ? ' bascule__option--actif-oui' : ''}`}
        onClick={() => onValeur(true)}
      >
        <span aria-hidden>✓</span> Oui
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!valeur}
        className={`bascule__option${!valeur ? ' bascule__option--actif-non' : ''}`}
        onClick={() => onValeur(false)}
      >
        <span aria-hidden>✕</span> Non
      </button>
    </div>
  );
}

function ChampListe({
  options,
  valeur,
  onValeur,
}: {
  options: OptionQuestion[];
  valeur: ValeurReponse;
  onValeur: (v: ValeurReponse) => void;
}) {
  return (
    <select
      className="saisie"
      value={(valeur as string) ?? ''}
      onChange={(e) => onValeur(e.target.value || null)}
    >
      <option value="">— Sélectionner —</option>
      {options.map((option) => (
        <option key={option.valeur} value={option.valeur}>
          {option.libelle}
        </option>
      ))}
    </select>
  );
}

function ChampChoixMultiple({
  options,
  valeur,
  onValeur,
}: {
  options: OptionQuestion[];
  valeur: string[];
  onValeur: (v: ValeurReponse) => void;
}) {
  const basculer = (code: string) =>
    onValeur(valeur.includes(code) ? valeur.filter((v) => v !== code) : [...valeur, code]);

  return (
    <div className="cases">
      {options.map((option) => {
        const cochee = valeur.includes(option.valeur);
        return (
          <button
            key={option.valeur}
            type="button"
            role="checkbox"
            aria-checked={cochee}
            className={`case-option${cochee ? ' case-option--cochee' : ''}`}
            onClick={() => basculer(option.valeur)}
          >
            <span className="case-option__boite" aria-hidden>
              {cochee ? '✓' : ''}
            </span>
            {option.libelle}
          </button>
        );
      })}
    </div>
  );
}
