import { createVttFromSegments } from '../utils/subtitles.js';

export const cleanupStep = {
  async execute({ jobId, jobStore, context, logger }) {
    const transcription = context.transcription ?? {};

    if (!transcription.text) {
      logger.warn('Aucune transcription à nettoyer.');
      return;
    }

    const normalizedText = transcription.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');

    // Normalise spacing and remove blank segments before exporting subtitles.
    const sanitizedSegments = Array.isArray(transcription.segments)
      ? transcription.segments
        .map((segment) => ({
          ...segment,
          text: typeof segment?.text === 'string' ? segment.text.replace(/\s+/g, ' ').trim() : ''
        }))
        .filter((segment) => segment.text.length > 0)
      : [];

    context.transcription = {
      ...context.transcription,
      text: normalizedText,
      segments: sanitizedSegments
    };

    const vttContent = createVttFromSegments(sanitizedSegments);
    if (vttContent) {
      context.subtitles.vtt = vttContent;
    }

    await jobStore.appendLog(jobId, 'Transcription nettoyée et segments préparés.');
    logger.info('Nettoyage de la transcription terminé.', {
      lines: normalizedText.split('\n').length,
      segments: sanitizedSegments.length
    });
  }
};
