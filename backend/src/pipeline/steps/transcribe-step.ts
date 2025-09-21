import path from 'node:path';
import type { PipelineContext } from '../../types/index.js';

export async function transcribeStep(context: PipelineContext): Promise<void> {
  const { job, environment, services, jobStore, config, logger } = context;
  const inputPath = context.data.preparedPath;
  if (!inputPath) {
    throw new Error('Chemin audio préparé introuvable pour la transcription');
  }
  const transcriptDir = path.join(environment.jobsDir, job.id, 'transcript');

  await jobStore.appendLog(job.id, 'Transcription locale (Whisper)');
  logger.info(
    {
      jobId: job.id,
      inputPath,
      transcriptDir,
      whisperConfig: config.whisper,
    },
    'Transcribe step started',
  );

  const result = await services.whisper.transcribe({
    inputPath,
    outputDir: transcriptDir,
    config: config.whisper,
  });

  context.data.transcription = result;
  logger.info(
    {
      jobId: job.id,
      transcriptDir,
      segmentCount: result.segments?.length ?? 0,
      language: result.language ?? null,
    },
    'Transcribe step completed',
  );

  await jobStore.appendLog(job.id, 'Transcription générée');
}
