import { writeFile } from 'fs/promises';
import { jobAssetPath } from '../../config/paths.js';
import { createVttFromSegments } from '../utils/subtitles.js';

function ensureTrailingNewline(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.endsWith('\n') ? value : `${value}\n`;
}

export async function writePipelineOutputs({ jobId, job, context, config, logger }) {
  const outputs = [];
  const pipelineConfig = config?.pipeline ?? {};

  if (pipelineConfig.transcription !== false) {
    const transcriptionContent = (context.transcription?.text ?? '').trim();
    if (!transcriptionContent) {
      throw new Error('Aucune transcription disponible pour l\'export.');
    }

    // Persist the cleaned transcription so the frontend can offer a raw export.
    await writeFile(
      jobAssetPath(jobId, 'transcription_raw.txt'),
      ensureTrailingNewline(transcriptionContent),
      'utf8'
    );

    outputs.push({
      filename: 'transcription_raw.txt',
      label: 'Transcription brute',
      mimeType: 'text/plain'
    });
    logger.info('Transcription exportée.');
  }

  if (pipelineConfig.summary !== false) {
    const summaryContent = (context.summary?.markdown ?? '').trim();
    if (!summaryContent) {
      if (context.summary?.skipped) {
        logger.warn('Synthèse non exportée car ignorée en amont.', {
          reason: context.summary.reason
        });
      } else {
        throw new Error('Aucune synthèse disponible pour l\'export.');
      }
    } else {
      // Store the Markdown summary produced by the LLM.
      await writeFile(
        jobAssetPath(jobId, 'summary.md'),
        ensureTrailingNewline(summaryContent),
        'utf8'
      );

      outputs.push({
        filename: 'summary.md',
        label: 'Synthèse Markdown',
        mimeType: 'text/markdown'
      });
      logger.info('Synthèse exportée.');
    }
  }

  if (pipelineConfig.subtitles !== false) {
    const explicitVtt = (context.subtitles?.vtt ?? '').trim();
    const fallbackVtt = createVttFromSegments(context.transcription?.segments ?? []);
    const subtitleContent = (explicitVtt || fallbackVtt || '').trim();

    if (!subtitleContent) {
      throw new Error('Aucun sous-titre disponible pour l\'export.');
    }

    // Generate a standard WebVTT subtitle file.
    await writeFile(
      jobAssetPath(jobId, 'subtitles.vtt'),
      ensureTrailingNewline(subtitleContent),
      'utf8'
    );

    outputs.push({
      filename: 'subtitles.vtt',
      label: 'Sous-titres VTT',
      mimeType: 'text/vtt'
    });
    logger.info('Sous-titres exportés.');
  }

  return outputs;
}
