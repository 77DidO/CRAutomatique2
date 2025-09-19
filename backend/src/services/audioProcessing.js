import path from 'path';
import { mkdir } from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import { jobDirectory } from '../config/paths.js';

function buildFilterChain(options = {}) {
  const filters = [];
  const highpassFrequency = Number.isFinite(options.highpassFrequency)
    ? options.highpassFrequency
    : 80;
  const lowpassFrequency = Number.isFinite(options.lowpassFrequency)
    ? options.lowpassFrequency
    : 8000;

  if (highpassFrequency > 0) {
    filters.push(`highpass=f=${highpassFrequency}`);
  }
  if (lowpassFrequency > 0) {
    filters.push(`lowpass=f=${lowpassFrequency}`);
  }

  if (options.noiseReduction === true) {
    filters.push('afftdn');
  }

  if (typeof options.customFilter === 'string' && options.customFilter.trim().length > 0) {
    filters.push(options.customFilter.trim());
  }

  filters.push(options.normalizationFilter || 'loudnorm=I=-16:TP=-1.5:LRA=11');

  return filters;
}

function runFfmpeg(inputPath, outputPath, { filters, logger }) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .format('wav')
      .audioFilters(filters)
      .on('error', (error, stdout, stderr) => {
        if (logger && typeof logger.error === 'function') {
          logger.error('Prétraitement audio échoué.', { error, stdout, stderr });
        }
        reject(error instanceof Error ? error : new Error(String(error ?? 'Unknown ffmpeg error')));
      })
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
}

export async function preprocessAudioSource({
  jobId,
  inputPath,
  outputBasename = 'source_prepared.wav',
  filterOptions = {},
  logger = console
}) {
  if (!jobId) {
    throw new Error('Un identifiant de job est requis pour préparer l\'audio.');
  }
  if (!inputPath) {
    throw new Error('Le chemin du média source est requis pour le prétraitement audio.');
  }

  const destinationDir = jobDirectory(jobId);
  await mkdir(destinationDir, { recursive: true });

  const filters = buildFilterChain(filterOptions);
  const outputPath = path.join(destinationDir, outputBasename);

  if (logger && typeof logger.info === 'function') {
    logger.info('Prétraitement audio démarré.', { jobId, inputPath, outputPath, filters });
  }

  const preparedPath = await runFfmpeg(inputPath, outputPath, { filters, logger });

  if (logger && typeof logger.info === 'function') {
    logger.info('Prétraitement audio terminé.', { jobId, outputPath: preparedPath });
  }

  return preparedPath;
}
