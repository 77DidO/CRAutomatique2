# CRAutomatique2

Application full-stack (React + Node.js) qui transforme un fichier audio ou vidéo en transcription, synthèse Markdown et exports associés. Le backend orchestre un pipeline simulé compatible avec l'API OpenAI et un service Ollama local, tandis que le frontend fournit un tableau de bord complet (dashboard, historique, configuration et fiches détaillées).

## Structure

- `backend/` — API Express, gestion des uploads, pipeline, stockage des jobs et configuration.
- `frontend/` — Application React (Vite) avec navigation par onglets et composants métiers.

## Démarrage

1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Variables d'environnement utiles :
   - `OPENAI_API_KEY` : clé OpenAI quand le fournisseur `openai` est actif.
   - `OLLAMA_COMMAND` : chemin vers l'exécutable Ollama (défaut `ollama`).

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   L'interface est disponible sur http://localhost:5173 avec proxy vers l'API backend (http://localhost:4000).

## Fonctionnalités principales

- Téléversement audio/vidéo avec sélection de gabarit et participants.
- Suivi en temps réel du pipeline (étapes, progression, logs, ressources générées).
- Historique des traitements avec suppression et accès aux fiches détaillées.
- Configuration des options pipeline/LLM persistée côté serveur.
- Fiche détaillée par traitement : aperçu, audio, textes, Markdown, VTT, synthèse de diarisation.

## Remarques

Le pipeline intégré simule les étapes de conversion, transcription, nettoyage et synthèse. Pour une exécution réelle, remplacez les fonctions correspondantes dans `backend/src/services/pipeline.js` par des appels à FFmpeg, Faster-Whisper et vos modèles LLM.
