# Mes comptes

Application de comptes personnels et professionnels pour les micro-entrepreneurs et indépendants français, **qui ne sont pas techniciens**. Un seul fichier HTML livré : `dist/mes-comptes.html`.

## Règles de travail avec Olivier

- **Pas de captures d'écran.** Compte rendu en **3 lignes**, sans jargon technique.
- À la fin de chaque étape : `open dist/mes-comptes.html`, puis donner le chemin exact en une ligne.
- Quand Olivier demande d'attendre d'autres instructions, ne rien lancer avant son feu vert.
- **Ne jamais toucher au dossier Hara** (`~/site en cours/veronique/vero mag`).
- Ne jamais mettre de vraies données bancaires (nom, adresse, IBAN, opérations) dans le dépôt ni dans les tests : reproduire les formats avec des données fictives.
- Commits en français, terminés par la ligne `Co-Authored-By` indiquée par Claude Code.

## Contraintes du produit

- **Un seul fichier** autonome, CSS et JS intégrés. Bibliothèques depuis un CDN seulement : pdf.js 3.11.174, SheetJS 0.18.5, Lucide 0.460.0, Google Fonts (Plus Jakarta Sans). Pas de service worker.
- **Aucune donnée ne quitte l'appareil** : `localStorage` (clé `mes-comptes-v1`, toujours dans un try/catch), sauvegarde et restauration en JSON. Le code `window.claude` reste inactif et invisible hors de claude.ai.
- **Schéma versionné** (`SCHEMA` dans `00-base.js`, migrations dans `migrateSchema`, `07-stockage.js`) : aucune perte de données, et les champs inconnus sont gardés.
- Performance : moins de 0,5 s avec environ 5 000 opérations, et aucune erreur dans la console.

## Vocabulaire et présentation

- Français simple. Jamais à l'écran : « provision », « trésorerie », « matelas », « lissé », « point mort », « taux horaire ».
- Les mots **URSSAF**, **comptable**, **Jost** et **Bodoni** ne doivent apparaître nulle part dans `dist/` (un test le vérifie). Dans le code, écrire `URS{2}AF` dans les expressions régulières et parler de « cotisations sociales » dans les commentaires.
- « Cotisations » n'apparaît que dans la fenêtre de calcul et dans « Cotisations et impôts à garder de côté ».
- Police Plus Jakarta Sans uniquement. Texte ≥ 18 px sur mobile et ≥ 17 px sur ordinateur, rien sous 15 px, zones tactiles ≥ 44 px.
- Couleurs d'état : **vert tendre** (tout va bien), orange, rouge. L'or reste décoratif.

## Construire et tester

```
npm run build    # src/ → dist/mes-comptes.html
npm test         # build + tests Playwright (Chromium)
```

- `scripts/build.mjs` insère `src/styles.css` et `src/js/*.js` (triés par nom) dans `src/index.html`, aux emplacements `/*@CSS*/` et `//@JS`.
- Tests : `tests/*.spec.js`. Les bibliothèques CDN sont servies depuis `node_modules` (`tests/helpers.js`). Les relevés PDF fictifs sont générés avec pdf-lib : `tests/releves.js`, et `tests/banques.js` (12 banques, un format sans en-tête et un format BforBank).
- Version d'origine conservée pour comparaison : `reference/mes-comptes-v1.html`.

## Organisation du code (`src/js/`)

| Fichier | Rôle |
|---|---|
| `00-base.js` | Schéma, réglages par défaut (`SET0`, objectif 2 500 €/mois), rubriques (`CATS0`), reconnaissance d'office (`autoCatOf`, `appliqueAuto`), mots-clés, liens internes et remboursements |
| `01-marchands.js` | Nom du marchand (`merchantOf`), suggestions (`kwSuggest`) |
| `02-pdf.js`, `02b-lecture.js` | Lecture des relevés : plusieurs méthodes (colonnes, lignes, grappes, lecteurs appris), puis contrôle par les soldes |
| `03-lecteurs.js` | Lecteurs appris ou partagés, dates |
| `05-import.js` | Import, doublons, rapprochement entre copier-coller et relevé |
| `06-periodes.js` | Calculs par mois, trimestre ou année (`aggRaw`, `agg`) |
| `07-stockage.js` | Enregistrement, migrations |
| `08*-*.js` | Rendu commun, rubriques, outils (collage, assistant en 3 gestes) |
| `10*-*.js` | Statistiques, heures, vrai salaire, juste prix |
| `12` à `19` | Revue de l'année, sauvegarde, actions, démo, Accueil, Réglages, Bilan, salaire, Mes objectifs |
| `99-lancement.js` | Démarrage (`initStore()`), toujours en dernier |

## Lecture des relevés : règles à garder

- Une ligne qui contient **SOLDE**, **TOTAL** ou **MONTANT COMPTABILISÉ** n'est jamais une opération (`estHorsOp`). Exceptions : « solde de tout compte », et une station TOTAL payée par carte.
- **Contrôle** : ancien solde + opérations lues = nouveau solde. Si l'écart vaut exactement une ou deux lignes lues, elles sont nommées à l'utilisateur (`suspects`).
- **Carte à débit différé** : si le détail des achats carte tombe exactement sur la ligne « Règlement cartes débit différé », le détail est gardé et la ligne groupée est écartée (`sansDoubleCarte`).
- Un nouveau tableau dans le relevé (en-tête Débit/Crédit) remplace les colonnes précédentes. Un montant seul sur la ligne suivante complète l'opération d'au-dessus.

## Rubriques particulières

- **Épargne et placements** (`epargne`) : neutre, ni dépense ni rentrée, dans les deux sens. Reconnue d'office : assurance vie, livret, PEA, PER, placement, etc.
- **Retraite et pensions** (`retraite`) : rentrée perso, jamais un revenu de l'activité. Reconnue d'office sur les rentrées de caisses de retraite.
- **Cotisations sociales** : toujours rangées dans `cotisations` (activité), même depuis un compte perso. Elles sont déduites de « à garder de côté », jamais comptées comme une dépense du foyer.

## Reste à faire

- `LISEZMOI.md` (pour Olivier : hébergement sur Netlify ou Squarespace, mise à jour).
- `GUIDE-UTILISATEUR.md` (court, sans jargon : ouvrir l'application, importer, sauvegarder, changer d'appareil, données liées au navigateur).
- Manifeste intégré, pour un joli nom et une icône sur l'écran d'accueil de l'iPhone.
