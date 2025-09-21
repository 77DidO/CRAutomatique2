import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createWhisperService } from '../src/services/whisper-service.js';
import type { Environment, Logger, WhisperConfig } from '../src/types/index.js';

const logger: Logger = {
  info() {},
  error() {},
  warn() {},
  debug() {},
};

const baseConfig: WhisperConfig = {
  model: 'base',
  language: 'fr',
  computeType: 'auto',
  batchSize: 1,
  vad: true,
  chunkDuration: 0,
};

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cr-automatique-whisper-'));
}

function createEnvironment(rootDir: string, whisperBinary: string): Environment {
  return {
    rootDir,
    jobsDir: path.join(rootDir, 'jobs'),
    uploadsDir: path.join(rootDir, 'uploads'),
    tmpDir: path.join(rootDir, 'tmp'),
    configFile: path.join(rootDir, 'config.json'),
    templatesFile: path.join(rootDir, 'templates.json'),
    jobsFile: path.join(rootDir, 'jobs.json'),
    whisperBinary,
    ffmpegBinary: null,
  };
}

function createMockWhisperBinary(rootDir: string, options: {
  writeTextFile: boolean;
  textContent: string;
  jsonText: string;
  useBaseName?: boolean;
  nested?: boolean;
  nestedSegments?: string[];
}): string {
  const scriptPath = path.join(rootDir, `mock-whisper-${crypto.randomUUID()}.mjs`);
  const nestedSegments = options.nestedSegments ?? [];
  const nestedSegmentsParam =
    nestedSegments.length > 0 ? `, ${nestedSegments.map((segment) => JSON.stringify(segment)).join(', ')}` : '';
  const targetDirExpression = options.nested ? `path.join(outputDir, baseName${nestedSegmentsParam})` : 'outputDir';
  const script = `#!/usr/bin/env node\n` +
    `import fs from 'node:fs';\n` +
    `import path from 'node:path';\n` +
    `const args = process.argv.slice(2);\n` +
    `const inputPath = args[0];\n` +
    `let outputDir = process.cwd();\n` +
    `const outputFormats = [];\n` +
    `for (let i = 0; i < args.length; i++) {\n` +
    `  if (args[i] === '--output_dir' && i + 1 < args.length) {\n` +
    `    outputDir = args[i + 1];\n` +
    `    i++;\n` +
    `    continue;\n` +
    `  }\n` +
    `  if (args[i] === '--output_format' && i + 1 < args.length) {\n` +
    `    outputFormats.push(args[i + 1]);\n` +
    `    i++;\n` +
    `    continue;\n` +
    `  }\n` +
    `}\n` +
    `const parsed = path.parse(inputPath);\n` +
    `const baseName = ${options.useBaseName ? 'parsed.base' : 'parsed.name'};\n` +
    `const targetDir = ${targetDirExpression};\n` +
    `fs.mkdirSync(targetDir, { recursive: true });\n` +
    `const jsonPath = path.join(targetDir, baseName + '.json');\n` +
    `fs.writeFileSync(jsonPath, JSON.stringify({ text: ${JSON.stringify(options.jsonText)}, language: 'fr', segments: [{ start: 0, end: 1, text: 'Bonjour' }] }));\n` +
    `if (${options.writeTextFile ? 'true' : 'false'}) {\n` +
    `  if (outputFormats.includes('all') || outputFormats.includes('txt')) {\n` +
    `    const textPath = path.join(targetDir, baseName + '.txt');\n` +
    `    fs.writeFileSync(textPath, ${JSON.stringify(options.textContent)});\n` +
    `  }\n` +
    `}\n`;

  fs.writeFileSync(scriptPath, script, { mode: 0o755 });
  return scriptPath;
}

test('whisper service reads generated text file when available', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Contenu issu du fichier texte',
    jsonText: 'Contenu issu du JSON',
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.mkdir(rootDir, { recursive: true });
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Contenu issu du fichier texte');
  assert.equal(result.language, 'fr');
  assert.equal(result.model, baseConfig.model);
  assert.equal(result.segments?.length, 1);
});

test('whisper service falls back to JSON text when txt file is missing', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: false,
    textContent: 'Ne sera pas écrit',
    jsonText: 'Fallback depuis le JSON',
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Fallback depuis le JSON');
  assert.equal(result.language, 'fr');
});

test('whisper service handles output files that keep the original extension', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Texte avec extension',
    jsonText: 'JSON avec extension',
    useBaseName: true,
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'prepared.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Texte avec extension');
  assert.equal(result.language, 'fr');
});

test('whisper service locates json files inside nested directories', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Texte imbriqué',
    jsonText: 'JSON imbriqué',
    nested: true,
    nestedSegments: ['profond'],
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'nested-input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Texte imbriqué');
  assert.equal(result.language, 'fr');
});

test('whisper service locates json files inside deeply nested directories', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Texte profondément imbriqué',
    jsonText: 'JSON profondément imbriqué',
    nested: true,
    nestedSegments: ['mirror', 'absolute', 'path', 'with', 'more', 'than', 'five', 'levels'],
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'deeply-nested-input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Texte profondément imbriqué');
  assert.equal(result.language, 'fr');
});
