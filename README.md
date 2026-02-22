# Windspotter

PWA de prévisions vent pour les spots de wingfoil en Suisse romande. Affiche les prévisions MétéoSuisse, calcule les créneaux navigables et envoie des notifications push matinales.

## Fonctionnalités

- **Prévisions vent** : vitesse, rafales, direction et ensoleillement par heure, sur 1 à 3 jours
- **Créneaux navigables** : calcul automatique des fenêtres de navigation selon des seuils personnalisables (vent min, rafales min, heures consécutives)
- **Vue liste** : cartes par spot avec graphique vent (Recharts) et badge navigabilité
- **Vue carte** : carte Leaflet interactive avec slider horaire pour visualiser la navigabilité heure par heure
- **Météo en temps réel** : conditions actuelles depuis les stations SMN (MétéoSuisse)
- **Température de l'eau** : données Alplakes/EAWAG pour les lacs suisses
- **Notifications push** : alerte matinale personnalisée si des spots sont navigables (Web Push API + VAPID)
- **Préférences utilisateur** : seuils de vent, nombre de jours de prévision, sélection de spots
- **PWA installable** : fonctionne hors ligne, installable sur mobile et desktop
- **Dark mode** : suit les préférences système
- **Admin** : gestion des spots, des utilisateurs, heure de notification configurable, notification de test

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4 |
| Cartographie | Leaflet + React Leaflet |
| Graphiques | Recharts |
| Backend | Firebase Cloud Functions v2 (Node.js 20) |
| Base de données | Cloud Firestore |
| Auth | Firebase Authentication (email/password) |
| Notifications | Web Push API, web-push (npm), VAPID |
| PWA | vite-plugin-pwa (injectManifest), Workbox |
| Hosting | Cloudflare Pages (frontend), Firebase (functions) |
| Région | europe-west6 (Zurich) |

## Structure du projet

```
windspotter/
├── src/
│   ├── components/       # Composants React (SpotCard, SpotMap, Modal, Admin...)
│   ├── hooks/            # Hooks custom (useForecast, useConfig, useNotifications...)
│   ├── contexts/         # AuthContext (auth, préférences, admin)
│   ├── config/           # Configuration Firebase
│   ├── types/            # Types TypeScript (forecast, user)
│   ├── utils/            # Navigabilité, direction vent, formatage
│   ├── sw.ts             # Service Worker custom (precache, push, cache runtime)
│   ├── App.tsx           # Composant principal
│   └── main.tsx          # Point d'entrée React
├── functions/
│   ├── src/
│   │   ├── index.ts      # Exports des Cloud Functions
│   │   ├── meteo.ts      # Fetch données MétéoSuisse (CSV)
│   │   ├── alplakes.ts   # Fetch température eau (Alplakes API)
│   │   ├── navigability.ts # Calcul des créneaux navigables
│   │   ├── notifications.ts # Notifications push (schedulée + test)
│   │   ├── admin.ts      # Fonctions admin (listUsers, deleteUser)
│   │   └── types.ts      # Types partagés backend
│   └── package.json
├── public/               # Icônes PWA, favicon
├── firestore.rules       # Règles de sécurité Firestore
├── firebase.json         # Configuration Firebase
└── vite.config.ts        # Config Vite + PWA
```

## APIs externes

### MétéoSuisse (prévisions)
- Source : `data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting/`
- Paramètres : vitesse vent (`fu3010h0`), rafales (`fu3010h1`), direction (`dkl010h0`), ensoleillement (`sre000h0`)
- Format CSV, encodage Latin1
- Mécanisme de retry (essaie les 3 dernières heures si la dernière n'est pas disponible)

### MétéoSuisse (conditions actuelles)
- Source : `data.geo.admin.ch/ch.meteoschweiz.messwerte-aktuell/VQHA80.csv`
- Mise à jour toutes les 10 minutes
- Données : température, vent, rafales par station SMN

### Alplakes / EAWAG
- Source : `alplakes-eawag.s3.eu-central-1.amazonaws.com`
- Température et profondeur de l'eau pour les lacs suisses
- Lacs supportés : Léman, Neuchâtel, Joux, Bret

## Cloud Functions

| Fonction | Type | Description |
|----------|------|-------------|
| `refreshForecast` | Callable | Récupère les CSV MétéoSuisse + températures Alplakes, calcule la navigabilité, stocke dans Firestore. Verrou anti-concurrence, cache 1h. |
| `sendDailyNotifications` | Scheduled | S'exécute chaque heure de 6h à 9h (Europe/Zurich). Envoie les notifications push si l'heure correspond à l'heure configurée. |
| `sendTestNotification` | Callable (admin) | Envoie une notification de test à l'admin connecté. |
| `listUsers` | Callable (admin) | Liste tous les utilisateurs Firebase Auth. |
| `deleteUser` | Callable (admin) | Supprime un utilisateur et ses données Firestore. |

## Collections Firestore

| Collection / Document | Description |
|----------------------|-------------|
| `config/spots` | Liste des spots configurés (nom, coordonnées, station SMN, lac) |
| `config/navigability` | Seuils globaux de navigabilité (vent min/max, rafales, heures consécutives, plage horaire) |
| `config/notifications` | Heure d'envoi des notifications matinales |
| `forecasts/latest` | Dernières prévisions pour tous les spots |
| `users/{uid}/settings/preferences` | Préférences utilisateur (seuils, spots sélectionnés, jours de prévision) |
| `pushSubscriptions/{uid}` | Souscription push Web Push par utilisateur |

## Installation & développement

### Prérequis

- Node.js 20+
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- Un projet Firebase avec Auth + Firestore activés

### Setup

```bash
# Cloner le repo
git clone https://github.com/gpoffet/windspotter.git
cd windspotter

# Installer les dépendances
npm install
cd functions && npm install && cd ..

# Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs Firebase et VAPID dans .env
```

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_VAPID_PUBLIC_KEY=...
```

Pour les Cloud Functions, configurer les secrets Firebase :

```bash
firebase functions:secrets:set VAPID_PUBLIC_KEY
firebase functions:secrets:set VAPID_PRIVATE_KEY
```

Pour générer une paire de clés VAPID :

```bash
npx web-push generate-vapid-keys
```

### Développement

```bash
# Lancer le serveur de dev
npm run dev

# Lancer les émulateurs Firebase (functions + firestore)
npm run emulators
```

### Build

```bash
# Build frontend (TypeScript check + Vite + Service Worker)
npm run build

# Build Cloud Functions
npm run build:functions
```

### Déploiement

```bash
# Frontend : push sur GitHub → Cloudflare Pages build automatique

# Cloud Functions
npm run deploy:functions

# Règles Firestore
npm run deploy:rules
```

### Initialisation de la base de données

```bash
cd functions
npm run seed    # Crée les documents config/spots et config/navigability
```

### Donner les droits admin à un utilisateur

```bash
cd functions
npm run build
node lib/setAdmin.js <uid>
```

## Notifications push

### Architecture

1. **Client** : `useNotifications` hook gère l'abonnement via `PushManager.subscribe()` avec la clé VAPID publique
2. **Stockage** : la souscription est enregistrée dans `pushSubscriptions/{uid}` dans Firestore
3. **Envoi** : la Cloud Function `sendDailyNotifications` lit les souscriptions, calcule la navigabilité selon les préférences de chaque utilisateur, et envoie via `web-push`
4. **Service Worker** : `src/sw.ts` gère l'événement `push` et affiche la notification système

### Contenu de la notification

Pour chaque spot navigable, une ligne :
```
{spotName}: {avgSpeed}-{avgGust} km/h {direction} ({startH}h-{endH}h)
```
Maximum 4 spots affichés, avec "... et X autres" si plus.

### Comportement mobile

Sur mobile, la popup de permission Android peut causer le démontage du composant React. Un mécanisme de reprise via `localStorage` permet de finaliser l'abonnement au prochain montage du composant.

## Licence

Projet privé.
