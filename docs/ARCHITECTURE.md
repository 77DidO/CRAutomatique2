# Architecture

## Vue physique

```
[React/Vite SPA] ⇄ (HTTP/JSON) ⇄ [API Express] ⇄ [Système de fichiers local]
                                                ⇂
                                             [FFmpeg CLI]
                                                ⇂
                                             [Whisper CLI]
                                                ⇂
                                           [OpenAI API]
```

- **Frontend** : application Vite servie en mode dev (port 5173) ou statique derrière le backend. Toutes les interactions passent par l'API REST.
- **Backend** : serveur Express mono-processus pilotant une file FIFO, les traitements étant idempotents et sérialisés.
- **Stockage** : fichiers JSON et dossiers locaux (`DATA_ROOT`) contenant jobs, logs et exports. Les jobs sont réhydratés au démarrage.
- **Services externes** : FFmpeg et Whisper sont exécutés localement via la CLI, OpenAI reste l'unique dépendance distante.

## Vue logique

1. **Serveur HTTP (`src/http`)**
   - middlewares CORS + JSON
   - routeurs `/api/items`, `/api/config`, `/api/templates`, `/api/assets`
   - gestion d'erreurs centralisée et renvoi JSON

2. **Stores (`src/persistence`)**
   - `JobStore` : persistance JSON, logs horodatés, outputs et suppression récursive
   - `ConfigStore` : fusion profonde, cache en mémoire
   - `TemplateStore` : CRUD avec validation (nom/prompt obligatoires)

3. **Pipeline (`src/pipeline`)**
   - `PipelineEngine` : file mémoire, reprise automatique, annulation
   - Étapes : `ingest` (FFmpeg), `transcribe` (Whisper), `summarise` (OpenAI), `export`
   - Contexte partagé (job, config, template, services, data)

4. **Services (`src/services`)**
   - `ffmpeg-service` : wrapper de conversion WAV mono/16 kHz
   - `whisper-service` : exécution CLI avec gestion d'erreurs et retour JSON+TXT
   - `openai-service` : prompts contextuels, garde-fous et erreurs explicites

5. **Frontend (`frontend/src`)**
   - `App.jsx` : onglets, polling (4s), gestion d'erreurs globales
   - `UploadForm`, `JobDashboard`, `ConfigPanel`, `TemplateManager` : composants iso-écrans
   - `api/client.js` : wrapper fetch avec base URL dynamique (dev/prod)

## Données & stockage

- `DATA_ROOT/jobs.json` : tableau de jobs + logs (structure normalisée)
- `DATA_ROOT/jobs/<id>/` : source + exports + transcription brute Whisper
- `DATA_ROOT/config.json` : configuration pipeline/LLM/Whisper
- `DATA_ROOT/templates.json` : gabarits persistés

Les écritures sont synchrones afin de garantir la durabilité. Les opérations critiques (création, logs, outputs) déclenchent une persistance immédiate.

## Résilience

- **Reprise** : `PipelineEngine.resume()` ajoute automatiquement les jobs `queued`/`processing` à la file au démarrage
- **Annulation** : les suppressions marquent la job comme annulée via un flag et provoquent l'arrêt du pipeline avant l'étape suivante
- **Échecs** : exceptions dans une étape → job `failed` + log d'erreur + conservation des fichiers pour diagnostic
- **OpenAI indisponible** : un warning est loggé au démarrage si la clé manque ; l'étape `summarise` échoue explicitement, permettant une reprise après ajout de la clé

## Sécurité & secrets

- Clé OpenAI lue depuis `process.env` ou `config.llm.apiKey` (persistée seulement si explicitement fournie)
- Aucun secret n'est renvoyé par les API publiques (masquage côté frontend)
- Téléchargements `/api/assets` strictement limités au dossier du job et au fichier demandé

## Portabilité

- Scripts `install.sh`/`install.ps1` vérifiant Python/pip et installant Whisper
- Dépendances FFmpeg/Whisper externalisées : possibilité de définir `FFMPEG_PATH` et `WHISPER_PATH`
- Fonctionnement hors ligne : pipeline audio complet sans accès réseau, seul OpenAI nécessite Internet

## Diagrammes de séquence (texte)

### Import audio → Exports

1. Frontend POST `/api/items`
2. Job créé (`queued`) et fichier déplacé dans `jobs/<id>`
3. `PipelineEngine` exécute les étapes séquentiellement
4. Export TXT/MD/VTT écrit → job `completed`
5. Frontend récupère outputs/logs via polling

### Synthèse texte → OpenAI

1. Étape `summarise` construit le prompt à partir du gabarit
2. Appel `client.chat.completions.create`
3. Markdown stocké dans `context.data.summary`
4. Écriture `summary.md` + metadata job

### Erreurs & reprise

- FFmpeg indisponible : log `warn`, pipeline continue avec le fichier original
- Whisper échoue : exception → job `failed`, logs conservés
- OpenAI indisponible : exception claire, job `failed`, relançable après correction
