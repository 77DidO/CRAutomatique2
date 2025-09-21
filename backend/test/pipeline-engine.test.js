import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

import { ensureDataEnvironment } from '../src/utils/data-environment.js';
import { createJobRepository } from '../src/persistence/job-store.js';
import { createConfigRepository } from '../src/persistence/config-store.js';
import { createTemplateRepository } from '../src/persistence/template-store.js';
import { createPipelineEngine } from '../src/pipeline/engine.js';
import { createOpenAiService } from '../src/services/openai-service.js';

function createTempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cr-automatique-test-'));
}

test('pipeline completes job with stub services', async () => {
  const rootDir = createTempRoot();
  process.env.DATA_ROOT = rootDir;
  process.env.OPENAI_API_KEY = 'test-key';

  const logger = { info() {}, error() {}, debug() {}, warn() {} };
  const environment = await ensureDataEnvironment({ logger });

  const jobStore = await createJobRepository(environment, { logger });
  const configStore = await createConfigRepository(environment, { logger });
  const templateStore = await createTemplateRepository(environment, { logger });

  const services = {
    ffmpeg: {
      async normalizeAudio({ input, output }) {
        await fs.promises.copyFile(input, output);
      },
    },
    whisper: {
      async transcribe() {
        return {
          text: 'Bonjour monde',
          segments: [
            { start: 0, end: 1.5, text: 'Bonjour' },
            { start: 1.5, end: 2.5, text: 'monde' },
          ],
        };
      },
    },
    openai: {
      async generateSummary() {
        return { markdown: '# Résumé\n- Point clé' };
      },
    },
  };

  const pipeline = createPipelineEngine({
    environment,
    jobStore,
    configStore,
    templateStore,
    services,
    logger,
  });

  const uploadPath = path.join(environment.tmpDir, 'sample.wav');
  await fs.promises.writeFile(uploadPath, 'fake-audio');

  const job = await jobStore.create({
    filename: 'sample.wav',
    tempPath: uploadPath,
    templateId: 'default',
    participants: ['Alice', 'Bob'],
  });

  await pipeline.enqueue(job.id);

  const finalJob = await waitFor(async () => {
    const value = await jobStore.get(job.id);
    if (value?.status === 'completed') {
      return value;
    }
    return null;
  }, 10_000);

  assert.equal(finalJob.status, 'completed');
  assert.equal(finalJob.outputs.length, 3);

  const transcriptPath = path.join(environment.jobsDir, job.id, 'transcription_raw.txt');
  const summaryPath = path.join(environment.jobsDir, job.id, 'summary.md');
  const subtitlesPath = path.join(environment.jobsDir, job.id, 'subtitles.vtt');

  assert.ok(fs.existsSync(transcriptPath));
  assert.ok(fs.existsSync(summaryPath));
  assert.ok(fs.existsSync(subtitlesPath));
});

test('pipeline completes job when summary generation is skipped', async () => {
  const rootDir = createTempRoot();
  process.env.DATA_ROOT = rootDir;
  delete process.env.OPENAI_API_KEY;

  const logger = { info() {}, error() {}, debug() {}, warn() {} };
  const environment = await ensureDataEnvironment({ logger });

  const jobStore = await createJobRepository(environment, { logger });
  const configStore = await createConfigRepository(environment, { logger });
  const templateStore = await createTemplateRepository(environment, { logger });

  const services = {
    ffmpeg: {
      async normalizeAudio({ input, output }) {
        await fs.promises.copyFile(input, output);
      },
    },
    whisper: {
      async transcribe() {
        return {
          text: 'Bonjour monde',
          segments: [
            { start: 0, end: 1, text: 'Bonjour' },
            { start: 1, end: 2, text: 'monde' },
          ],
        };
      },
    },
    openai: {
      async generateSummary() {
        return { markdown: null, reason: 'missing_api_key' };
      },
    },
  };

  const pipeline = createPipelineEngine({
    environment,
    jobStore,
    configStore,
    templateStore,
    services,
    logger,
  });

  const uploadPath = path.join(environment.tmpDir, 'sample.wav');
  await fs.promises.writeFile(uploadPath, 'fake-audio');

  const job = await jobStore.create({
    filename: 'sample.wav',
    tempPath: uploadPath,
    templateId: 'default',
    participants: ['Alice'],
  });

  await pipeline.enqueue(job.id);

  const finalJob = await waitFor(async () => {
    const value = await jobStore.get(job.id);
    if (value?.status === 'completed') {
      return value;
    }
    return null;
  }, 10_000);

  assert.equal(finalJob.status, 'completed');
  assert.equal(finalJob.outputs.length, 2);

  const summaryPath = path.join(environment.jobsDir, job.id, 'summary.md');
  assert.ok(!fs.existsSync(summaryPath));

  const logs = await jobStore.getLogs(job.id);
  assert.ok(
    logs.some((entry) => entry.level === 'warn' && entry.message.includes('Résumé ignoré')),
    'Expected warning log when summary is skipped',
  );
});

test('pipeline completes job when placeholder OpenAI key is provided', async () => {
  const rootDir = createTempRoot();
  process.env.DATA_ROOT = rootDir;
  process.env.OPENAI_API_KEY = '  sk-replace-me  ';

  const logger = { info() {}, error() {}, debug() {}, warn() {} };
  const environment = await ensureDataEnvironment({ logger });

  const jobStore = await createJobRepository(environment, { logger });
  const configStore = await createConfigRepository(environment, { logger });
  const templateStore = await createTemplateRepository(environment, { logger });

  const services = {
    ffmpeg: {
      async normalizeAudio({ input, output }) {
        await fs.promises.copyFile(input, output);
      },
    },
    whisper: {
      async transcribe() {
        return {
          text: 'Bonjour monde',
          segments: [
            { start: 0, end: 1, text: 'Bonjour' },
            { start: 1, end: 2, text: 'monde' },
          ],
        };
      },
    },
    openai: createOpenAiService({ configStore, logger }),
  };

  const pipeline = createPipelineEngine({
    environment,
    jobStore,
    configStore,
    templateStore,
    services,
    logger,
  });

  const uploadPath = path.join(environment.tmpDir, 'sample.wav');
  await fs.promises.writeFile(uploadPath, 'fake-audio');

  const job = await jobStore.create({
    filename: 'sample.wav',
    tempPath: uploadPath,
    templateId: 'default',
    participants: ['Alice'],
  });

  await pipeline.enqueue(job.id);

  const finalJob = await waitFor(async () => {
    const value = await jobStore.get(job.id);
    if (value?.status === 'completed') {
      return value;
    }
    return null;
  }, 10_000);

  assert.equal(finalJob.status, 'completed');
  assert.equal(finalJob.outputs.length, 2);

  const summaryPath = path.join(environment.jobsDir, job.id, 'summary.md');
  assert.ok(!fs.existsSync(summaryPath));

  const logs = await jobStore.getLogs(job.id);
  assert.ok(
    logs.some((entry) => entry.level === 'warn' && entry.message.includes('Résumé ignoré')),
    'Expected warning log when placeholder key is ignored',
  );

  delete process.env.OPENAI_API_KEY;
});

async function waitFor(checker, timeout) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const result = await checker();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Timeout waiting for condition');
}
