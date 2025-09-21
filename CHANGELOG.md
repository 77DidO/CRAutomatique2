# CHANGELOG

## 2025-09-21 — Rebuild complet

### Backend
- Réécriture Express modulaire avec file de jobs persistante
- Pipeline FFmpeg → Whisper → OpenAI → exports (TXT/MD/VTT)
- Services dédiés (FFmpeg, Whisper, OpenAI) avec gestion d'erreurs explicites
- Tests `node --test` couvrant pipeline et config
- Validation environnement (`OPENAI_API_KEY`) au démarrage

### Frontend
- SPA React (Vite) reconstruite avec parité d'écrans : upload, historique, configuration, gabarits
- Polling résilient, logs temps réel, toasts d'erreur
- UI conforme à la charte originale (cartes, badges, onglets)

### Documentation & outils
- Nouveau README + guides (architecture, workflows, opérations, sécurité, observabilité, tests)
- `.env.example` et scripts existants conservés (`install`, `start`)
- Samples audio/exports documentés dans `samples/`

### Tests & packaging
- `npm test` (backend) et `npm run build` (frontend) validés
- Stratégie de tests documentée (unitaires, intégration, E2E manuel)
