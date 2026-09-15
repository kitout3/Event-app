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

## ⬇️ Téléchargement des sélections

L'invité sélectionne ses photos et vidéos puis les télécharge directement sur son
appareil, sans compte et sans adresse e-mail. Plusieurs photos sont regroupées dans
des archives ZIP sans recompression. Les vidéos sont téléchargées individuellement
afin de ne pas saturer la mémoire des appareils mobiles.

Les nouvelles photos conservent à la fois un aperçu optimisé pour la galerie et le
fichier original destiné au téléchargement. Les anciens médias ne sont ni modifiés
ni supprimés.

---

## 🔒 Sécurité

- Le fichier `.env` est dans `.gitignore` → tes clés ne seront **jamais** visibles sur GitHub
- Les clés sont injectées au moment du build via les GitHub Secrets
- Change le mot de passe admin dans les paramètres de l'app !
