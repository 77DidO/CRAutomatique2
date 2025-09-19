import fs from 'fs';
import path from 'path';
import { getConfig } from './configService.js';
import { upsertJobUpdate } from './jobStore.js';
import { ensureJobDirectory, writeTextFile, writeJsonFile } from '../utils/fileSystem.js';
import { generateSummary } from './llmService.js';
import { buildSummaryPrompt, DEFAULT_TEMPLATE_ID } from '../constants/templates.js';
import { preprocessAudio } from './audioPreprocessor.js';
import { transcribeAudio } from './transcriptionService.js';
import { info, warn, error as logError, debug } from '../utils/logger.js';

const STEPS = ['queued', 'preconvert', 'transcribe', 'clean', 'summarize', 'done'];

function appendLog(jobId, logs, message) {
  const timestamp = new Date().toISOString();
  logs.push(`[${timestamp}] ${message}`);
  writeTextFile(jobId, 'logs.txt', logs.join('\n'));
}

async function simulateProcessingDelay(delayMs) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function handlePreconvert(job) {
  const dir = ensureJobDirectory(job.id);
  const sourcePath = path.join(dir, job.originalFilename);
  fs.copyFileSync(job.uploadPath, sourcePath);
  debug('Fichier source copié pour le job', { jobId: job.id, sourcePath });
  try {
    const processedPath = await preprocessAudio(sourcePath, dir);
    info('Fichier audio prétraité pour le job', { jobId: job.id, processedPath });
    return { ...job, sourcePath, processedPath };
  } catch (error) {
    logError('Échec du prétraitement audio', { jobId: job.id, message: error.message });
    throw error;
  }
}

async function handleTranscription(job) {
  if (!job.processedPath) {
    throw new Error('Fichier traité introuvable pour la transcription.');
  }

  const { text, segments, vtt } = await transcribeAudio(job.processedPath);
  writeTextFile(job.id, 'transcription_raw.txt', text);
  writeJsonFile(job.id, 'segments.json', segments);
  writeTextFile(job.id, 'subtitles.vtt', vtt);
  appendLog(job.id, job.logs, `Transcription générée (${segments.length} segments).`);
  info('Transcription finalisée', { jobId: job.id, segments: segments.length });
  return {
    ...job,
    transcription: text,
    transcriptionSegments: segments,
    subtitlesVtt: vtt
  };
}

function cleanText(rawText) {
  return rawText.replace(/\s+/g, ' ').trim();
}

async function handleClean(job) {
  const clean = cleanText(job.transcription || '');
  writeTextFile(job.id, 'transcription_clean.txt', clean);
  debug('Transcription nettoyée écrite', { jobId: job.id });
  return { ...job, cleanTranscription: clean };
}

async function handleSummarize(job) {
  const { enableSummary, defaultTemplate, templates } = getConfig();
  if (!enableSummary) {
    return job;
  }
  const templateId = job.template || defaultTemplate || DEFAULT_TEMPLATE_ID;
  const prompt = buildSummaryPrompt(templateId, job.cleanTranscription || '', {
    templates,
    defaultTemplateId: defaultTemplate
  });
  let summary = 'Résumé indisponible.';
  try {
    summary = await generateSummary(prompt);
    info('Résumé généré par le service LLM', { jobId: job.id, template: templateId });
  } catch (error) {
    summary = `Résumé impossible: ${error.message}`;
    warn('Échec de la génération du résumé', { jobId: job.id, message: error.message });
  }
  writeTextFile(job.id, 'summary.md', summary);
  writeTextFile(job.id, 'summary.html', `<article>${summary}</article>`);
  appendLog(job.id, job.logs, `Résumé généré avec le gabarit ${templateId}.`);
  debug('Résumé écrit sur disque', { jobId: job.id, template: templateId });
  return { ...job, summary };
}

const STEP_HANDLERS = {
  preconvert: handlePreconvert,
  transcribe: handleTranscription,
  clean: handleClean,
  summarize: handleSummarize
};

export async function processJob(job, onProgress) {
  const logs = job.logs || [];
  let currentJob = { ...job, logs };
  for (const step of STEPS.slice(1)) {
    if (step === 'done') {
      currentJob = {
        ...currentJob,
        status: 'done',
        progress: 100,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      appendLog(job.id, logs, 'Traitement terminé.');
      info('Job terminé', { jobId: job.id });
      upsertJobUpdate(job.id, () => currentJob);
      onProgress?.(currentJob);
      break;
    }
    appendLog(job.id, logs, `Début de l'étape ${step}`);
    info('Début d\'étape', { jobId: job.id, step });
    currentJob = { ...currentJob, status: step, updatedAt: new Date().toISOString() };
    upsertJobUpdate(job.id, () => currentJob);
    onProgress?.(currentJob);
    try {
      await simulateProcessingDelay(300);
      const handler = STEP_HANDLERS[step];
      if (handler) {
        debug('Exécution du handler d\'étape', { jobId: job.id, step });
        currentJob = await handler(currentJob);
      }
      appendLog(job.id, logs, `Fin de l'étape ${step}`);
      info('Fin d\'étape', { jobId: job.id, step });
      currentJob = {
        ...currentJob,
        progress: Math.min(95, (STEPS.indexOf(step) / (STEPS.length - 1)) * 100),
        updatedAt: new Date().toISOString()
      };
      upsertJobUpdate(job.id, () => currentJob);
      onProgress?.(currentJob);
    } catch (error) {
      appendLog(job.id, logs, `Erreur à l'étape ${step}: ${error.message}`);
      warn('Erreur durant une étape', { jobId: job.id, step, message: error.message });
      currentJob = { ...currentJob, status: 'error', error: error.message, updatedAt: new Date().toISOString() };
      upsertJobUpdate(job.id, () => currentJob);
      onProgress?.(currentJob);
      logError('Arrêt du job suite à une erreur', { jobId: job.id, step, message: error.message });
      return;
    }
  }
}
