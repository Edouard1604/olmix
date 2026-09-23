/**
 * Section « Chiffres clés » sur le modèle d'olmix.com : fond pétrole à
 * texture végétale, cartes à bordure fine translucide, petit sous-titre
 * serif vert, gros chiffre qui compte, libellé dessous.
 */

import type { ReactNode } from 'react';
import Cascade from './motion/Cascade';
import Compteur from './motion/Compteur';

export interface Chiffre {
  cle: string;
  sousTitre: string;
  /** Valeur numérique animée… */
  valeur?: number;
  unite?: string;
  /** …ou texte affiché tel quel (identifiant, état). */
  texte?: ReactNode;
  libelle?: string;
  ton?: 'alerte' | 'ok';
}

export default function ChiffresCles({
  chiffres,
  meta,
  delai = 0.1,
}: {
  chiffres: Chiffre[];
  meta?: ReactNode;
  delai?: number;
}) {
  return (
    <section className="chiffres">
      {meta && <div className="chiffres__meta">{meta}</div>}
      <Cascade className="chiffres__grille" delaiInitial={delai} auDefilement={false} decalage={16}>
        {chiffres.map((c) => (
          <div key={c.cle} className={`chiffre${c.ton ? ` chiffre--${c.ton}` : ''}`}>
            <div className="chiffre__sous-titre">{c.sousTitre}</div>
            {c.valeur !== undefined ? (
              <div className="chiffre__valeur">
                <Compteur valeur={c.valeur} delai={delai + 0.2} />
                {c.unite && <span className="chiffre__unite">{c.unite}</span>}
              </div>
            ) : (
              <div className="chiffre__texte">{c.texte}</div>
            )}
            {c.libelle && <div className="chiffre__libelle">{c.libelle}</div>}
          </div>
        ))}
      </Cascade>
    </section>
  );
}
