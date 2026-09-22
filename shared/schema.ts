/**
 * Validation de la configuration produits (Zod).
 *
 * La configuration est editee soit a la main dans le JSON, soit via le mode
 * administrateur. Dans les deux cas elle passe par ce schema : une config
 * invalide ne doit jamais atteindre l'interface operateur.
 */

import { z } from 'zod';
import { colonneDeQuestion, normaliserEntete } from './columns';
import type { ConfigurationProduits, Produit } from './types';

const identifiant = z
  .string()
  .trim()
  .min(1, 'identifiant vide')
  .regex(/^[a-z0-9_]+$/, 'identifiant : minuscules, chiffres et tirets bas uniquement');

const optionSchema = z.object({
  valeur: z.string().trim().min(1, 'valeur d’option vide'),
  libelle: z.string().trim().min(1, 'libelle d’option vide'),
});

export const questionSchema = z
  .object({
    id: identifiant,
    colonne: z.string().trim().optional(),
    libelle: z.string().trim().min(1, 'libelle de question vide'),
    aide: z.string().trim().optional(),
    type: z.enum([
      'texte',
      'textarea',
      'nombre',
      'booleen',
      'liste',
      'choix_multiple',
      'date',
      'heure',
      'datetime',
    ]),
    obligatoire: z.boolean().default(false),
    unite: z.string().trim().nullish(),
    min: z.number().nullish(),
    max: z.number().nullish(),
    decimales: z.number().int().min(0).max(6).optional(),
    options: z.array(optionSchema).optional(),
    defaut: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).nullish(),
    commentaireSiHorsBornes: z.boolean().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.min != null && q.max != null && q.min > q.max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `question "${q.id}" : min superieur a max` });
    }
    if ((q.type === 'liste' || q.type === 'choix_multiple') && !q.options?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `question "${q.id}" : le type "${q.type}" exige au moins une option`,
      });
    }
    if (q.type !== 'nombre' && (q.min != null || q.max != null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `question "${q.id}" : min/max ne s’appliquent qu’au type "nombre"`,
      });
    }
  });

export const etapeSchema = z
  .object({
    id: identifiant,
    nom: z.string().trim().min(1, 'nom d’etape vide'),
    description: z.string().trim().optional(),
    icone: z.string().trim().optional(),
    questions: z.array(questionSchema),
  })
  .superRefine((e, ctx) => {
    const vus = new Set<string>();
    for (const q of e.questions) {
      if (vus.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `etape "${e.id}" : identifiant de question en double "${q.id}"`,
        });
      }
      vus.add(q.id);
    }
  });

export const produitSchema = z
  .object({
    id: identifiant,
    nom: z.string().trim().min(1, 'nom de produit vide'),
    description: z.string().trim().optional(),
    couleur: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'couleur attendue au format #RRGGBB')
      .optional(),
    icone: z.string().trim().optional(),
    actif: z.boolean().optional(),
    etapes: z.array(etapeSchema).min(1, 'un produit doit comporter au moins une etape'),
  })
  .superRefine((p, ctx) => {
    const etapesVues = new Set<string>();
    const questionsVues = new Set<string>();
    for (const e of p.etapes) {
      if (etapesVues.has(e.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `produit "${p.id}" : identifiant d’etape en double "${e.id}"`,
        });
      }
      etapesVues.add(e.id);
      for (const q of e.questions) {
        if (questionsVues.has(q.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `produit "${p.id}" : l’identifiant de question "${q.id}" est utilise dans deux etapes`,
          });
        }
        questionsVues.add(q.id);
      }
    }
  });

export const configurationSchema = z.object({
  version: z.number().int().min(1).default(1),
  produits: z.array(produitSchema),
});

export interface ProblemeConfig {
  niveau: 'erreur' | 'avertissement';
  message: string;
}

export interface ResultatValidation {
  valide: boolean;
  configuration: ConfigurationProduits | null;
  problemes: ProblemeConfig[];
}

/**
 * Valide une configuration brute et remonte en plus des avertissements non
 * bloquants (collisions d'en-tetes Excel entre produits, par exemple).
 */
export function validerConfiguration(brut: unknown): ResultatValidation {
  const resultat = configurationSchema.safeParse(brut);
  if (!resultat.success) {
    return {
      valide: false,
      configuration: null,
      problemes: resultat.error.issues.map((i) => ({
        niveau: 'erreur' as const,
        message: i.path.length ? `${i.path.join('.')} : ${i.message}` : i.message,
      })),
    };
  }

  const configuration = resultat.data as ConfigurationProduits;
  const problemes: ProblemeConfig[] = [];

  const produitsVus = new Set<string>();
  for (const p of configuration.produits) {
    if (produitsVus.has(p.id)) {
      problemes.push({ niveau: 'erreur', message: `identifiant de produit en double : "${p.id}"` });
    }
    produitsVus.add(p.id);
  }
  if (problemes.length) return { valide: false, configuration: null, problemes };

  problemes.push(...detecterCollisionsColonnes(configuration.produits));
  return { valide: true, configuration, problemes };
}

/**
 * Deux questions peuvent volontairement partager une colonne (pour comparer
 * deux produits sur un meme indicateur) mais pas avec des types differents :
 * Power BI se retrouverait avec une colonne de type mixte.
 */
function detecterCollisionsColonnes(produits: Produit[]): ProblemeConfig[] {
  const parColonne = new Map<string, { type: string; unite: string; origine: string }>();
  const problemes: ProblemeConfig[] = [];

  for (const p of produits) {
    for (const e of p.etapes) {
      for (const q of e.questions) {
        const colonne = colonneDeQuestion(q);
        const origine = `${p.id}/${e.id}/${q.id}`;
        const unite = q.unite ?? '';
        const precedent = parColonne.get(colonne);
        if (!precedent) {
          parColonne.set(colonne, { type: q.type, unite, origine });
          continue;
        }
        if (precedent.type !== q.type) {
          problemes.push({
            niveau: 'erreur',
            message: `colonne Excel "${colonne}" utilisee avec deux types differents (${precedent.origine} = ${precedent.type}, ${origine} = ${q.type})`,
          });
        } else if (precedent.unite !== unite) {
          problemes.push({
            niveau: 'avertissement',
            message: `colonne Excel "${colonne}" utilisee avec deux unites differentes ("${precedent.unite || '-'}" et "${unite || '-'}")`,
          });
        }
      }
    }
  }

  return problemes;
}

/** Propose un en-tete de colonne a partir d'un libelle, pour le mode admin. */
export function suggererColonne(libelle: string, unite?: string | null): string {
  const base = normaliserEntete(libelle);
  const suffixe = unite ? normaliserEntete(unite) : '';
  return suffixe ? `${base}_${suffixe}` : base;
}
