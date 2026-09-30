# EventApp

Application multi-événements de partage de photos, vidéos et live, avec comptes organisateurs, accès invités et administration de plateforme séparée.

## Adresses

- Landing publique : `https://kitout3.github.io/Event-app/`.
- Compte organisateur / accès invité privé : `https://kitout3.github.io/Event-app/account.html`.
- Espace invité d’un événement : `https://kitout3.github.io/Event-app/?w=<identifiant-de-l-evenement>`.
- Administration d’un événement : `https://kitout3.github.io/Event-app/?w=<identifiant-de-l-evenement>#admin`.
- Administration globale : `https://kitout3.github.io/Event-app/admin.html`.

La racine est désormais une landing publique EventApp : proposition de valeur, tarif, fonctionnement, accès par lien/code et accès privé. Aucun événement n’est sélectionné automatiquement. Un identifiant invalide ne bascule jamais vers un autre événement et aucun annuaire public n’est affiché.

## Fonctionnalités

- Plusieurs événements par compte organisateur.
- Photos, galerie, réactions et téléchargement complet en ZIP.
- Messages vidéo, modération et export.
- Affichage TV, diaporama et mosaïque progressive.
- Diffusion en direct.
- QR code, programme et informations pratiques.
- Français, anglais, vietnamien et allemand.
- Paiement unique par événement.
- Administration globale séparée de l’administration de chaque événement.

## Développement

```sh
npm ci
npm run dev
npm test
npm run build
```

Node.js 20 ou supérieur. Le résultat du build est dans `dist/`.

La configuration web Firebase publiée est conservée dans `config/firebase.public.json`. Ces identifiants publics ne donnent aucun accès administrateur : les règles Firestore/Storage et l’authentification protègent les données. Ne jamais ajouter de compte de service, de clé privée ou de secret administrateur au code ou aux variables `VITE_`.

Les variables `VITE_FIREBASE_*` peuvent remplacer les valeurs publiques lors du build. La configuration navigateur est produite automatiquement dans `firebase-config.js`.

## Tests

`npm test` vérifie notamment :

- l’isolation des comptes organisateurs ;
- l’accès invité et les événements privés ;
- l’absence de repli inter-événements ;
- le ZIP contenant toutes les photos ;
- les traductions et principales régressions fonctionnelles ;
- la mosaïque TV.

Le workflow `Browser smoke tests` ajoute une validation Playwright sur Chromium desktop et WebKit/iPhone pour la landing, la tarification, les deux parcours d’accès invité et les liens juridiques.

## SEO et confiance

La landing possède title, description, canonical et métadonnées Open Graph/Twitter. `robots.txt` et `sitemap.xml` sont publiés depuis `public/` ; les espaces compte et admin restent exclus de l’indexation.

Les pages suivantes sont disponibles :

- `privacy.html` ;
- `terms.html` ;
- `legal.html`.

Les coordonnées juridiques de l’éditeur ne figurent pas dans le dépôt et ne sont donc pas inventées. `LEGAL_TODO.md` liste les informations vérifiées à renseigner avant commercialisation.

## Hébergement et domaine personnalisé

Le chemin de base est `/` pour un domaine personnalisé. Sur GitHub Pages, `.github/workflows/deploy.yml` utilise `VITE_APP_BASE_PATH=./` afin que le build reste valide après un renommage du dépôt.

Pour raccorder un domaine personnalisé :

1. disposer du domaine et de l’accès DNS ;
2. configurer l’hôte auprès de la plateforme de publication retenue ;
3. reporter uniquement les enregistrements DNS fournis par cette plateforme ;
4. ajouter le domaine dans les domaines autorisés Firebase Authentication ;
5. vérifier les restrictions d’origine et le CORS du bucket ;
6. remplacer l’URL GitHub Pages dans le canonical, `robots.txt` et `sitemap.xml` par le domaine de production.

## Sécurité multi-tenant

Les événements restent indépendants. Les organisateurs n’obtiennent que leurs événements via les Cloud Functions prévues à cet effet. L’administrateur global conserve l’accès plateforme. Les suppressions sensibles d’événements passent par le serveur afin de ne pas contourner le nettoyage des médias et l’historique de facturation.

Les tests automatisés ne remplacent pas une recette de production avec de vrais comptes Firebase, notamment pour l’authentification, le paiement, l’envoi de médias et les téléchargements Android/iOS.
