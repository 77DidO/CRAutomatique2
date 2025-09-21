import path from 'node:path';

export async function ingestStep(context) {
  const { job, environment, services, jobStore } = context;
  const jobDir = path.join(environment.jobsDir, job.id);
  const sourcePath = path.join(jobDir, job.filename);
  const preparedPath = path.join(jobDir, 'prepared.wav');

  await jobStore.appendLog(job.id, 'Prétraitement audio (FFmpeg)');

  try {
    await services.ffmpeg.normalizeAudio({ input: sourcePath, output: preparedPath });
    context.data.preparedPath = preparedPath;
    await jobStore.appendLog(job.id, 'Fichier audio normalisé');
  } catch (error) {
    await jobStore.appendLog(job.id, `Normalisation FFmpeg échouée : ${error.message}`, 'warn');
    context.data.preparedPath = sourcePath;
  }
}
