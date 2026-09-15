# 💍 Mariage App

## 🚀 Déploiement en 5 étapes

---

### Étape 1 — Configurer les clés Firebase (localement)

Duplique le fichier `.env.example` et renomme-le `.env` :
```
.env.example  →  .env
```

Ouvre `.env` et remplis avec tes vraies clés Firebase (disponibles dans la console Firebase → ⚙️ Paramètres → Vos applications) :
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=ton-projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ton-projet
VITE_FIREBASE_STORAGE_BUCKET=ton-projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456...
VITE_FIREBASE_APP_ID=1:123456:web:abc...
```

---

### Étape 2 — Configurer le nom du repo

Dans `vite.config.js`, remplace `mariage-app` par le nom exact de ton repo GitHub :
```js
base: '/TON-NOM-DE-REPO/',
```

---

### Étape 3 — Créer le repo GitHub et pusher

```bash
npm install
git init
git add .
git commit -m "premier commit"
git remote add origin https://github.com/TONPSEUDO/mariage-app.git
git push -u origin main
```

---

### Étape 4 — Ajouter les secrets dans GitHub

Dans ton repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**

Ajoute chaque clé une par une (même noms que dans `.env`) :
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

---

### Étape 5 — Activer GitHub Pages

Dans ton repo GitHub → **Settings → Pages**
- Source : **Deploy from a branch**
- Branch : **gh-pages** → **/root**
- Clique **Save**

Le déploiement se fait automatiquement à chaque `git push` grâce au fichier `.github/workflows/deploy.yml` ✅

Ton site sera sur : `https://TONPSEUDO.github.io/mariage-app`

---

### Étape 6 — Autoriser le domaine dans Firebase

Console Firebase → ⚙️ **Paramètres du projet → Authorized domains → Add domain** :
```
TONPSEUDO.github.io
```

---

## 📱 Pages de l'app

| URL | Page |
|-----|------|
| `/` | Accueil |
| `/#upload` | Upload photo (QR code invités) |
| `/#gallery` | Galerie + likes |
| `/#live` | Affichage TV plein écran |
| `/#admin` | Administration (mot de passe : `admin123`) |

## 📩 Envoi des sélections par e-mail

Le parcours invité ne demande aucun compte : l'invité sélectionne ses photos et
vidéos, saisit son e-mail, puis reçoit un lien temporaire valable 14 jours. Les
photos ajoutées depuis cette version conservent à la fois un aperçu optimisé et le
fichier original. Les anciens médias ne sont ni modifiés ni supprimés.

Le backend utilise les fonctions Firebase `createMediaSelection` et
`getMediaSelection`. L'envoi est confié à l'extension officielle **Trigger Email** :

1. Installer `firebase/firestore-send-email` sur le projet `mariage-hq`.
2. Choisir `mail` comme collection de documents e-mail.
3. Renseigner le serveur SMTP et l'adresse expéditrice dans l'extension.
4. Déployer les fonctions avec `firebase deploy --only functions`.

Les sélections sont limitées à 200 fichiers. Le serveur vérifie que chaque média
existe et est validé avant de créer le lien ; les URL envoyées par le navigateur ne
sont jamais acceptées directement.

---

## 🔒 Sécurité

- Le fichier `.env` est dans `.gitignore` → tes clés ne seront **jamais** visibles sur GitHub
- Les clés sont injectées au moment du build via les GitHub Secrets
- Change le mot de passe admin dans les paramètres de l'app !
