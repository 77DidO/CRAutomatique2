import { jobAssetPath } from '../../config/paths.js';
import { transcribeWithLocalWhisper } from '../../services/transcription/localWhisper.js';

export const transcribeStep = {
  async execute({ jobId, jobStore, config, context, logger }) {
    const pipelineConfig = config?.pipeline ?? {};
    if (pipelineConfig.transcription === false) {
      logger.warn('Étape de transcription désactivée via la configuration.');
      return;
    }

    const job = jobStore.get(jobId);
    if (!job || !job.source?.storedName) {
      throw new Error('Source introuvable pour la transcription.');
    }

    const transcriptionConfig = config?.transcription ?? config?.whisper ?? {};
    const audioPath = context.preparedSourcePath
      || jobAssetPath(jobId, job.source.storedName);

    // Run Whisper CLI (or compatible engine) locally.
    logger.info('Transcription locale en cours.', { audioPath });

    const result = await transcribeWithLocalWhisper({
      jobId,
      audioPath,
      options: transcriptionConfig,
      logger
    });

    context.transcription = {
      text: result.text,
      segments: result.segments,
      model: result.model ?? transcriptionConfig.model ?? null,
      raw: result.raw
    };

    await jobStore.appendLog(jobId, 'Transcription locale générée.');
    logger.info('Transcription locale terminée.', {
      segmentCount: Array.isArray(result.segments) ? result.segments.length : 0,
      model: context.transcription.model
    });
  }
};
