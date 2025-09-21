# Sécurité

## Secrets & accès

- **OPENAI_API_KEY** : requis pour la synthèse. À stocker hors dépôt (variables d'environnement ou coffre local). Jamais renvoyée par l'API.
- **DATA_ROOT** : répertoires locaux contenant potentiellement des PII (audio, transcription). Restreindre les permissions (`700`).
- **TLS** : placer l'API derrière un reverse proxy HTTPS (Nginx/Traefik).

## Authentification/autorisation

- Les endpoints sont prévus pour un usage LAN/offline. Ajouter une authentification (clé API, Basic Auth ou proxy mutualisé) avant exposition externe.
- Les téléchargements `/api/assets` sont limités au job courant mais nécessitent une couche auth si accessible publiquement.

## Logs & PII

- Les logs backend sont JSON et peuvent contenir des messages génériques (pas de contenu audio/textuel).
- Les logs de job (affichés côté frontend) se limitent à des messages d'état ; ils ne contiennent jamais de texte transcription.
- Activer la rotation de logs si intégration dans un SIEM.

## Durcissement recommandé

- Exécuter le backend sous un utilisateur non privilégié.
- Isoler les répertoires `data/` et `tmp/` avec des ACL spécifiques.
- Ajouter une limite de taille d'upload (via reverse proxy ou middleware Multer).
- Désactiver OpenAI dans la configuration (`enableSummaries=false`) pour les environnements sensibles.

## Conformité RGPD

- Les fichiers audio/transcriptions peuvent contenir des données personnelles ; documenter la durée de conservation (configurable via purge manuelle).
- Fournir un mécanisme de suppression sur demande (`DELETE /api/items/:id`).
