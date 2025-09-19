import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { info, debug, warn } from '../utils/logger.js';

const envFfmpegPath = process.env.FFMPEG_PATH?.trim();
let resolvedFfmpegPath = envFfmpegPath && envFfmpegPath.length > 0 ? envFfmpegPath : null;

if (!resolvedFfmpegPath) {
  const ffmpegStaticModule = await import('ffmpeg-static')
    .then((module) => module?.default ?? module)
    .catch((error) => {
      debug('Module ffmpeg-static non disponible.', { error: error.message });
      return null;
    });

  if (typeof ffmpegStaticModule === 'string' && ffmpegStaticModule.length > 0) {
    resolvedFfmpegPath = ffmpegStaticModule;
    debug('Binaire ffmpeg fourni par ffmpeg-static.', { ffmpegPath: resolvedFfmpegPath });
  }
}

if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath);
} else {
  warn('Aucun chemin ffmpeg explicite fourni, utilisation du ffmpeg présent dans le système.');
}

const DEFAULT_FILTERS = 'afftdn=nf=-25,equalizer=f=1000:t=q:w=1:g=3,loudnorm=I=-16:TP=-1.5:LRA=11';

export function preprocessAudio(sourcePath, targetDir, { filters = DEFAULT_FILTERS } = {}) {
  if (!sourcePath) {
    throw new Error('Aucun fichier source fourni pour le prétraitement.');
  }
  if (!targetDir) {
    throw new Error('Aucun dossier cible fourni pour le prétraitement.');
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { name } = path.parse(sourcePath);
  const outputPath = path.join(targetDir, `${name}-processed.wav`);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(sourcePath)
      .format('wav')
      .audioCodec('pcm_s16le')
      .outputOptions('-ac', '1', '-ar', '16000');

    if (filters) {
      command.audioFilters(filters);
    }

    command
      .on('start', (commandLine) => {
        debug('Prétraitement audio démarré', { sourcePath, outputPath, commandLine });
      })
      .on('error', (error) => {
        warn('Échec du prétraitement audio, tentative de copie du fichier source.', {
          sourcePath,
          outputPath,
          message: error.message
        });
        try {
          fs.copyFileSync(sourcePath, outputPath);
          info('Prétraitement audio remplacé par une copie du fichier source.', { sourcePath, outputPath });
          resolve(outputPath);
        } catch (copyError) {
          reject(copyError);
        }
      })
      .on('end', () => {
        info('Prétraitement audio terminé', { sourcePath, outputPath });
        resolve(outputPath);
      })
      .save(outputPath);
  });
}
