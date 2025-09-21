# Opérations & procédures

## Installation complète

1. `./install.sh` (ou `pwsh -File install.ps1`) : installe dépendances + Whisper
2. Copier `backend/.env.example` en `.env` et compléter si besoin
3. Lancer `npm run dev` dans `backend/` puis `frontend/`

## Scripts clés

| Script | Description |
| --- | --- |
| `install.sh` / `install.ps1` | Installation Whisper + dépendances npm |
| `start.ps1` | Ouvre deux terminaux (backend + frontend) configurés |
| `npm run dev` (backend) | API en mode watch |
| `npm run start` (backend) | API production (logs JSON) |
| `npm test` (backend) | Tests unitaires/intégration |
| `npm run build` (frontend) | Bundle production |
| `npm run preview` (frontend) | Vérification du bundle |

## Conflit de port (`EADDRINUSE`)

- Symptôme : le backend s'arrête immédiatement au démarrage avec un log `HTTP server failed to start` et le code d'erreur `EADDRINUSE`.
- Actions correctives :
  1. Vérifier qu'une autre instance n'utilise pas déjà le port (par défaut `4000`) via `lsof -i :4000` ou `netstat -ano | find "4000"`.
  2. Arrêter l'application en conflit (ancien backend, autre service proxy, etc.).
  3. Relancer `npm run dev` / `npm run start`.
- Alternative : définir une nouvelle valeur de `PORT` dans l'environnement ou `.env` (ex. `PORT=4100`) puis relancer le backend.

## Déploiement

1. Construire le frontend : `cd frontend && npm run build`
2. Déployer le backend (Node 18+) et servir `frontend/dist` derrière un reverse proxy ou via un CDN
3. Définir les variables d'environnement (`PORT`, `DATA_ROOT`, `OPENAI_API_KEY`, `FFMPEG_PATH`, `WHISPER_PATH`)
4. S'assurer que FFmpeg + Whisper sont installés sur la machine cible (ou fournis via `PATH`)

## Reprise après incident

- **Crash serveur** : relancer `npm run start` → reprise automatique des jobs `queued/processing`
- **Saturation disque** : purger les jobs terminés (`DELETE /api/items/:id`) ou archiver `data/jobs/<id>`
- **Whisper cassé** : réinstaller via `pip install --upgrade openai-whisper` et vérifier `WHISPER_PATH`
- **OpenAI indisponible** : attendre rétablissement, puis relancer les jobs échoués en réimportant l'audio

## Backups

- Sauvegarder `DATA_ROOT` régulièrement (jobs + exports + config)
- Pour restauration, recopier `DATA_ROOT` et relancer le backend → jobs visibles immédiatement

## Mode offline

- Whisper/FFmpeg continuent de fonctionner hors ligne
- L'étape OpenAI échoue et logge l'erreur ; les jobs restent en `failed`
- Possibilité de relancer manuellement après retour réseau

## Monitoring manuel

- Logs JSON sur stdout (backend)
- `data/jobs.json` pour consulter l'état persistant
- `frontend/dist` + Nginx/Apache pour servir l'UI en production

## Packaging

- Créer une archive : `tar czf cr-automatique.tar.gz backend frontend docs samples`
- Fournir instructions `.env` et prérequis (FFmpeg, Whisper, Node, Python)
