import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureDirectory } from '../utils/fs.js';
import type {
  Environment,
  Logger,
  WhisperConfig,
  WhisperService,
  WhisperTranscriptionResult,
} from '../types/index.js';

interface CreateWhisperServiceOptions {
  logger: Logger;
}

type ParsedPathInfo = ReturnType<typeof path.parse>;

export function createWhisperService(environment: Environment, { logger }: CreateWhisperServiceOptions): WhisperService {
  return {
    async transcribe({ inputPath, outputDir, config }) {
      ensureDirectory(outputDir);

      const args = buildArgs({
        inputPath,
        outputDir,
        config,
        command: environment.whisperBinary,
      });

      const command = environment.whisperBinary ?? 'python';
      await runProcess(command, args, { cwd: outputDir, logger });

      const parsedPath = path.parse(inputPath);
      const resultFile = await findWhisperJsonFile(outputDir, parsedPath);

      if (!resultFile) {
        throw new Error('Le fichier JSON Whisper est introuvable');
      }

      const raw = await fs.promises.readFile(resultFile, 'utf8');
      const data = JSON.parse(raw) as Partial<WhisperTranscriptionResult> & { segments?: unknown[] };
      let text: string;

      const textFile = findTextFile({
        resultFile,
        outputDir,
        parsedPath,
      });

      if (textFile) {
        try {
          text = await fs.promises.readFile(textFile, 'utf8');
        } catch (error) {
          if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
            throw error;
          }

          text = typeof data.text === 'string' ? data.text : '';
        }
      } else {
        text = typeof data.text === 'string' ? data.text : '';
      }

      const segments = Array.isArray(data.segments) ? (data.segments as WhisperTranscriptionResult['segments']) : [];

      return {
        model: config.model,
        text,
        segments,
        language: data.language ?? null,
      } satisfies WhisperTranscriptionResult;
    },
  };
}

function buildArgs({ inputPath, outputDir, config, command }: {
  inputPath: string;
  outputDir: string;
  config: WhisperConfig;
  command: string | null;
}): string[] {
  const args: string[] = [];

  if (shouldUsePythonModule(command)) {
    args.push('-m', 'whisper');
  }

  args.push(inputPath, '--output_dir', outputDir, '--output_format', 'all');
  if (config.model) {
    args.push('--model', config.model);
  }
  if (config.language) {
    args.push('--language', config.language);
  }
  if (config.computeType && config.computeType !== 'auto') {
    args.push('--compute_type', config.computeType);
  }
  if (config.vad === false) {
    args.push('--no_speech_threshold', '0.6');
  }
  if (config.batchSize && Number.isFinite(config.batchSize) && config.batchSize > 0) {
    args.push('--best_of', String(config.batchSize));
  }
  return args;
}

async function findWhisperJsonFile(outputDir: string, parsedPath: ParsedPathInfo): Promise<string | null> {
  const prefixes = createPrefixes(parsedPath);
  const queue: string[] = [outputDir];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const dir = queue.shift()!;
    const resolvedDir = await fs.promises
      .realpath(dir)
      .catch((error: unknown) => {
        if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
          throw error;
        }

        return null;
      });

    if (!resolvedDir || visited.has(resolvedDir)) {
      continue;
    }

    visited.add(resolvedDir);

    const entries = await fs.promises
      .readdir(resolvedDir, { withFileTypes: true })
      .catch((error: unknown) => {
        if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
          throw error;
        }

        return null;
      });

    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }

      if (isMatchingWhisperJson(entry.name, prefixes)) {
        return path.join(dir, entry.name);
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        queue.push(path.join(resolvedDir, entry.name));
      }
    }
  }

  return null;
}

function createPrefixes(parsedPath: ParsedPathInfo): string[] {
  const values = new Set<string>();
  if (parsedPath.name) {
    values.add(parsedPath.name);
  }
  if (parsedPath.base) {
    values.add(parsedPath.base);
  }
  return Array.from(values);
}

function isMatchingWhisperJson(fileName: string, prefixes: string[]): boolean {
  for (const prefix of prefixes) {
    if (!prefix) {
      continue;
    }

    for (const extension of ['.json', '.jsonl']) {
      const target = `${prefix}${extension}`;

      if (fileName === target) {
        return true;
      }

      if (fileName.startsWith(target)) {
        return true;
      }

      if (fileName.endsWith(target)) {
        return true;
      }
    }
  }

  return false;
}

function findTextFile({ resultFile, outputDir, parsedPath }: { resultFile: string; outputDir: string; parsedPath: ParsedPathInfo }): string | null {
  const resultDir = path.dirname(resultFile);
  const baseFileName = path.basename(resultFile);
  const prefixes = new Set<string>(createPrefixes(parsedPath));
  const parsedResult = path.parse(baseFileName);

  if (parsedResult.name) {
    prefixes.add(parsedResult.name);
  }

  for (const suffix of ['.json', '.jsonl']) {
    if (parsedResult.name.endsWith(suffix)) {
      prefixes.add(parsedResult.name.slice(0, -suffix.length));
    }
  }

  const candidates: string[] = [];
  for (const prefix of prefixes) {
    if (!prefix) {
      continue;
    }

    candidates.push(path.join(resultDir, `${prefix}.txt`));

    if (resultDir !== outputDir) {
      candidates.push(path.join(outputDir, `${prefix}.txt`));
    }
  }

  return findFirstExisting(candidates);
}

function findFirstExisting(paths: string[]): string | null {
  for (const filePath of paths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

function shouldUsePythonModule(command: string | null): boolean {
  if (!command) {
    return true;
  }

  const normalised = path.basename(String(command)).toLowerCase();
  return normalised === 'python' || normalised.startsWith('python');
}

function isErrorWithCode(error: unknown): error is { code?: string } {
  return typeof error === 'object' && error !== null && 'code' in error;
}

async function runProcess(command: string, args: string[], { cwd, logger }: { cwd: string; logger: Logger }): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd });
    let stderr = '';
    child.stderr.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stderr += value;
      logger.debug({ chunk: value }, 'whisper stderr');
    });
    child.on('error', reject);
    child.on('close', (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}
