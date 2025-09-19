import { jobAssetPath } from '../../config/paths.js';
import { preprocessAudioSource } from '../../services/audioProcessing.js';

export const ingestStep = {
  async execute({ jobId, jobStore, config, context, logger }) {
    const job = jobStore.get(jobId);
    if (!job || !job.source?.storedName) {
      throw new Error('Impossible de localiser la source du job pour la préparation.');
    }

    const transcriptionConfig = config?.transcription ?? config?.whisper ?? {};
    const sourcePath = jobAssetPath(jobId, job.source.storedName);
    const filterOptions = {
      highpassFrequency: transcriptionConfig?.highpassFrequency,
      lowpassFrequency: transcriptionConfig?.lowpassFrequency,
      normalizationFilter: transcriptionConfig?.normalizationFilter,
      customFilter: transcriptionConfig?.customFilter,
      noiseReduction: transcriptionConfig?.noiseReduction
    };

    // Prepare the audio track locally (denoise, normalization, etc.).
    logger.info('Prétraitement du média en cours.', { sourcePath, filterOptions });

    try {
      const preparedPath = await preprocessAudioSource({
        jobId,
        inputPath: sourcePath,
        outputBasename: 'source_prepared.wav',
        filterOptions,
        logger
      });

      context.preparedSourcePath = preparedPath;
      logger.info('Prétraitement du média terminé.', { preparedPath });
    } catch (error) {
      logger.warn('Prétraitement indisponible, utilisation du média original.', { error: error?.message });
      await jobStore.appendLog(jobId, `Prétraitement audio indisponible : ${error?.message ?? 'Erreur inconnue'}.`);
      context.preparedSourcePath = sourcePath;
    }
  }
};
