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
  jsonFileNameTemplate?: string;
  writeJsonFile?: boolean;
  tsvContent?: string;
  vttContent?: string;
  textFileNameTemplate?: string;
}): string {
  const scriptPath = path.join(rootDir, `mock-whisper-${crypto.randomUUID()}.mjs`);
  const nestedSegments = options.nestedSegments ?? [];
  const nestedSegmentsParam =
    nestedSegments.length > 0 ? `, ${nestedSegments.map((segment) => JSON.stringify(segment)).join(', ')}` : '';
  const targetDirExpression = options.nested ? `path.join(outputDir, baseName${nestedSegmentsParam})` : 'outputDir';
  const jsonFileNameExpression = options.jsonFileNameTemplate
    ? options.jsonFileNameTemplate
        .split('%BASE%')
        .map((part) => `'${part.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
        .join(' + baseName + ')
    : "baseName + '.json'";
  const textFileNameExpression = options.textFileNameTemplate
    ? options.textFileNameTemplate
        .split('%BASE%')
        .map((part) => `'${part.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
        .join(' + baseName + ')
    : "baseName + '.txt'";
  const script = `#!/usr/bin/env node\n` +
    `import fs from 'node:fs';\n` +
    `import path from 'node:path';\n` +
    `const args = process.argv.slice(2);\n` +
    `const inputPath = args[0];\n` +
    `let outputDir = process.cwd();\n` +
    `let outputFormat = 'all';\n` +
    `for (let i = 0; i < args.length; i++) {\n` +
    `  if (args[i] === '--output_dir' && i + 1 < args.length) {\n` +
    `    outputDir = args[i + 1];\n` +
    `    i++;\n` +
    `    continue;\n` +
    `  }\n` +
    `  if (args[i] === '--output_format' && i + 1 < args.length) {\n` +
    `    outputFormat = args[i + 1].trim();\n` +
    `    i++;\n` +
    `    continue;\n` +
    `  }\n` +
    `}\n` +
    `const shouldWriteTsv = ${options.tsvContent ? 'true' : 'false'};\n` +
    `const shouldWriteVtt = ${options.vttContent ? 'true' : 'false'};\n` +
    `const parsed = path.parse(inputPath);\n` +
    `const baseName = ${options.useBaseName ? 'parsed.base' : 'parsed.name'};\n` +
    `const targetDir = ${targetDirExpression};\n` +
    `const jsonFileName = ${jsonFileNameExpression};\n` +
    `const textFileName = ${textFileNameExpression};\n` +
    `fs.mkdirSync(targetDir, { recursive: true });\n` +
    `const shouldWriteJson = ${options.writeJsonFile === false ? 'false' : 'true'};\n` +
    `if (shouldWriteJson) {\n` +
    `  const jsonPath = path.join(targetDir, jsonFileName);\n` +
    `  fs.writeFileSync(jsonPath, JSON.stringify({ text: ${JSON.stringify(options.jsonText)}, language: 'fr', segments: [{ start: 0, end: 1, text: 'Bonjour' }] }));\n` +
    `}\n` +
    `if (${options.writeTextFile ? 'true' : 'false'}) {\n` +
    `  if (outputFormat === 'all' || outputFormat === 'txt') {\n` +
    `    const textPath = path.join(targetDir, textFileName);\n` +
    `    fs.writeFileSync(textPath, ${JSON.stringify(options.textContent)});\n` +
    `  }\n` +
    `}\n` +
    `if (shouldWriteTsv && (outputFormat === 'all' || outputFormat === 'tsv')) {\n` +
    `  const tsvPath = path.join(targetDir, baseName + '.tsv');\n` +
    `  fs.writeFileSync(tsvPath, ${JSON.stringify(options.tsvContent ?? '')});\n` +
    `}\n` +
    `if (shouldWriteVtt && (outputFormat === 'all' || outputFormat === 'vtt')) {\n` +
    `  const vttPath = path.join(targetDir, baseName + '.vtt');\n` +
    `  fs.writeFileSync(vttPath, ${JSON.stringify(options.vttContent ?? '')});\n` +
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

test('whisper service falls back to txt output when json is missing', async () => {
  const rootDir = createTempDir();
  const warnings: Array<{ payload: unknown; message?: string }> = [];
  const capturingLogger: Logger = {
    info() {},
    error() {},
    debug() {},
    warn(payload, message) {
      warnings.push({ payload, message });
    },
  };

  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Transcription uniquement texte',
    jsonText: 'Ne sera pas écrit',
    writeJsonFile: false,
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger: capturingLogger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Transcription uniquement texte');
  assert.equal(result.language, null);
  assert.deepEqual(result.segments, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.message, 'Whisper JSON output missing; falling back to TXT output only');
});

test('whisper service locates txt output inside prepared directory when json is missing', async () => {
  const rootDir = createTempDir();
  const warnings: Array<{ payload: unknown; message?: string }> = [];
  const capturingLogger: Logger = {
    info() {},
    error() {},
    debug() {},
    warn(payload, message) {
      warnings.push({ payload, message });
    },
  };

  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Transcription dans prepared',
    jsonText: 'Ne sera pas écrit',
    writeJsonFile: false,
    nested: true,
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger: capturingLogger });

  const inputPath = path.join(rootDir, 'prepared.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Transcription dans prepared');
  assert.equal(result.language, null);
  assert.deepEqual(result.segments, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.message, 'Whisper JSON output missing; falling back to TXT output only');

  const payload = warnings[0]?.payload as { textFile?: string } | undefined;
  assert.equal(payload?.textFile, path.join(outputDir, 'prepared', 'prepared.txt'));
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

test('whisper service récupère les txt préfixés façon Windows lorsque le JSON est absent', async () => {
  const rootDir = createTempDir();
  const warnings: Array<{ payload: unknown; message?: string }> = [];
  const capturingLogger: Logger = {
    info() {},
    error() {},
    debug() {},
    warn(payload, message) {
      warnings.push({ payload, message });
    },
  };

  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: true,
    textContent: 'Texte Windows',
    jsonText: 'Ne sera pas écrit',
    writeJsonFile: false,
    useBaseName: true,
    textFileNameTemplate: 'C__Users__Utilisateur__%BASE%.txt',
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger: capturingLogger });

  const inputPath = path.join(rootDir, 'prepared.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Texte Windows');
  assert.equal(result.language, null);
  assert.deepEqual(result.segments, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.message, 'Whisper JSON output missing; falling back to TXT output only');

  const payload = warnings[0]?.payload as { textFile?: string } | undefined;
  assert.equal(payload?.textFile, path.join(outputDir, 'C__Users__Utilisateur__prepared.wav.txt'));
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

test('whisper service detects json files prefixed with absolute path markers', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: false,
    textContent: 'Ne sera pas écrit',
    jsonText: 'JSON avec préfixe absolu',
    jsonFileNameTemplate: 'C__Users__absolute__%BASE%.json',
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'absolute-detected.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'JSON avec préfixe absolu');
  assert.equal(result.language, 'fr');
});

test('whisper service détecte les json suffixés avec _wav', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: false,
    textContent: 'Ne sera pas écrit',
    jsonText: 'JSON suffixé _wav',
    jsonFileNameTemplate: '%BASE%_wav.json',
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'wav-suffix.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'JSON suffixé _wav');
  assert.equal(result.language, 'fr');
});

test('whisper service détecte les json contenant espaces et tirets', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: false,
    textContent: 'Ne sera pas écrit',
    jsonText: 'JSON avec espaces et tirets',
    jsonFileNameTemplate: 'Résultat final - %BASE% .json',
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'espace-tiret.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'JSON avec espaces et tirets');
  assert.equal(result.language, 'fr');
});

test('whisper service falls back to TSV output when txt and json are missing', async () => {
  const rootDir = createTempDir();
  const warnings: Array<{ payload: unknown; message?: string }> = [];
  const capturingLogger: Logger = {
    info() {},
    error() {},
    debug() {},
    warn(payload, message) {
      warnings.push({ payload, message });
    },
  };

  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: false,
    textContent: 'Ne sera pas écrit',
    jsonText: 'Ne sera pas écrit',
    writeJsonFile: false,
    tsvContent: ['start\tend\ttext', '0\t1.5\tBonjour', '1.5\t3.2\tBonsoir'].join('\n'),
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger: capturingLogger });

  const inputPath = path.join(rootDir, 'only-tsv.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');
  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Bonjour Bonsoir');
  assert.equal(result.language, null);
  assert.deepEqual(result.segments, [
    { start: 0, end: 1.5, text: 'Bonjour' },
    { start: 1.5, end: 3.2, text: 'Bonsoir' },
  ]);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.message, 'Whisper JSON output missing; falling back to TSV output');
});

test('whisper service throws when no textual output can be recovered', async () => {
  const rootDir = createTempDir();
  const binary = createMockWhisperBinary(rootDir, {
    writeTextFile: false,
    textContent: 'Ne sera pas écrit',
    jsonText: 'Ne sera pas écrit',
    writeJsonFile: false,
  });

  const environment = createEnvironment(rootDir, binary);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'no-output.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const outputDir = path.join(rootDir, 'outputs');

  await assert.rejects(
    () => service.transcribe({ inputPath, outputDir, config: baseConfig }),
    /Whisper output missing textual data: no JSON, TXT, TSV, or VTT transcripts were produced\./u,
  );
});

test('python-based transcription script includes WhisperProcessor import', async () => {
  const rootDir = createTempDir();
  const outputDir = path.join(rootDir, 'outputs');
  const pythonMockPath = path.join(rootDir, 'mock-python-interpreter.mjs');

  const mockPythonScript = `#!/usr/bin/env node\n`
    + `import fs from 'node:fs';\n`
    + `import path from 'node:path';\n`
    + `const [scriptPath] = process.argv.slice(2);\n`
    + `if (!scriptPath) {\n`
    + `  console.error('Missing script path');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const content = fs.readFileSync(scriptPath, 'utf8');\n`
    + `if (!content.includes('from transformers import WhisperProcessor as _WhisperProcessor')) {\n`
    + `  console.error('WhisperProcessor import is missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('AutoProcessor.from_pretrained')) {\n`
    + `  console.error('AutoProcessor fallback is missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('def run_transformers_transcription():')) {\n`
    + `  console.error('Transformers fallback function is missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('Initializing Transformers speech recognition pipeline...')) {\n`
    + `  console.error('Missing Transformers initialization log');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('AutoModelForSpeechSeq2Seq.from_pretrained')) {\n`
    + `  console.error('Missing AutoModelForSpeechSeq2Seq usage');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('WhisperProcessor unavailable; falling back to AutoProcessor')) {\n`
    + `  console.error('Missing WhisperProcessor fallback log');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('Failed to initialize WhisperProcessor (')) {\n`
    + `  console.error('Missing WhisperProcessor failure diagnostic');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const directory = path.dirname(scriptPath);\n`
    + `const transcriptPath = path.join(directory, 'transcript.json');\n`
    + `const result = {\n`
    + `  text: 'Texte transcrit',\n`
    + `  language: 'fr',\n`
    + `  segments: [{ start: 0, end: 1.5, text: 'Bonjour tout le monde' }],\n`
    + `};\n`
    + `fs.writeFileSync(transcriptPath, JSON.stringify(result));\n`
    + `console.log(JSON.stringify(result));\n`
    + `process.exit(0);\n`;

  fs.writeFileSync(pythonMockPath, mockPythonScript, { mode: 0o755 });

  const environment = createEnvironment(rootDir, pythonMockPath);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const result = await service.transcribe({ inputPath, outputDir, config: { ...baseConfig, model: 'medium' } });

  assert.equal(result.text, 'Texte transcrit');
  assert.equal(result.language, 'fr');
  assert.equal(result.model, 'medium');
  assert.deepEqual(result.segments, [{ start: 0, end: 1.5, text: 'Bonjour tout le monde' }]);
});

test('python-based transcription retries without WhisperProcessor when NameError occurs', async () => {
  const rootDir = createTempDir();
  const outputDir = path.join(rootDir, 'outputs');
  const pythonMockPath = path.join(rootDir, 'mock-python-nameerror-interpreter.mjs');

  const failingThenPassingScript = `#!/usr/bin/env node\n`
    + `import fs from 'node:fs';\n`
    + `import path from 'node:path';\n`
    + `const [scriptPath] = process.argv.slice(2);\n`
    + `if (!scriptPath) {\n`
    + `  console.error('Missing script path');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const directory = path.dirname(scriptPath);\n`
    + `const markerPath = path.join(directory, 'invocations.txt');\n`
    + `let count = 0;\n`
    + `if (fs.existsSync(markerPath)) {\n`
    + `  const raw = fs.readFileSync(markerPath, 'utf8');\n`
    + `  const parsed = Number.parseInt(raw, 10);\n`
    + `  if (!Number.isNaN(parsed)) {\n`
    + `    count = parsed;\n`
    + `  }\n`
    + `}\n`
    + `count += 1;\n`
    + `fs.writeFileSync(markerPath, String(count));\n`
    + `if (count === 1) {\n`
    + `  console.error("Erreur lors de la transcription : name 'WhisperProcessor' is not defined");\n`
    + `  console.error('Traceback (most recent call last):');\n`
    + `  console.error('  File "_transcribe.py", line 46, in <module>');\n`
    + `  console.error("    processor = WhisperProcessor.from_pretrained(MODEL_ID)");\n`
    + `  console.error("NameError: name 'WhisperProcessor' is not defined");\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const content = fs.readFileSync(scriptPath, 'utf8');\n`
    + `if (!content.includes('def run_transformers_transcription():')) {\n`
    + `  console.error('Transformers fallback script was not generated');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const transcriptPath = path.join(directory, 'transcript.json');\n`
    + `const result = { text: 'Transcription reussie', language: 'fr', segments: [] };\n`
    + `fs.writeFileSync(transcriptPath, JSON.stringify(result));\n`
    + `console.log(JSON.stringify(result));\n`
    + `process.exit(0);\n`;

  fs.writeFileSync(pythonMockPath, failingThenPassingScript, { mode: 0o755 });

  const environment = createEnvironment(rootDir, pythonMockPath);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Transcription reussie');
  assert.equal(result.language, 'fr');
  assert.equal(result.model, baseConfig.model);
  assert.deepEqual(result.segments, []);

  const invocationMarker = path.join(outputDir, 'invocations.txt');
  const rawCount = await fs.promises.readFile(invocationMarker, 'utf8');
  assert.equal(Number.parseInt(rawCount, 10), 2);
});

test('python-based transcription configures OpenVINO cache and performance hints', async () => {
  const rootDir = createTempDir();
  const outputDir = path.join(rootDir, 'outputs');
  const pythonMockPath = path.join(rootDir, 'mock-python-openvino-config.mjs');

  const script = `#!/usr/bin/env node\n`
    + `import fs from 'node:fs';\n`
    + `import path from 'node:path';\n`
    + `const [scriptPath] = process.argv.slice(2);\n`
    + `if (!scriptPath) {\n`
    + `  console.error('Missing script path');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const content = fs.readFileSync(scriptPath, 'utf8');\n`
    + `if (!content.includes('cache_dir_env = os.environ.get("WHISPER_OPENVINO_CACHE_DIR")')) {\n`
    + `  console.error('OpenVINO cache directory configuration missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('ov_config = {"CACHE_DIR": str(cache_dir)}')) {\n`
    + `  console.error('OpenVINO cache configuration missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('log(f"Using OpenVINO device: {device_override} (cache: {cache_dir})")')) {\n`
    + `  console.error('OpenVINO device logging missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const transcriptPath = path.join(path.dirname(scriptPath), 'transcript.json');\n`
    + `const result = { text: 'Config ok', language: 'fr', segments: [] };\n`
    + `fs.writeFileSync(transcriptPath, JSON.stringify(result));\n`
    + `console.log(JSON.stringify(result));\n`
    + `process.exit(0);\n`;

  fs.writeFileSync(pythonMockPath, script, { mode: 0o755 });

  const environment = createEnvironment(rootDir, pythonMockPath);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Config ok');
  assert.equal(result.language, 'fr');
  assert.equal(result.model, baseConfig.model);
  assert.deepEqual(result.segments, []);

  const generatedScript = await fs.promises.readFile(path.join(outputDir, '_transcribe.py'), 'utf8');
  assert.ok(generatedScript.includes('cache_dir_env = os.environ.get("WHISPER_OPENVINO_CACHE_DIR")'));
  assert.ok(generatedScript.includes('ov_config = {"CACHE_DIR": str(cache_dir)}'));
  assert.ok(generatedScript.includes('log(f"Using OpenVINO device: {device_override} (cache: {cache_dir})")'));
});

test('python-based transcription skips OpenVINO when WhisperProcessor probe fails', async () => {
  const rootDir = createTempDir();
  const outputDir = path.join(rootDir, 'outputs');
  const pythonMockPath = path.join(rootDir, 'mock-python-probe');

  const probeAwareScript = `#!/usr/bin/env node\n`
    + `import fs from 'node:fs';\n`
    + `import path from 'node:path';\n`
    + `const args = process.argv.slice(2);\n`
    + `const markerPath = path.join(process.cwd(), 'probe-count.txt');\n`
    + `if (args.length > 0 && args[0] === '-c') {\n`
    + `  let count = 0;\n`
    + `  if (fs.existsSync(markerPath)) {\n`
    + `    const raw = fs.readFileSync(markerPath, 'utf8');\n`
    + `    const parsed = Number.parseInt(raw, 10);\n`
    + `    if (!Number.isNaN(parsed)) {\n`
    + `      count = parsed;\n`
    + `    }\n`
    + `  }\n`
    + `  fs.writeFileSync(markerPath, String(count + 1));\n`
    + `  console.error('Mock WhisperProcessor import failure');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (args.length === 0) {\n`
    + `  console.error('Missing script path');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const [scriptPath] = args;\n`
    + `const content = fs.readFileSync(scriptPath, 'utf8');\n`
    + `if (content.includes('def run_openvino_transcription():')) {\n`
    + `  console.error('OpenVINO block should not be generated when probe fails');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `if (!content.includes('def run_transformers_transcription():')) {\n`
    + `  console.error('Transformers transcription block is missing');\n`
    + `  process.exit(1);\n`
    + `}\n`
    + `const transcriptPath = path.join(path.dirname(scriptPath), 'transcript.json');\n`
    + `const result = { text: 'Transcription directe', language: 'fr', segments: [] };\n`
    + `fs.writeFileSync(transcriptPath, JSON.stringify(result));\n`
    + `console.log(JSON.stringify(result));\n`
    + `process.exit(0);\n`;

  fs.writeFileSync(pythonMockPath, probeAwareScript, { mode: 0o755 });

  const environment = createEnvironment(rootDir, pythonMockPath);
  const service = createWhisperService(environment, { logger });

  const inputPath = path.join(rootDir, 'input.wav');
  await fs.promises.writeFile(inputPath, 'audio');

  const result = await service.transcribe({ inputPath, outputDir, config: baseConfig });

  assert.equal(result.text, 'Transcription directe');
  assert.equal(result.language, 'fr');
  assert.equal(result.model, baseConfig.model);
  assert.deepEqual(result.segments, []);

  const scriptPath = path.join(outputDir, '_transcribe.py');
  const generatedScript = await fs.promises.readFile(scriptPath, 'utf8');
  assert.ok(generatedScript.includes('def run_transformers_transcription():'));
  assert.ok(!generatedScript.includes('def run_openvino_transcription():'));

  const markerPath = path.join(outputDir, 'probe-count.txt');
  const probeCountRaw = await fs.promises.readFile(markerPath, 'utf8');
  assert.equal(Number.parseInt(probeCountRaw, 10), 1);
});
