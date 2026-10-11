# Mes comptes : mettre en ligne et mettre à jour (pour Olivier)

## Les deux applications
- **Mes comptes** (indépendants) : `en-ligne/mes-comptes/index.html`
- **Mon compte** (salariés) : `en-ligne/mon-compte/index.html`

Les dossiers `en-ligne/` se refont à chaque construction : `node scripts/build.mjs` (ou `npm test`, qui reconstruit puis teste).

## Mettre en ligne sur Netlify (glisser-déposer)
1. Créez un compte gratuit sur netlify.com (sans compte, un site déposé disparaît au bout d'une heure).
2. Allez sur **app.netlify.com/drop**.
3. Faites glisser le dossier **`mes-comptes`** (pas `en-ligne`, pas `dist`) sur la zone de dépôt. Vous obtenez une adresse en `.netlify.app`.
4. Dans « Site configuration », « Change site name », choisissez le nom définitif **avant de partager le lien**.
5. Recommencez avec le dossier **`mon-compte`** : c'est un deuxième site, avec son propre lien.

## Mettre à jour
Reconstruisez, ouvrez le site dans Netlify, onglet **Deploys**, et déposez de nouveau le dossier. Le lien reste le même, et les données des utilisateurs sont conservées.

## Le badge « Netlify »
Un petit badge peut s'afficher sur la page en ligne. **Il suffit de cliquer dessus pour l'enlever.** Cela ne touche pas aux données.

## Données et sauvegardes
- Les données de chaque personne sont dans **son** navigateur, liées à l'**adresse** du site : changer le nom du site après l'envoi du lien fait repartir chacun de zéro. Fixez les noms avant de partager.
- La version fichier (ouverte depuis l'ordinateur) et la version en ligne ont chacune leurs données : passez de l'une à l'autre par **Sauvegarder mes données** puis **Restaurer une sauvegarde**.
- Chaque application refuse la sauvegarde de l'autre.
