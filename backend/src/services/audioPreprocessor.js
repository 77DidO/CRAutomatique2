import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { info, debug } from '../utils/logger.js';

if (!ffmpegStatic) {
  throw new Error('Impossible de localiser l\'exécutable ffmpeg.');
}

ffmpeg.setFfmpegPath(ffmpegStatic);

const DEFAULT_FILTERS = 'afftdn=nf=-25dB,equalizer=f=1000:t=q:w=1:g=3,loudnorm=I=-16:TP=-1.5:LRA=11';

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

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  debug('Lancement du prétraitement audio', { sourcePath, outputPath, filters });

  return new Promise((resolve, reject) => {
    ffmpeg(sourcePath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .outputOptions(['-af', filters])
      .format('wav')
      .on('error', (error) => {
        debug('Erreur lors du prétraitement audio', { sourcePath, error: error.message });
        reject(error);
      })
      .on('end', () => {
        info('Prétraitement audio terminé', { sourcePath, outputPath });
        resolve(outputPath);
      })
      .save(outputPath);
  });
}
