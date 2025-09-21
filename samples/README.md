# Jeux d'exemples

## Audio de test

Générer un fichier WAV 16 kHz de 2 secondes contenant une sinusoïde :

```bash
ffmpeg -f lavfi -i "sine=frequency=440:duration=2" -ar 16000 -ac 1 samples/audio-demo.wav
```

Importer ce fichier via l'interface (onglet « Nouveau traitement ») pour valider le pipeline.

## Export attendu (exemple)

Une fois le job terminé :

- `transcription_raw.txt` contient la transcription Whisper (sera vide ou bruit pour la sinusoïde)
- `summary.md` contient le markdown généré par OpenAI (si clé configurée)
- `subtitles.vtt` contient les segments VTT

Comparer la structure des fichiers avec des exports précédemment validés pour garantir la parité des champs (ordre, noms, encodage UTF-8).
