# Diarisation des locuteurs

La diarisation permet d'associer chaque segment de la transcription à un intervenant identifié. Dans CR Automatique 2, cette fonctionnalité repose sur un script Python externe exécuté via le service `speaker-diarization-service`.

## Dépendances requises

- **Python 3.9+** (la version doit être compatible avec vos bibliothèques audio).
- **PyTorch** avec l'accélération adaptée à votre machine (CPU ou GPU).
- Une bibliothèque de diarisation telle que :
  - [`pyannote.audio`](https://github.com/pyannote/pyannote-audio) : modèles pré-entraînés open source, nécessite un compte Hugging Face ;
  - [`whisperx`](https://github.com/m-bain/whisperX) : pipeline complet transcription + diarisation, exploitable en mode hors-ligne ;
  - tout autre outil capable de produire un fichier JSON de segments.
- Les dépendances système associées (FFmpeg, bibliothèques CUDA/cuDNN si vous ciblez le GPU, etc.).

> Astuce : placez ces dépendances dans un environnement virtuel dédié (`python -m venv .venv && source .venv/bin/activate`) afin d'éviter les conflits avec Whisper.

## Script attendu

Le service Node.js invoque un script conforme à la convention suivante :

```bash
python speaker-diarization.py --input <fichier-audio> --output <fichier-json> [--model <identifiant>]
```

Le script doit écrire sur la sortie standard (stdout) **et/ou** dans le fichier JSON passé via `--output` un objet contenant un tableau `segments`. Exemple minimal :

```json
{
  "segments": [
    { "start": 0.0, "end": 5.4, "speaker": "speaker_0" },
    { "start": 5.4, "end": 9.8, "speaker": "speaker_1" }
  ]
}
```

Chaque segment doit respecter les règles suivantes :

- `start` et `end` sont exprimés en secondes (nombre flottant) ;
- `speaker` identifie l'intervenant (chaîne de caractères) ;
- les segments peuvent se chevaucher, ils sont ensuite filtrés côté Node.js pour déterminer la meilleure correspondance.

Déposez votre script dans `backend/tools/speaker-diarization.py` ou personnalisez le chemin via `DIARIZATION_SCRIPT_PATH`.

## Variables d'environnement

| Variable | Description |
| --- | --- |
| `DIARIZATION_PYTHON_PATH` | Exécutable Python utilisé pour lancer le script (`python`, `python3`, `/opt/env/bin/python`, …). |
| `DIARIZATION_SCRIPT_PATH` | (Optionnel) Chemin absolu du script si vous ne conservez pas l'emplacement par défaut. |
| `DIARIZATION_MODEL` | (Optionnel) Identifiant de modèle transmis tel quel au script (`--model`). |
| `DIARIZATION_TIMEOUT` | (Optionnel) Timeout en millisecondes avant arrêt forcé du processus Python. |

Pensez à redémarrer le backend après modification de ces variables.

## Activation côté application

1. **Configuration backend** : assurez-vous que les variables ci-dessus sont définies et que le script répond correctement lorsque vous l'exécutez manuellement.
2. **UI / config.json** : activez le booléen `enableDiarization` depuis le panneau *Configuration → Options du pipeline* (checkbox « Activer la diarisation des locuteurs ») ou en éditant `config.json` via l'API REST.
3. **Validation** : soumettez un job de test et vérifiez que `segments.json`, `transcription_timed.txt` et `subtitles.vtt` contiennent bien des étiquettes « Speaker X ».

En cas d'échec, consultez les logs du job (backend) : un avertissement « Diarisation échouée, étape ignorée » signifie que le script a retourné un code non nul ou un JSON invalide. Ajustez alors vos dépendances ou augmentez `DIARIZATION_TIMEOUT`.
