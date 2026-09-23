# Prompt — Refonte visuelle « identité Olmix » de l'application Saisie Production

> À copier-coller tel quel dans Claude (Claude Code / Cowork), dossier `Olmix-Saisie-Production` ouvert.

---

## 1. Contexte

Tu travailles sur une application de bureau **Electron + React 18 + TypeScript + Vite** déjà fonctionnelle : `Olmix — Saisie de fin de cycle de production`, utilisée par les opérateurs du site OLMIX de **Bréhan** (Bretagne). À la fin de chaque cycle, l'opérateur s'identifie, choisit un produit, répond aux questions étape par étape (avec une cartographie du process à droite), relit un récapitulatif et valide. Les données partent dans un classeur Excel cumulatif exploité par Power BI.

Lis d'abord **`README.md`**, puis `src/styles/tokens.css`, `src/styles/global.css`, `src/App.tsx`, tous les fichiers de `src/screens/` et `src/components/`, et regarde les captures actuelles dans `captures/`.

Dépendances déjà présentes et à privilégier : **`framer-motion`** (animations), `zustand`. Travaille **uniquement à la racine du projet** — ignore le sous-dossier `olmix-claude-epic-darwin-76lfdn/` (copie de travail).

## 2. Objectif

Refondre l'interface pour qu'elle reprenne **l'identité visuelle du site officiel https://olmix.com/fr/** — élégante, « nature & science », pétrole et vert, titres serif, animations douces au scroll — **sans rien perdre de l'efficacité en atelier** (saisie rapide, au doigt, lisible de loin, zéro attente).

Le résultat doit donner l'impression d'un outil interne « signé Olmix », cohérent avec le site, et non d'un template générique.

## 3. Contraintes non négociables

1. **Aucune régression fonctionnelle.** Ne modifie pas la logique métier : `electron/`, `shared/` (validation, colonnes Excel, schéma, cycle), `state/useSession.ts`. La refonte touche la couche visuelle (`src/styles/`, JSX/className des écrans et composants, nouveaux composants d'animation).
2. **Hors connexion total.** Aucune ressource chargée depuis Internet à l'exécution (pas de Google Fonts en CDN, pas d'images distantes). Polices à embarquer via `@fontsource/libre-baskerville` et `@fontsource/plus-jakarta-sans` (ou fichiers `.woff2` locaux). Vérifie que la CSP de `electron/main.ts` reste respectée.
3. **Ergonomie atelier conservée** : cibles tactiles ≥ 48 px (boutons principaux ≥ 64 px), texte de saisie ≥ 20 px, contraste AA minimum (AAA pour valeurs saisies), touche **Entrée** = étape suivante, focus visible.
4. **Les animations ne bloquent jamais l'opérateur** : aucun champ ni bouton désactivé pendant une animation, aucune transition > 800 ms sur le chemin de saisie, uniquement `transform` et `opacity` (60 fps sur un PC d'atelier modeste).
5. **`prefers-reduced-motion`** respecté + un réglage **« Animations réduites »** ajouté dans Admin → Réglages (utile sur postes lents). Les deux coupent les animations décoratives et gardent seulement des fondus courts (≤ 150 ms).
6. **Codes couleur métier intouchables** : orange = hors bornes (commentaire exigé), rouge = champ obligatoire manquant / erreur. Ils doivent rester immédiatement reconnaissables et distincts du vert de marque.
7. `npm run typecheck` et `npm test` doivent passer à la fin.

## 4. Identité visuelle Olmix (relevée sur olmix.com)

### 4.1 Palette — à centraliser dans `src/styles/tokens.css`

| Token | Valeur | Usage sur le site → usage dans l'app |
|---|---|---|
| `--olmix-petrole` | `#005263` | Couleur principale (titres, liens, fonds sombres) → titres, bouton principal, barre supérieure, fond des sections « chiffres » |
| `--olmix-vert` | `#269756` | Accent (sous-titres, bloc Plant Care) → succès, étapes validées, coches, surlignage |
| `--olmix-bleu` | `#007797` | Accent secondaire → liens, états actifs secondaires, focus |
| `--olmix-brume` | `#B1C9CF` | Bordures et traits fins → bordures de cartes, séparateurs, connecteurs de la cartographie |
| `--olmix-sauge` | `#808D88` | Gris-vert → textes secondaires, étapes « à venir » |
| `--olmix-texte` | `#212121` | Texte courant |
| `--olmix-blanc` | `#FFFFFF` | Fonds |
| `--olmix-degrade-1` | `linear-gradient(to right, #269756, #005263)` | Dégradé signature → bouton « Suivant », barre de progression, bandeaux |
| `--olmix-degrade-2` | `linear-gradient(to right, #808D88, #007797)` | Dégradé secondaire → éléments neutres/inactifs |
| `--olmix-surlignage` | `rgba(38,151,86,0.30)` | Surlignage « demi-texte » des mots clés |

Garde des tokens sémantiques séparés (`--alerte-orange`, `--erreur-rouge`) et dérive le **thème sombre** de la palette : fond pétrole très profond (≈ `#04232B` / `#062F38`), cartes `#0A3A45`, bordures `rgba(255,255,255,0.15)`, texte `#F2F7F8`, vert éclairci pour garder le contraste. Les deux thèmes doivent paraître « Olmix ».

### 4.2 Typographie

- **Titres : `Libre Baskerville` 400** (serif, jamais en gras — c'est la signature du site), couleur pétrole. Réservée aux titres ≥ 24 px : « Bonjour », nom d'étape, titres d'écran, noms de produits sur les cartes.
- **Tout le reste : `Plus Jakarta Sans`** (400 → 800) : libellés, champs, boutons, chiffres. Valeurs numériques en `font-variant-numeric: tabular-nums`.
- Ne jamais utiliser la serif dans un champ de saisie ou pour un nombre saisi (lisibilité atelier).

### 4.3 Motifs graphiques du site à transposer

- **Mot surligné « demi-texte »** : sur le site, « Le meilleur de *la nature* et de *la science* » — les mots clés ont une bande vert translucide sur la moitié basse du texte (`background-size: 100% 28%; background-position: 0 90%`). La bande se **dessine de gauche à droite** à l'apparition. À utiliser avec parcimonie : prénom de l'opérateur dans « Bonjour », mot clé du titre de l'écran de confirmation.
- **Blocs « solutions »** (Animal Care / Plant Care) : visuel en haut, **bande de couleur pleine en bas** (pétrole ou vert) avec le titre serif blanc souligné finement. → modèle pour les **cartes produit**.
- **Section « Chiffres clés »** : fond pétrole avec texture végétale discrète, cartes à **bordure fine blanche translucide**, petit sous-titre serif vert, **gros chiffre qui compte** (compteur animé), libellé dessous. → modèle pour le **récapitulatif** et la **confirmation**.
- **Filigrane** : grand motif de pousse/branche très pâle en arrière-plan derrière la section d'introduction. → fond de l'accueil.
- **Logo** : lignes organiques en forme de pousse avec racines, signature « for a better life ». Utilise le **fichier SVG officiel** que je déposerai dans `src/assets/olmix-logo.svg` (ne le redessine pas ; si le fichier est absent, laisse un emplacement propre avec le mot « OLMIX » en Plus Jakarta Sans). Pour les animations « trait qui se dessine », crée un **motif de pousse original et simple** (tige + 2–3 feuilles + racines en traits SVG), pas une copie du logo.
- Boutons en **pilule** (`border-radius: 200px`), ombres très douces, beaucoup de blanc, coins de cartes ≈ 16–20 px.
- Aucune photo distante : textures végétales et fonds générés en SVG/CSS (ou images locales que je fournirai dans `src/assets/`).

## 5. Système d'animation

Reproduis les sensations du site (thème Salient : apparition « fade-in-from-bottom » en cascade avec délais 0 / 150 / 300 ms, compteurs animés, traits SVG qui se dessinent, transitions fluides). Crée un petit module `src/lib/motion.ts` qui centralise :

```ts
// Courbes relevées sur olmix.com
export const ease = {
  out:    [0.3, 1, 0.3, 1],      // --nectar-cubic-bezier-out
  doux:   [0.25, 1, 0.33, 1],    // transitions boutons/survols
  inOut:  [0.76, 0, 0.24, 1],    // --nectar-cubic-bezier-in-out
};
export const duree = { rapide: 0.2, base: 0.45, lente: 0.65, scene: 0.8 };
export const cascade = 0.15; // décalage entre éléments successifs
```

Et des composants réutilisables : `<Apparition>` (fade + montée 24 px, déclenché à l'entrée dans le viewport), `<Cascade>` (enfants décalés de 150 ms), `<Compteur>` (compte de 0 à N, ease-out, ≈ 1,2 s, léger flou de mouvement au départ comme les « milestones » du site), `<TraitDessine>` (SVG `pathLength` 0 → 1), `<Surlignage>` (bande qui se dessine). Tous doivent lire le réglage « Animations réduites ».

## 6. Écran par écran

### Barre supérieure
Fond blanc (sombre : pétrole profond), logo Olmix à gauche, titre en Plus Jakarta Sans 600. Barre de progression en **dégradé signature** qui s'allonge avec `ease.out`. Pastilles (produit, opérateur, état Excel) en pilules à bordure `--olmix-brume`. Indicateur Excel : point vert qui « respire » doucement quand tout est à jour, orange qui pulse quand des saisies sont en attente.

### Accueil
- Au premier lancement de la journée : **mini-splash ≤ 1,2 s** (le motif de pousse se dessine, le logo apparaît en fondu), passable d'un clic ou d'une touche. Jamais rejoué dans la même session.
- Filigrane de pousse géant et très pâle en fond, avec une légère dérive lente (ou parallaxe discrète à la souris).
- Titre serif « Bonjour, **Marc** » avec le prénom surligné (bande qui se dessine dès que le nom est saisi). Remplace l'emoji 👋.
- **Cartes produit façon blocs « solutions »** : zone visuelle en haut (texture/pictogramme sur dégradé de la couleur du produit), **bande pleine en bas** avec le nom en serif blanc souligné, puis pastilles « 5 étapes · 25 questions » dont les chiffres comptent. Apparition en cascade (0/150/300 ms). Survol/toucher : la carte monte de 4 px, le visuel zoome à 1,05 en 0,65 s, le soulignement du titre s'allonge. Appui : `scale(0.98)`.

### Formulaire
- Transition d'étape : l'ancienne sort vers la gauche/fondu, la nouvelle entre depuis la droite (0,45 s `ease.out`) ; sens inversé sur « Précédent ».
- Titre d'étape en serif pétrole, icône dans une pastille.
- Cartes de questions en cascade rapide (50–80 ms, total < 400 ms). Quand une question devient valide, la coche verte **se dessine**.
- Hors bornes : la carte passe à l'orange avec **une seule** petite secousse (6 px), le champ commentaire se déploie en hauteur avec fondu.
- Champ manquant au clic sur « Suivant » : pulsation rouge unique + défilement doux vers le premier champ fautif.
- **Bouton « Suivant »** en pilule, dégradé signature, flèche qui glisse de 4 px au survol, léger reflet qui balaie le bouton quand l'étape devient complète.

### Cartographie du process (panneau droit)
- Étape en cours : pastille dégradé avec **anneau vert qui pulse** lentement.
- Étapes terminées : coche qui se dessine, et le **connecteur vers l'étape suivante se trace** (TraitDessine) au moment où l'on valide l'étape.
- Étapes à venir : sauge désaturée. Changement d'étape : la surbrillance glisse d'une étape à l'autre (`layoutId` framer-motion).

### Récapitulatif
- En-tête inspiré de la section « Chiffres clés » : bandeau pétrole avec texture végétale discrète, 3–4 cartes à bordure fine translucide (Étapes · Réponses · Alertes · Durée de saisie), sous-titre serif vert, **gros chiffres animés**.
- Blocs par étape qui apparaissent en cascade ; bouton « Modifier » en pilule secondaire.

### Confirmation
- Le motif de pousse **se dessine et « pousse »** (tige puis feuilles), puis une coche verte ; titre serif avec un mot surligné (« Cycle **enregistré** »).
- Identifiant du cycle et état de l'export dans des cartes façon « chiffres clés ».
- Retour automatique à l'accueil (8 s) matérialisé par un **anneau/barre de progression** en dégradé signature, avec bouton « Nouvelle saisie » pour ne pas attendre.

### Administration
Même charte, plus sobre : animations limitées aux fondus et aux transitions d'onglets. Ajoute le réglage « Animations réduites » dans Réglages.

## 7. Méthode de travail attendue

1. **Explore** le code et les captures, puis présente-moi un **plan court** (fichiers touchés, nouveaux composants, dépendances ajoutées) avant d'écrire du code.
2. Commence par `tokens.css` + polices + `motion.ts` + composants d'animation, puis écran par écran dans l'ordre : Accueil → Formulaire + Cartographie → Récapitulatif → Confirmation → Barre supérieure → Admin.
3. Après chaque écran : `npm run typecheck`, puis régénère les captures avec `node scripts/captures.mjs` et regarde-les toi-même (thème clair **et** sombre) pour corriger ce qui ne va pas.
4. À la fin : `npm test`, captures finales, et un court résumé des changements + ce qui reste éventuellement à fournir (logo SVG officiel, photos locales).
5. Si un choix de design entre en conflit avec l'ergonomie atelier, **l'ergonomie gagne** — signale-le moi.

## 8. Critères d'acceptation

- [ ] Mis côte à côte avec olmix.com, l'app est reconnaissable comme « Olmix » : pétrole/vert, titres Libre Baskerville, pilules, mots surlignés, cartes type « solutions » et « chiffres clés ».
- [ ] Animations visibles et soignées (apparitions en cascade, compteurs, traits qui se dessinent, transitions d'étapes, cartographie animée) mais jamais bloquantes.
- [ ] « Animations réduites » et `prefers-reduced-motion` coupent tout le décoratif.
- [ ] Thèmes clair et sombre cohérents et contrastés.
- [ ] Orange = hors bornes, rouge = manquant : inchangés et évidents.
- [ ] Fonctionne 100 % hors ligne (polices embarquées, aucune requête réseau).
- [ ] `npm run typecheck` et `npm test` passent ; captures mises à jour dans `captures/`.
