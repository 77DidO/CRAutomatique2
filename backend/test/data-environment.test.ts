import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDataEnvironment } from '../src/utils/data-environment.js';
import type { Logger } from '../src/types/index.js';

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cr-data-env-test-'));
}

function createLogger(warnCalls: Array<{ payload: unknown; message?: string }>): Logger {
  return {
    info() {},
    error() {},
    debug() {},
    warn(payload, message) {
      warnCalls.push({ payload, message });
    },
  };
}

test('ensureDataEnvironment falls back to default python binary when configured path is inaccessible', async () => {
  const warnCalls: Array<{ payload: unknown; message?: string }> = [];
  const logger = createLogger(warnCalls);

  const rootDir = createTempRoot();
  const originalDataRoot = process.env.DATA_ROOT;
  const originalWhisperPath = process.env.WHISPER_PYTHON_PATH;

  process.env.DATA_ROOT = rootDir;
  process.env.WHISPER_PYTHON_PATH = path.join(rootDir, 'missing-python');

  try {
    const environment = await ensureDataEnvironment({ logger });

    assert.equal(environment.whisperBinary, 'python');
    assert.ok(warnCalls.length > 0);

    const { payload, message } = warnCalls[0];
    assert.equal(message, 'Whisper Python binary is not accessible; falling back to default');
    assert.equal((payload as { path?: string }).path, process.env.WHISPER_PYTHON_PATH);
  } finally {
    fs.rmSync(rootDir, { recursive: true, force: true });

    if (originalDataRoot) {
      process.env.DATA_ROOT = originalDataRoot;
    } else {
      delete process.env.DATA_ROOT;
    }

    if (originalWhisperPath) {
      process.env.WHISPER_PYTHON_PATH = originalWhisperPath;
    } else {
      delete process.env.WHISPER_PYTHON_PATH;
    }
  }
});
