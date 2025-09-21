# Stratégie de tests

## Objectifs

- Garantir la parité fonctionnelle du pipeline (prétraitement → export)
- Vérifier la persistance configuration/jobs
- Couvrir les cas d'erreurs principaux (Whisper manquant, OpenAI indisponible)

## Tests automatisés fournis

| Type | Description | Commande |
| --- | --- | --- |
| Intégration pipeline | Simulation FFmpeg/Whisper/OpenAI → vérifie outputs (TXT/MD/VTT) | `cd backend && npm test` |
| Persistance config | Vérifie la fusion profonde et la présence des valeurs par défaut | `cd backend && npm test` |
| Build frontend | Garantit qu'aucune erreur de compilation n'apparaît | `cd frontend && npm run build` |

## Jeux de données

- **Audio de test** : générable via `samples/README.md` (onde sinusoïdale 2s)
- **Fixtures OpenAI** : stub dans le test pipeline (Markdown synthétique)
- **Logs** : vérifiés par inspection JSON (persistés automatiquement)

## Couverture attendue

- Pipeline complet : 1 job → 3 exports → statut `completed`
- Config : merge / fallback / persistance sur disque
- Frontend : build réussi + lint (via ESLint si activé)

## Tests manuels recommandés

1. Importer un audio réel → vérifier progression, exports et téléchargement
2. Supprimer un job → vérifier disparition UI + disque
3. Désactiver la synthèse dans la configuration → pipeline sans `summary.md`
4. Couper le réseau avant l'étape OpenAI → job `failed`, logs explicites

## Roadmap (tests E2E)

- Cypress/Playwright pour automatiser les workflows (upload → export)
- Tests de résilience (reprise après redémarrage) via scripts shell
