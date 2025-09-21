import path from 'node:path';
import { ensureDirectory, ensureFile } from './fs.js';
import type { AppConfig, Environment, Logger, Template } from '../types/index.js';

interface EnsureDataEnvironmentOptions {
  logger: Logger;
}

export async function ensureDataEnvironment({ logger }: EnsureDataEnvironmentOptions): Promise<Environment> {
  const rootDir = process.env.DATA_ROOT || path.join(process.cwd(), 'data');
  const jobsDir = path.join(rootDir, 'jobs');
  const uploadsDir = path.join(rootDir, 'uploads');
  const tmpDir = path.join(process.cwd(), 'tmp');

  ensureDirectory(rootDir);
  ensureDirectory(jobsDir);
  ensureDirectory(uploadsDir);
  ensureDirectory(tmpDir);

  const configFile = path.join(rootDir, 'config.json');
  const templatesFile = path.join(rootDir, 'templates.json');
  const jobsFile = path.join(rootDir, 'jobs.json');

  ensureFile(configFile, JSON.stringify(defaultConfig(), null, 2));
  ensureFile(templatesFile, JSON.stringify(defaultTemplates(), null, 2));
  ensureFile(jobsFile, JSON.stringify({ jobs: [], logs: {} }, null, 2));

  const whisperBinary = process.env.WHISPER_PATH || 'python';
  const ffmpegBinary = process.env.FFMPEG_PATH || null;

  return {
    rootDir,
    jobsDir,
    uploadsDir,
    tmpDir,
    configFile,
    templatesFile,
    jobsFile,
    whisperBinary,
    ffmpegBinary,
  };
}

function defaultConfig(): AppConfig {
  return {
    whisper: {
      model: 'base',
      language: null,
      computeType: 'auto',
      batchSize: 0,
      vad: true,
      chunkDuration: 0,
    },
    llm: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
    pipeline: {
      enableSummaries: true,
      enableSubtitles: true,
    },
  };
}

function defaultTemplates(): { templates: Template[] } {
  return {
    templates: [
      {
        id: 'default',
        name: 'Résumé standard',
        description: 'Résumé synthétique en français',
        prompt: 'Résume cette transcription sous forme de points clés.',
      },
    ],
  };
}
