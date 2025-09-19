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

let ffmpegAvailability = 'unknown';

async function ensureFfmpegPath({ logger }) {
  if (ffmpegAvailability !== 'unknown') {
    return ffmpegAvailability === 'available';
  }

  let configuredPath = process.env.FFMPEG_PATH?.trim();

  if (configuredPath) {
    ffmpeg.setFfmpegPath(configuredPath);
  } else {
    try {
      const { path: bundledFfmpegPath } = await import('@ffmpeg-installer/ffmpeg');

      if (bundledFfmpegPath) {
        configuredPath = bundledFfmpegPath;
        ffmpeg.setFfmpegPath(configuredPath);
      }
    } catch (error) {
      const isModuleNotFound =
        error && typeof error === 'object' && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';

      if (!isModuleNotFound && logger && typeof logger.warn === 'function') {
        logger.warn('Impossible de configurer ffmpeg via le package embarqué.', { error });
      }
    }
  }

  if (!configuredPath && logger && typeof logger.warn === 'function') {
    logger.warn(
      "Aucun binaire ffmpeg n'a été trouvé. Installez ffmpeg ou définissez la variable d'environnement FFMPEG_PATH."
    );
  }

  ffmpegAvailability = configuredPath ? 'available' : 'unavailable';

  return ffmpegAvailability === 'available';
}

async function runFfmpeg(inputPath, outputPath, { filters, logger }) {
  const ffmpegAvailable = await ensureFfmpegPath({ logger });

  if (!ffmpegAvailable) {
    throw new Error('FFmpeg est indisponible pour le prétraitement audio.');
  }

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
