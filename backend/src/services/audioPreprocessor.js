import fs from 'fs';
import path from 'path';
import { info, debug } from '../utils/logger.js';

export function preprocessAudio(sourcePath, targetDir) {
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

  debug('Simulation du prétraitement audio', { sourcePath, outputPath });
  fs.copyFileSync(sourcePath, outputPath);
  info('Prétraitement audio simulé terminé', { sourcePath, outputPath });
  return Promise.resolve(outputPath);
}
