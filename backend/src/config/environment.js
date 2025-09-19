import { access, mkdir, writeFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { CONFIG_FILE, DATA_DIR, JOBS_DIR, TEMPLATES_FILE, UPLOADS_DIR } from './paths.js';

async function ensureDirectory(targetPath) {
  await mkdir(targetPath, { recursive: true });
}

async function ensureFile(filePath, defaultValue) {
  try {
    await access(filePath, fsConstants.F_OK);
  } catch (error) {
    const payload = typeof defaultValue === 'string'
      ? defaultValue
      : JSON.stringify(defaultValue, null, 2);
    await writeFile(filePath, `${payload}\n`, 'utf8');
  }
}

export async function ensureDataEnvironment() {
  await ensureDirectory(DATA_DIR);
  await ensureDirectory(JOBS_DIR);
  await ensureDirectory(UPLOADS_DIR);

  await ensureFile(CONFIG_FILE, {
    llmProvider: 'mock',
    openaiApiKey: '',
    diarization: {
      enabled: true,
      speakerCount: 'auto'
    },
    pipeline: {
      transcription: true,
      summary: true,
      subtitles: true
    }
  });

  await ensureFile(TEMPLATES_FILE, [
    {
      id: 'default',
      name: 'Compte rendu standard',
      description: 'Structure générique pour les réunions et entretiens.'
    },
    {
      id: 'meeting',
      name: 'Réunion stratégique',
      description: 'Mise en avant des décisions, actions et risques.'
    },
    {
      id: 'interview',
      name: 'Interview qualitative',
      description: 'Focus sur les verbatims et la tonalité du discours.'
    }
  ]);

  await ensureFile(path.join(DATA_DIR, 'jobs.json'), []);
}
