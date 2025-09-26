import path from 'node:path';
import type { DiarizationSegment, PipelineContext, WhisperTranscriptionSegment } from '../../types/index.js';
import { ensureDirectory } from '../../utils/fs.js';

function overlaps(diarization: DiarizationSegment, segment: WhisperTranscriptionSegment): boolean {
  const start = typeof segment.start === 'number' ? segment.start : Number.NEGATIVE_INFINITY;
  const end = typeof segment.end === 'number' ? segment.end : Number.POSITIVE_INFINITY;
  return diarization.end > start && diarization.start < end;
}

function assignSpeakers(
  transcriptionSegments: WhisperTranscriptionSegment[] | undefined,
  diarizationSegments: DiarizationSegment[],
): void {
  if (!Array.isArray(transcriptionSegments) || transcriptionSegments.length === 0) {
    return;
  }

  for (const segment of transcriptionSegments) {
    if (typeof segment.start !== 'number' && typeof segment.end !== 'number') {
      continue;
    }

    const matches = diarizationSegments
      .filter((item) => overlaps(item, segment))
      .sort((a, b) => a.start - b.start);

    if (matches.length === 0) {
      continue;
    }

    segment.speaker = matches[0]?.speaker ?? null;
    segment.diarization = matches;
  }
}

export async function diarizeStep(context: PipelineContext): Promise<void> {
  const { job, environment, services, jobStore, config, logger } = context;

  if (!config.pipeline.enableDiarization) {
    logger.info({ jobId: job.id }, 'Diarize step skipped because diarization disabled');
    await jobStore.appendLog(job.id, 'Diarisation désactivée, étape ignorée');
    context.data.diarization = [];
    return;
  }

  const inputPath = context.data.preparedPath;
  if (!inputPath) {
    const message = 'Chemin audio introuvable, diarisation ignorée';
    logger.warn({ jobId: job.id }, 'Diarize step skipped due to missing audio path');
    await jobStore.appendLog(job.id, message, 'warn');
    context.data.diarization = [];
    return;
  }

  await jobStore.appendLog(job.id, 'Diarisation des locuteurs');

  try {
    const diarizationDir = path.join(environment.jobsDir, job.id, 'diarization');
    ensureDirectory(diarizationDir);

    const result = await services.diarization.diarize({ inputPath, outputDir: diarizationDir });
    const segments = Array.isArray(result?.segments) ? result.segments : [];

    context.data.diarization = segments;
    assignSpeakers(context.data.transcription?.segments, segments);

    logger.info(
      { jobId: job.id, segmentCount: segments.length },
      'Diarize step completed',
    );
    await jobStore.appendLog(job.id, 'Diarisation générée');
  } catch (error) {
    logger.error({ jobId: job.id, error }, 'Diarize step failed');
    await jobStore.appendLog(job.id, "Diarisation échouée, étape ignorée", 'warn');
    context.data.diarization = context.data.diarization ?? [];
  }
}
