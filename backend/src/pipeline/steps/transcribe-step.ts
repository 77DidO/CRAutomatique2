import path from 'node:path';
import type { PipelineContext } from '../../types/index.js';
import { removeDirectory } from '../../utils/fs.js';

export async function transcribeStep(context: PipelineContext): Promise<void> {
  const { job, environment, services, jobStore, config, logger } = context;
  const inputPath = context.data.preparedPath;
  if (!inputPath) {
    throw new Error('Chemin audio préparé introuvable pour la transcription');
  }
  const transcriptDir = path.join(environment.jobsDir, job.id, 'transcript');

  // Nettoyage défensif du dossier de sortie afin d'éviter l'utilisation d'un cache obsolète.
  try {
    await removeDirectory(transcriptDir, { retries: 3, delayMs: 500 });
  } catch (error) {
    logger.warn(
      { error, jobId: job.id, transcriptDir },
      'Échec du nettoyage du dossier de transcription, poursuite du pipeline',
    );
  }

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

  // Les segments et métadonnées sont conservés pour alimenter les étapes suivantes (résumé, sous-titres, ...).
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
