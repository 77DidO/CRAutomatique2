import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { createSpeakerDiarizationService } from '../src/services/speaker-diarization-service.js';
import type { Environment, Logger } from '../src/types/index.js';

interface MockChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: () => boolean;
}

function createTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cr-automatique-diarization-test-'));
}

function createEnvironment(rootDir: string): Environment {
  const jobsDir = path.join(rootDir, 'jobs');
  const uploadsDir = path.join(rootDir, 'uploads');
  const tmpDir = path.join(rootDir, 'tmp');
  fs.mkdirSync(jobsDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  return {
    rootDir,
    jobsDir,
    uploadsDir,
    tmpDir,
    configFile: path.join(rootDir, 'config.json'),
    templatesFile: path.join(rootDir, 'templates.json'),
    jobsFile: path.join(rootDir, 'jobs.json'),
    whisperBinary: null,
    ffmpegBinary: null,
  };
}

function createLogger(): Logger {
  return {
    info() {},
    error() {},
    warn() {},
    debug() {},
  };
}

function createMockProcess({
  onStart,
  killImpl,
}: {
  onStart?: (child: MockChildProcess) => void;
  killImpl?: () => boolean;
} = {}): MockChildProcess {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = new EventEmitter() as MockChildProcess;
  child.stdout = stdout;
  child.stderr = stderr;
  child.kill = killImpl || (() => true);
  if (onStart) {
    onStart(child);
  }
  return child;
}

test('speaker diarization service returns parsed segments from stdout', async () => {
  const rootDir = createTempRoot();
  const environment = createEnvironment(rootDir);
  const logger = createLogger();
  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'fake-audio');

  const spawnCalls: Array<{ command: string; args: string[] }> = [];

  const service = createSpeakerDiarizationService(environment, {
    logger,
    spawn: (command, args) => {
      const argList = Array.isArray(args) ? [...args] : [];
      spawnCalls.push({ command, args: argList });
      const child = createMockProcess();
      setImmediate(() => {
        child.stdout.emit(
          'data',
          JSON.stringify({ segments: [{ start: 0, end: 1.2, speaker: 'alpha' }] }),
        );
        child.emit('close', 0);
      });
      return child;
    },
  });

  const result = await service.diarize({ inputPath, outputDir: path.join(rootDir, 'out') });

  assert.deepEqual(result.segments, [{ start: 0, end: 1.2, speaker: 'alpha' }]);
  assert.equal(spawnCalls.length, 1);
  assert.ok(spawnCalls[0]?.args.includes('--input'));
  assert.ok(spawnCalls[0]?.args.includes('--output'));
});

test('speaker diarization service rejects when process exits with error', async () => {
  const rootDir = createTempRoot();
  const environment = createEnvironment(rootDir);
  const logger = createLogger();
  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'fake-audio');

  const service = createSpeakerDiarizationService(environment, {
    logger,
    spawn: () => {
      const child = createMockProcess();
      setImmediate(() => {
        child.stderr.emit('data', 'boom');
        child.emit('close', 2);
      });
      return child;
    },
  });

  await assert.rejects(
    service.diarize({ inputPath, outputDir: path.join(rootDir, 'out') }),
    /code 2/,
  );
});

test('speaker diarization service aborts when timeout is reached', async () => {
  const rootDir = createTempRoot();
  const environment = createEnvironment(rootDir);
  const logger = createLogger();
  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'fake-audio');

  process.env.DIARIZATION_TIMEOUT = '25';

  let killed = false;

  const service = createSpeakerDiarizationService(environment, {
    logger,
    spawn: () =>
      createMockProcess({
        killImpl: () => {
          killed = true;
          return true;
        },
      }),
  });

  await assert.rejects(
    service.diarize({ inputPath, outputDir: path.join(rootDir, 'out') }),
    /arrêté après 25ms/,
  );

  assert.equal(killed, true);
  delete process.env.DIARIZATION_TIMEOUT;
});
