import path from 'node:path';
import type { PipelineContext } from '../../types/index.js';

export async function ingestStep(context: PipelineContext): Promise<void> {
  const { job, environment, services, jobStore } = context;
  const jobDir = path.join(environment.jobsDir, job.id);
  const sourcePath = path.join(jobDir, job.filename);
  const preparedPath = path.join(jobDir, 'prepared.wav');

  await jobStore.appendLog(job.id, 'Prétraitement audio (FFmpeg)');

  try {
    await services.ffmpeg.normalizeAudio({ input: sourcePath, output: preparedPath });
    context.data.preparedPath = preparedPath;
    await jobStore.appendLog(job.id, 'Fichier audio normalisé');
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError : new Error('FFmpeg normalisation failed');
    await jobStore.appendLog(job.id, `Normalisation FFmpeg échouée : ${error.message}`, 'warn');
    context.data.preparedPath = sourcePath;
  }
}
