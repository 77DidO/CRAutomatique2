import type { ConfigStore, Logger } from '../types/index.js';

const REQUIRED: Array<{ key: string; message: string }> = [
  { 
    key: 'DATA_ROOT',
    message: 'Le dossier de données est requis pour le stockage des fichiers'
  },
];

const OPTIONAL_WARNINGS: Array<{ key: string; message: string }> = [
  { 
    key: 'OPENAI_API_KEY',
    message: "OPENAI_API_KEY manquant : la génération de résumés échouera tant qu'une clé n'est pas fournie."
  },
  {
    key: 'WHISPER_PYTHON_PATH',
    message: "WHISPER_PYTHON_PATH non défini : utilisation du chemin par défaut du venv"
  },
  {
    key: 'FFMPEG_PATH',
    message: "FFMPEG_PATH non défini : utilisation de l'installation système"
  },
];

interface ValidateEnvironmentOptions {
  logger?: Logger;
  configStore?: ConfigStore;
}

import fs from 'node:fs';

async function checkExecutableExists(path: string | null | undefined): Promise<boolean> {
  if (!path) return false;
  try {
    await fs.promises.access(path, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function validateEnvironment({ logger, configStore }: ValidateEnvironmentOptions = {}): Promise<void> {
  // Validation des variables requises
  for (const required of REQUIRED) {
    if (!process.env[required.key]) {
      throw new Error(required.message || `Variable d'environnement obligatoire manquante : ${required.key}`);
    }
  }

  // Vérification des exécutables
  const pythonPath = process.env.WHISPER_PYTHON_PATH || "C:\\Projets\\portefeuille\\.venv\\Scripts\\python.exe";
  const ffmpegPath = process.env.FFMPEG_PATH;

  if (!(await checkExecutableExists(pythonPath))) {
    logger?.warn(
      { path: pythonPath },
      "L'exécutable Python n'est pas accessible. Vérifiez le chemin WHISPER_PYTHON_PATH"
    );
  }

  if (ffmpegPath && !(await checkExecutableExists(ffmpegPath))) {
    logger?.warn(
      { path: ffmpegPath },
      "L'exécutable FFmpeg n'est pas accessible. Vérifiez le chemin FFMPEG_PATH"
    );
  }

  for (const warning of OPTIONAL_WARNINGS) {
    let hasValue = Boolean(process.env[warning.key]);

    if (!hasValue && warning.key === 'OPENAI_API_KEY' && configStore) {
      try {
        const config = await configStore.read();
        hasValue = Boolean(config?.llm?.apiKey);
      } catch (error) {
        const message = "Impossible de lire la configuration lors de la validation de l'environnement";
        if (logger) {
          logger.warn({ err: error, key: warning.key }, message);
        } else {
          console.warn(message, error);
        }
      }
    }

    if (!hasValue) {
      if (logger) {
        logger.warn({ key: warning.key }, warning.message);
      } else {
        console.warn(warning.message);
      }
    }
  }
}
