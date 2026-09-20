# Event-App

Application multi-événements de partage de photos, vidéos et live, avec comptes organisateurs et administration de plateforme séparée.

## Dépôt et données

Le code complet est dans **kitout3/Event-app**. Firebase **mariage-hq** conserve les comptes, les documents et les médias existants ; aucune migration de données n’est nécessaire pour changer l’adresse du site.

- Accueil / compte : `https://kitout3.github.io/Event-app/`.
- Espace invités : `https://kitout3.github.io/Event-app/?w=<identifiant-de-l-evenement>`.
- Administration d’un événement : `https://kitout3.github.io/Event-app/?w=<identifiant-de-l-evenement>#admin`.
- Administration de la plateforme : `https://kitout3.github.io/Event-app/admin.html`, réservée au propriétaire via Firebase Authentication et les contrôles des Cloud Functions.
- L’adresse racine affiche désormais l’espace compte Event-App (création de compte ou connexion). Aucun événement n’est sélectionné automatiquement.
- Un identifiant invalide ne bascule jamais vers un autre mariage. Aucun annuaire public n’est affiché sur l’accueil.

## Développement

```sh
npm ci
npm run dev
npm test
npm run build
```

Node.js 20 ou supérieur. Le résultat du build est dans `dist/`.

La configuration web Firebase déjà publiée est conservée dans `config/firebase.public.json`. Ces identifiants publics ne donnent aucun accès administrateur : les règles Firestore/Storage et l’authentification protègent les données. Ne jamais ajouter de compte de service, de clé privée ou de secret administrateur au code ou aux variables `VITE_`.

Les variables `VITE_FIREBASE_*` peuvent remplacer les valeurs publiques lors du build. La configuration navigateur est produite automatiquement dans `firebase-config.js` ; une absence de configuration n’active pas de galerie fictive en production.

## Hébergement et adresses

Le chemin de base est `/` pour un domaine personnalisé. Sur GitHub Pages, le workflow `.github/workflows/deploy.yml` utilise `VITE_APP_BASE_PATH=./` afin que le build reste valide après un renommage du dépôt.

Le manifeste `.openai/hosting.json` identifie le site Sites. Le code est également transmis à son dépôt de publication, mais GitHub demeure le dépôt utilisateur. Une modification sur GitHub déclenche GitHub Pages ; une nouvelle version Sites doit être publiée pour actualiser l’adresse Sites. Ne pas confondre ces deux déploiements.

### Raccorder un domaine personnalisé

1. Disposer du domaine souhaité et de l’accès à son DNS.
2. Ajouter le nom d’hôte exact au site publié dans Sites.
3. Reporter **les enregistrements DNS renvoyés par Sites**, puis attendre la validation et le certificat HTTPS. Ne pas inventer de cible DNS ou de fichier CNAME.
4. Vérifier le domaine dans Firebase Authentication (domaines autorisés) et les éventuelles restrictions d’origine de la clé API web.
5. Vérifier le téléchargement de médias depuis cette origine ; si une requête est refusée par CORS, ajouter l’origine exacte à la configuration existante du bucket sans supprimer les origines encore utilisées.

Aucun domaine payant n’est acheté ou configuré automatiquement. Le nom définitif doit être fourni avant le raccordement.

## Fonctionnalités conservées

- Photos, galerie, réactions et téléchargement de sélections.
- Messages vidéo, modération et export.
- Affichage TV et cérémonie en direct.
- Français, anglais, vietnamien et allemand.
- Création, modification, activation, accès et suppression des mariages depuis l’administration existante.

Les liens ouverts depuis l’administration, les QR codes et la navigation des invités restent sur le domaine consulté. Les anciens liens de mariage peuvent être collés dans le nouvel accueil. Les redirections vers le direct et les clics de notifications conservent l’identifiant du mariage.

## Validation

`npm test` vérifie notamment la sélection des mariages, l’absence de repli inter-mariages, les origines des liens et les protections existantes. Avant la mise en service d’un nouveau domaine, contrôler avec un compte autorisé la connexion administrateur, puis un dépôt et un téléchargement de média. Les tests automatisés ne remplacent pas cette vérification de la configuration Firebase en production.

### État de la migration au 19 septembre 2026

Les builds racine et GitHub Pages et les huit contrôles automatisés passent. La lecture du mariage existant depuis la nouvelle origine est acceptée par Firestore. Le contrôle HTTP d’un média a confirmé que Firebase Storage renvoie actuellement l’autorisation CORS pour `https://kitout3.github.io`, mais pas pour `https://espace-mariage.kitout.chatgpt.site`. Le fichier `cors.json` inclut les deux origines ; cette configuration **reste à appliquer au bucket** avec un compte autorisé, puis à vérifier. Le dernier workflow backend a ignoré son déploiement car le secret du compte de service était absent. La connexion administrateur et les envois de médias n’ont pas été testés avec un compte utilisateur ; aucun mariage ou média de production n’a été créé, modifié ou supprimé pendant la validation. Le contrôle visuel était indisponible dans l’environnement d’aperçu.
