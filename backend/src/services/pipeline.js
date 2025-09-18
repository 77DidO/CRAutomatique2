import fs from 'fs';
import path from 'path';
import { getConfig } from './configService.js';
import { upsertJobUpdate } from './jobStore.js';
import { ensureJobDirectory, writeTextFile, writeJsonFile } from '../utils/fileSystem.js';
import { generateSummary } from './llmService.js';

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
  return { ...job, sourcePath };
}

async function handleTranscription(job) {
  const text = `Transcription simulée pour ${job.originalFilename}.`;
  writeTextFile(job.id, 'transcription_raw.txt', text);
  writeJsonFile(job.id, 'segments.json', [
    { speaker: 'SPEAKER_00', start: 0, end: 10, text }
  ]);
  writeTextFile(job.id, 'subtitles.vtt', 'WEBVTT\n\n00:00.000 --> 00:10.000\n' + text);
  return { ...job, transcription: text };
}

function cleanText(rawText) {
  return rawText.replace(/\s+/g, ' ').trim();
}

async function handleClean(job) {
  const clean = cleanText(job.transcription || '');
  writeTextFile(job.id, 'transcription_clean.txt', clean);
  return { ...job, cleanTranscription: clean };
}

async function handleSummarize(job) {
  const { enableSummary } = getConfig();
  if (!enableSummary) {
    return job;
  }
  const prompt = `Résumé en français de cette réunion:\n${job.cleanTranscription}`;
  let summary = 'Résumé indisponible.';
  try {
    summary = await generateSummary(prompt);
  } catch (error) {
    summary = `Résumé impossible: ${error.message}`;
  }
  writeTextFile(job.id, 'summary.md', summary);
  writeTextFile(job.id, 'summary.html', `<article>${summary}</article>`);
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
      upsertJobUpdate(job.id, () => currentJob);
      onProgress?.(currentJob);
      break;
    }
    appendLog(job.id, logs, `Début de l'étape ${step}`);
    currentJob = { ...currentJob, status: step, updatedAt: new Date().toISOString() };
    upsertJobUpdate(job.id, () => currentJob);
    onProgress?.(currentJob);
    try {
      await simulateProcessingDelay(300);
      const handler = STEP_HANDLERS[step];
      if (handler) {
        currentJob = await handler(currentJob);
      }
      appendLog(job.id, logs, `Fin de l'étape ${step}`);
      currentJob = {
        ...currentJob,
        progress: Math.min(95, (STEPS.indexOf(step) / (STEPS.length - 1)) * 100),
        updatedAt: new Date().toISOString()
      };
      upsertJobUpdate(job.id, () => currentJob);
      onProgress?.(currentJob);
    } catch (error) {
      appendLog(job.id, logs, `Erreur à l'étape ${step}: ${error.message}`);
      currentJob = { ...currentJob, status: 'error', error: error.message, updatedAt: new Date().toISOString() };
      upsertJobUpdate(job.id, () => currentJob);
      onProgress?.(currentJob);
      return;
    }
  }
}
