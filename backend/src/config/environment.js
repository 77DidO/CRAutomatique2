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
    llmApiToken: '',
    openai: {
      apiKey: '',
      chatModel: 'gpt-4o-mini',
      temperature: 0.7
    },
    transcription: {
      engine: 'local-whisper',
      binaryPath: 'whisper',
      model: 'base',
      language: 'auto',
      translate: false,
      temperature: 0,
      extraArgs: []
    },
    diarization: {
      enabled: true,
      speakerCount: 'auto'
    },
    pipeline: {
      transcription: true,
      summary: false,
      subtitles: true
    }
  });

  await ensureFile(TEMPLATES_FILE, [
    {
      id: 'default',
      name: 'Compte rendu standard',
      description: 'Structure générique pour les réunions et entretiens.',
      prompt: 'Analyse la transcription et génère un compte rendu synthétique en français, organisé en sections avec les décisions, actions et points ouverts.'
    },
    {
      id: 'meeting',
      name: 'Réunion stratégique',
      description: 'Mise en avant des décisions, actions et risques.',
      prompt: 'Tu es un expert en pilotage stratégique. Résume la réunion en listant les décisions, les actions, les risques et les points à surveiller.'
    },
    {
      id: 'interview',
      name: 'Interview qualitative',
      description: 'Focus sur les verbatims et la tonalité du discours.',
      prompt: 'Tu es un analyste en recherche utilisateur. Dresse un portrait des intervenants, résume les verbatims marquants et note les émotions ressenties.'
    }
  ]);

  await ensureFile(path.join(DATA_DIR, 'jobs.json'), []);
}
