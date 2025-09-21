# Observabilité

## Logs

- **Backend** : logs JSON structurés (`level`, `time`, `message`, `payload`).
- **Jobs** : chaque étape ajoute un log horodaté stocké dans `jobs.json` et affiché dans l'UI.
- **Whisper** : stderr est agrégé et journalisé en `debug` (activable via `LOG_LEVEL=debug`).

### Recommandations

- Rediriger la sortie standard vers un collecteur (Filebeat, Fluent Bit).
- Mettre en place une rotation (`logrotate`) si exécution longue durée.

## Métriques

- Latence moyenne par étape (FFmpeg, Whisper, OpenAI) — à exporter via un wrapper Prometheus (ex : instrumenter `pipeline/engine.js`).
- Nombre de jobs `completed/failed` par jour.
- Taille cumulée des exports (`data/jobs/*`).

## Alerting minimal

- Alerte si nombre de jobs en `failed` > seuil.
- Alerte si `OPENAI_API_KEY` manquante (warning au démarrage).
- Alerte disque faible (<10% libre) sur `DATA_ROOT`.

## Traces

- Les identifiants de job sont propagés dans tous les logs (`payload.jobId`).
- Possibilité d'ajouter un middleware Express pour tracer `x-request-id`.

## Observabilité frontend

- Polling toutes les 4s ; surveiller la latence via DevTools ou RUM léger (non inclus).
- Les erreurs REST sont affichées dans un bandeau (toast). Ajouter un outil (Sentry) si nécessaire.
