import path from 'node:path';

export async function transcribeStep(context) {
  const { job, environment, services, jobStore, config } = context;
  const inputPath = context.data.preparedPath;
  const transcriptDir = path.join(environment.jobsDir, job.id, 'transcript');

  await jobStore.appendLog(job.id, 'Transcription locale (Whisper)');

  const result = await services.whisper.transcribe({
    inputPath,
    outputDir: transcriptDir,
    config: config.whisper,
  });

  context.data.transcription = result;

  await jobStore.appendLog(job.id, 'Transcription générée');
}
