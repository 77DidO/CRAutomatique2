# Workflows & Matrice états → événements

| Workflow | États | Déclencheurs | Sorties | Gestion erreurs |
| --- | --- | --- | --- | --- |
| Import audio → pipeline | `queued` → `processing` → `completed/failed` | POST `/api/items` + ajout dans la file pipeline | exports TXT/MD/VTT, logs horodatés, progression | Exceptions étapes → `failed` + log erreur + conservation dossier |
| Transcription Whisper | `context.data.preparedPath` → `transcription` | Étape `transcribeStep` | Texte brut + segments + langue | CLI introuvable → exception ; JSON manquant → exception |
| Synthèse OpenAI | `summary` | Étape `summariseStep` si `enableSummaries=true` | Markdown structuré | Clé manquante → étape ignorée + avertissement ; réponse vide → exception |
| Exports | `outputs[]` | Étape `exportStep` | `transcription_raw.txt`, `summary.md`, `subtitles.vtt` | Transcription vide → exception bloquante |
| Suppression | `remove` | DELETE `/api/items/:id` | Dossier supprimé + job/logs retirés | Job introuvable → 404 |

## Cas d'erreurs & reprise

### Audio corrompu
- FFmpeg échoue → log `warn`, pipeline poursuit avec la source originale
- Whisper échoue ensuite → job `failed`, suppression possible puis réimport après correction

### Clé OpenAI absente
- La configuration est chargée avec un placeholder (`sk-replace-me`) ou une clé vide : `summariseStep` est ignorée, un avertissement est journalisé et le pipeline reste en `completed`
- Remplacer la clé puis relancer un import pour bénéficier de la synthèse

### Absence réseau / OpenAI indisponible
- L'étape `summariseStep` journalise un avertissement et se termine sans générer de synthèse
- Après restauration réseau et clé valide, relancer le job via réimport (ou développement d'une future fonction de reprise) pour obtenir la synthèse manquante

### Quota OpenAI atteint
- Exception (code HTTP 429) capturée → job `failed`, log explicite côté frontend
- Mise en place recommandée : backoff + relance manuelle (documenté dans `docs/OPERATIONS.md`)

### Reprise après crash serveur
- Au démarrage, `PipelineEngine.resume()` rattache les jobs `queued/processing`
- Les fichiers partiellement générés restent dans `jobs/<id>`

## UI & accessibilité

- Tous les onglets réutilisent la même charte (fond sombre, cartes translucides)
- Navigation clavier possible via boutons `tab`
- Textes et libellés ARIA ajoutés (`aria-label` pour navigation et listes)
- Messages d'erreur affichés dans un bandeau persistent

## i18n

- Interface principale en français (parité avec l'existant)
- Les gabarits peuvent contenir du texte dans n'importe quelle langue
