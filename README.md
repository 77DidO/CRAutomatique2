# CRAutomatique2

Application full-stack (React + Node.js) qui transforme un fichier audio ou vidéo en transcription, synthèse Markdown et exports associés. Le backend orchestre un pipeline simulé compatible avec l'API OpenAI et un service Ollama local, tandis que le frontend fournit un tableau de bord complet (dashboard, historique, configuration et fiches détaillées).

## Structure

- `backend/` — API Express, gestion des uploads, pipeline, stockage des jobs et configuration.
- `frontend/` — Application React (Vite) avec navigation par onglets et composants métiers.

## Démarrage

Avant de lancer les serveurs, vous pouvez installer toutes les dépendances frontend et backend en une fois depuis la racine
avec PowerShell :

```powershell
pwsh -File ./install.ps1

```

### Démarrage automatique

Pour ouvrir automatiquement deux sessions PowerShell (backend et frontend) configurées en mode développement, utilisez :

```powershell
pwsh -File ./start.ps1

```

### Prérequis

- Node.js 18+ (le backend utilise l'option `--watch`).
- npm 9+.
- (Optionnel) PowerShell 7 pour exécuter `install.ps1` sous Linux/macOS.
- Un exécutable `whisper` accessible (par exemple via `pip install git+https://github.com/openai/whisper.git`) ou un chemin
  configuré vers une alternative compatible. À défaut, le backend essaie automatiquement `python3 -m whisper`, `python -m
  whisper` puis `py -m whisper` (sur Windows) si le binaire direct est introuvable.

1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Variables d'environnement utiles :
   - `OPENAI_API_KEY` : clé OpenAI quand le fournisseur `openai` est actif.
   - `OLLAMA_COMMAND` : chemin vers l'exécutable Ollama (défaut `ollama`).
   - `FFMPEG_PATH` : chemin absolu vers un binaire `ffmpeg` déjà installé. Si vous installez la dépendance optionnelle
     `@ffmpeg-installer/ffmpeg`, ce paramètre est configuré automatiquement.
   - `WHISPER_BINARY_PATH` : force le chemin vers la CLI Whisper locale si elle n'est pas exposée via le `PATH` système.

### Transcription locale (Whisper)

L'étape de transcription utilise une CLI compatible Whisper côté serveur. Installez l'outil officiel avec `pip install git+https://github.com/openai/whisper.git`
ou fournissez votre propre binaire compatible. Assurez-vous que la commande est disponible via la variable d'environnement `PATH` ou
indiquez le chemin complet dans la configuration (`transcription.binaryPath` côté backend, ou `WHISPER_BINARY_PATH` dans les variables d'environnement).
En cas d'absence, l'étape ajoute un log de job contenant les instructions d'installation afin de faciliter le diagnostic dans l'interface.

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   L'interface est disponible sur http://localhost:5173 avec proxy vers l'API backend (http://localhost:4000).

   Pour personnaliser l'URL ciblée par le proxy (par exemple si votre backend écoute sur un autre port ou une autre machine),
   définissez la variable d'environnement `VITE_BACKEND_URL` avant de lancer Vite. À défaut, `BACKEND_URL` ou `BACKEND_PORT`
   sont également pris en compte.

### Scripts utiles

- `npm run lint` (backend) : vérifie le style de code.
- `npm run build` (frontend) : construit la version production.
- `npm run preview` (frontend) : prévisualise le build.

## Fonctionnalités principales

- Téléversement audio/vidéo avec sélection de gabarit et participants.
- Suivi en temps réel du pipeline (étapes, progression, logs, ressources générées).
- Historique des traitements avec suppression et accès aux fiches détaillées.
- Configuration des options pipeline/LLM persistée côté serveur (diarisation activable, nombre exact ou plage de locuteurs).
- Fiche détaillée par traitement : aperçu, audio, textes, Markdown, VTT, synthèse de diarisation.

## API Express

Toutes les routes sont préfixées par `/api` :

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Vérifie l'état du serveur (réponse `{ status: "ok" }`). |
| `GET` | `/api/items` | Liste des jobs avec statut, progression et métadonnées. |
| `POST` | `/api/items` | Téléverse un fichier (champ `file`) et crée un job. Champs `title`, `template`, `participants` acceptés dans le corps. |
| `GET` | `/api/items/:id` | Détails d'un job, liens de téléchargement et derniers logs. |
| `GET` | `/api/items/:id/logs` | Logs uniquement (tableau de chaînes). |
| `DELETE` | `/api/items/:id` | Supprime le job, ses uploads et sorties générées. |
| `GET` | `/api/templates` | Liste des gabarits disponibles côté serveur. |
| `GET` | `/api/config` | Récupère la configuration courante (fournisseur LLM, options pipeline, etc.). |
| `PUT` | `/api/config` | Met à jour la configuration (fusionne et persiste dans `data/config.json`). |
| `GET` | `/api/assets/:jobId/<fichier>` | Sert les fichiers générés d'un job (transcriptions, résumés, sous-titres, etc.). |

## Remarques

Le pipeline intégré simule les étapes de conversion, transcription, nettoyage et synthèse. Pour une exécution réelle, remplacez les fonctions correspondantes dans `backend/src/services/pipeline.js` par des appels à FFmpeg, Faster-Whisper et vos modèles LLM.

### Organisation des données

- Les uploads temporaires sont stockés dans `backend/data/uploads`.
- Chaque job possède un dossier `backend/data/jobs/<id>` contenant :
  - le fichier source ;
  - les exportations (`transcription_raw.txt`, `summary.md`, `subtitles.vtt`, ...);
  - `logs.txt` et les métadonnées sérialisées.
- Les jobs sont persistés dans `backend/data/jobs.json` afin d'être rechargés au démarrage.

### Variables d'environnement utiles

| Nom | Description |
| --- | --- |
| `PORT` | Port HTTP du backend (défaut : `4000`). |
| `OPENAI_API_KEY` | Clé OpenAI utilisée lorsque le fournisseur `openai` est sélectionné. |
| `OLLAMA_COMMAND` | Commande CLI Ollama à exécuter (`ollama` par défaut). |
| `FFMPEG_PATH` | Force le chemin de l'exécutable `ffmpeg` utilisé pendant le prétraitement audio. |
