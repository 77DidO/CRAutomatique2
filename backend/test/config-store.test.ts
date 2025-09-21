import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDataEnvironment } from '../src/utils/data-environment.js';
import { createConfigRepository } from '../src/persistence/config-store.js';
import type { Logger } from '../src/types/index.js';

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cr-config-test-'));
}

function createLogger(): Logger {
  return {
    info() {},
    error() {},
    debug() {},
    warn() {},
  };
}

test('config repository deeply merges values', async () => {
  const rootDir = createTempRoot();
  process.env.DATA_ROOT = rootDir;

  const logger = createLogger();
  const environment = await ensureDataEnvironment({ logger });
  const configStore = await createConfigRepository(environment, { logger });

  const updated = await configStore.write({
    llm: { model: 'gpt-4o', temperature: 0.5 },
    pipeline: { enableSummaries: false },
  });

  assert.equal(updated.llm.model, 'gpt-4o');
  assert.equal(updated.llm.temperature, 0.5);
  assert.equal(updated.pipeline.enableSummaries, false);
  assert.equal(updated.whisper.model, 'base');
});
