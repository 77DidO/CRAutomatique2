import path from 'node:path';
import fs from 'node:fs';
import type { PipelineContext } from '../../types/index.js';

export async function transcribeStep(context: PipelineContext): Promise<void> {
  const { job, environment, services, jobStore, config, logger } = context;
  const inputPath = context.data.preparedPath;
  if (!inputPath) {
    throw new Error('Chemin audio préparé introuvable pour la transcription');
  }
  const transcriptDir = path.join(environment.jobsDir, job.id, 'transcript');
  
  // Fonction d'attente
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Tentative de nettoyage avec plusieurs essais
  for (let i = 0; i < 3; i++) {
    try {
      if (fs.existsSync(transcriptDir)) {
        await fs.promises.rm(transcriptDir, { recursive: true, force: true });
      }
      break; // Si on arrive ici, c'est que ça a fonctionné
    } catch (error) {
      if (i === 2) { // Dernier essai
        logger.warn({ error }, 'Échec du nettoyage du dossier de transcription après plusieurs tentatives');
      } else {
        logger.info(`Tentative ${i + 1} de nettoyage du dossier échouée, nouvelle tentative dans 1s...`);
        await sleep(1000); // Attendre 1 seconde avant de réessayer
      }
    }
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
