# CR Automatique 2 — Rebuild 2025 

Cette itération reconstruit l'application de compte-rendu automatique en respectant la parité d'écrans et de fonctionnalités tout en renforçant le pipeline local (FFmpeg + Whisper) et l'intégration OpenAI. Le dépôt expose :

- un **backend Node.js/Express** orchestrant une file de jobs persistante, le prétraitement audio local, la transcription Whisper, la synthèse OpenAI et l'export des livrables (TXT/Markdown/VTT) ;
- un **frontend React/Vite** reprenant la charte originale (dashboard, historique, configuration, gabarits) avec une architecture déclarative et un polling résilient ;
- une **documentation complète** et des **tests automatisés** couvrant les workflows critiques.

## Vue d'ensemble du pipeline

1. **Upload** : l'utilisateur soumet un média (audio/vidéo) et choisit un gabarit de synthèse ;
2. **Prétraitement** : le backend normalise le flux audio localement via FFmpeg (mono, 16 kHz) ;
3. **Transcription** : la CLI Whisper locale génère texte et segments ;
4. **Synthèse** : le texte obtenu est enrichi via l'API OpenAI (prompts basés sur les gabarits et participants) ;
5. **Exports** : les artefacts sont écrits sur disque (`transcription_raw.txt`, `summary.md`, `subtitles.vtt`) et exposés via l'API ;
6. **Restitution** : le frontend affiche progression, logs et permet le téléchargement des exports.

Tous les traitements audio restent locaux. En cas d'absence de réseau ou de clé OpenAI, les jobs aboutissent jusqu'à la transcription : la synthèse est simplement ignorée et un avertissement est consigné.

## Arborescence

```
backend/                API Express + pipeline + tests
frontend/               SPA React (Vite)
docs/                   Guides architecture, opérations, sécurité, observabilité
samples/                Génération d'exemples audio/exports
install.sh / install.ps1 Installation automatisée dépendances + Whisper
start.ps1               Ouverture de shells dev prêts à l'emploi
```

## Prérequis

- Node.js 18+
- npm 9+
- Python 3.9+ avec `pip` (pour installer Whisper)
- FFmpeg disponible sur la machine (sinon fournir `FFMPEG_PATH`)
- (Optionnel) Accès à l'API OpenAI (`OPENAI_API_KEY`) pour activer la synthèse automatique

## Installation rapide

```bash
# Depuis la racine du dépôt
./install.sh
```

Le script :
- vérifie Python/pip, installe/actualise Whisper localement ;
- exécute `npm install` dans `backend/` et `frontend/` ;
- laisse les dépendances prêtes pour le développement ou la production.

> Sous Windows, utilisez `pwsh -File ./install.ps1`.

## Configuration

Un fichier `.env.example` est disponible dans `backend/` pour initialiser les variables clés :

```
PORT=4000
DATA_ROOT=./data
OPENAI_API_KEY=sk-replace-me
FFMPEG_PATH=/usr/bin/ffmpeg
WHISPER_PATH=python
```

Copiez ce fichier en `.env` (ou exportez les variables dans votre shell). Au démarrage, le backend vérifie la présence des clés critiques et journalise les avertissements correspondants. Laisser le placeholder `sk-replace-me` (ou une valeur vide) désactive la synthèse : la pipeline termine avec succès, en conservant uniquement la transcription et les exports associés, tout en émettant un avertissement explicite.

Au lancement, le serveur HTTP tente de se lier au port défini par `PORT` (4000 par défaut). S'il est déjà utilisé, il attend et essaie automatiquement les ports suivants jusqu'à en trouver un disponible (20 tentatives par défaut). Le port retenu est indiqué dans les logs ; définissez `PORT` si vous souhaitez forcer un port précis.

## Démarrage

### Backend

```bash
cd backend
npm run dev
```

- API disponible sur `http://localhost:<port>` (le service tente `PORT` ou 4000 par défaut et essaie automatiquement les ports suivants si nécessaire ; le port final est journalisé)
- Dossiers de travail créés automatiquement dans `DATA_ROOT`
- Les jobs en attente sont repris automatiquement après redémarrage

### Frontend

```bash
cd frontend
npm run dev
```

- Interface sur `http://localhost:5173`
- L'URL backend est déterminée via `VITE_BACKEND_URL` ; à défaut, le port 4000 est utilisé par défaut

### Activer la diarisation des locuteurs

Le pipeline peut enrichir la transcription avec l'identité des intervenants lorsqu'un script Python de diarisation est disponible.

1. Installez les dépendances nécessaires (PyTorch + bibliothèque de diarisation de votre choix) dans un environnement Python dédié et exposez un script compatible avec l'API `speaker-diarization.py` (arguments `--input` et `--output` produisant un fichier JSON de segments).
2. Renseignez les variables d'environnement côté backend :
   - `DIARIZATION_PYTHON_PATH` : exécutable Python à utiliser (`python`, `python3`, chemin virtuel, …) ;
   - `DIARIZATION_SCRIPT_PATH` : chemin absolu du script de diarisation si vous n'utilisez pas l'emplacement par défaut `backend/tools/speaker-diarization.py` ;
   - `DIARIZATION_MODEL` (optionnel) : identifiant de modèle transmis au script ;
   - `DIARIZATION_TIMEOUT` (optionnel) : durée maximale d'exécution en millisecondes.
3. Activez le flag **Activer la diarisation des locuteurs** depuis l'onglet Configuration du frontend (ou en modifiant `config.json` via l'API).

Le guide détaillé (prérequis Python, format JSON attendu, conseils de mise en production) est disponible dans `docs/DIARIZATION.md`.

## Scripts & packaging

| Commande | Description |
| --- | --- |
| `npm run dev` (backend) | API Express avec rechargement automatique |
| `npm run start` (backend) | API Express en mode production |
| `npm test` (backend) | Tests Node.js (`node --test`) sur pipeline + stores |
| `npm run build` (frontend) | Build production Vite |
| `npm run preview` (frontend) | Prévisualisation du bundle |

## Tests automatisés

Le backend inclut :
- un test d'intégration du **pipeline complet** (avec services simulés) garantissant la génération des exports ;
- un test de **fusion de configuration** pour éviter les régressions de persistance.

Exécuter tous les tests :

```bash
cd backend
npm test
```

Le frontend est validé via le build Vite (`npm run build`). Les suites couvrant l'E2E (jobs, erreurs réseau, etc.) sont documentées dans `docs/TEST_STRATEGY.md` avec les plans et jeux de données.

## Jeux d'essai audio/exports

Le dossier `samples/` contient un guide pour générer localement :
- un audio d'exemple (`ffmpeg` avec onde sinusoïdale) ;
- un export VTT/TXT de référence pour valider la parité des champs.

## Documentation complémentaire

- `docs/ARCHITECTURE.md` : diagrammes logiques/physiques, dépendances, stockage
- `docs/VSCode.md` : configuration VS Code + Codex pour piloter l'environnement local
- `docs/WORKFLOWS.md` : matrice états → événements → sorties → erreurs
- `docs/OPERATIONS.md` : procédures Dev/Ops, scripts, reprise après incident
- `docs/SECURITY.md` : gestion des secrets, PII, principe de moindre privilège
- `docs/OBSERVABILITY.md` : logs structurés, métriques, supervision
- `docs/TEST_STRATEGY.md` : périmètre et jeux de tests (unitaires, intégration, E2E)
- `CHANGELOG.md` : notes de version du lot livré

## Support & contributions

Chaque module est conçu pour être idempotent et testable. Les contributions doivent :
1. s'appuyer sur les scripts existants (`setup`, `dev`, `test`, `build`, `package`, `run`) ;
2. inclure des tests automatisés pertinents ;
3. mettre à jour la documentation associée.

Pour toute question technique, consultez les guides dans `docs/` ou contactez l'équipe principale via les canaux internes.
