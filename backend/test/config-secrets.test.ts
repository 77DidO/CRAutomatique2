import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDataEnvironment } from '../src/utils/data-environment.js';
import { createConfigRepository } from '../src/persistence/config-store.js';
import { maskSecrets, sanitisePayload } from '../src/http/routes/config-router.helpers.js';
import type { Logger } from '../src/types/index.js';

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cr-config-secrets-test-'));
}

function createLogger(): Logger {
  return {
    info() {},
    error() {},
    debug() {},
    warn() {},
  };
}

test('maskSecrets hides the API key and reports its presence', async () => {
  const rootDir = createTempRoot();
  process.env.DATA_ROOT = rootDir;

  const logger = createLogger();
  const environment = await ensureDataEnvironment({ logger });
  const configStore = await createConfigRepository(environment, { logger });

  const initialMasked = maskSecrets(await configStore.read());
  assert.equal(initialMasked.llm.hasApiKey, false);
  assert.ok(!('apiKey' in initialMasked.llm));

  const sanitised = sanitisePayload({ llm: { apiKey: ' sk-secret ' } });
  await configStore.write(sanitised);

  const maskedAfterWrite = maskSecrets(await configStore.read());
  assert.equal(maskedAfterWrite.llm.hasApiKey, true);
  assert.ok(!('apiKey' in maskedAfterWrite.llm));

  const clearPayload = sanitisePayload({ llm: { apiKey: '   ' } });
  await configStore.write(clearPayload);

  const maskedAfterClear = maskSecrets(await configStore.read());
  assert.equal(maskedAfterClear.llm.hasApiKey, false);
  assert.ok(!('apiKey' in maskedAfterClear.llm));

  fs.rmSync(rootDir, { recursive: true, force: true });
  delete process.env.DATA_ROOT;
});
