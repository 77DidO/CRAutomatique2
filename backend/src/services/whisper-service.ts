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
  WhisperTranscriptionSegment,
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
        const textFile = await findTextFile({ resultFile: null, outputDir, parsedPath });
        let fallbackSourceType: 'txt' | 'tsv' | 'vtt' | null = null;
        let fallbackSourcePath: string | null = null;
        let text: string | null = null;
        let segments: WhisperTranscriptionSegment[] = [];

        if (textFile) {
          fallbackSourceType = 'txt';
          fallbackSourcePath = textFile;
          try {
            text = await fs.promises.readFile(textFile, 'utf8');
          } catch (error) {
            if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
              throw error;
            }
          }
        } else {
          const alternative = await findAlternativeTranscript({
            outputDir,
            parsedPath,
          });

          if (alternative) {
            fallbackSourceType = alternative.type;
            fallbackSourcePath = alternative.path;
            const rawAlternative = await fs.promises.readFile(alternative.path, 'utf8');

            if (alternative.type === 'tsv') {
              segments = parseTsvSegments(rawAlternative);
            } else {
              segments = parseVttSegments(rawAlternative);
            }
          }
        }

        if (text === null && segments.length > 0) {
          text = buildTextFromSegments(segments);
        }

        const hasTextContent = typeof text === 'string' && text.trim().length > 0;
        const hasSegmentsContent = segments.some((segment) => segment.text && segment.text.trim().length > 0);

        if (!fallbackSourceType || (!hasTextContent && !hasSegmentsContent)) {
          throw new Error('Whisper output missing textual data: no JSON, TXT, TSV, or VTT transcripts were produced.');
        }

        if (text === null) {
          text = '';
        }

        const warnPayload: Record<string, unknown> = {
          inputPath,
          outputDir,
          textFile,
        };

        if (fallbackSourcePath && fallbackSourcePath !== textFile) {
          warnPayload.fallbackSource = fallbackSourcePath;
        }

        const warningMessage =
          fallbackSourceType === 'txt'
            ? 'Whisper JSON output missing; falling back to TXT output only'
            : `Whisper JSON output missing; falling back to ${fallbackSourceType.toUpperCase()} output`;

        logger.warn(warnPayload, warningMessage);

        return {
          model: config.model,
          text,
          segments,
          language: null,
        } satisfies WhisperTranscriptionResult;
      }

      const raw = await fs.promises.readFile(resultFile, 'utf8');
      const data = JSON.parse(raw) as Partial<WhisperTranscriptionResult> & { segments?: unknown[] };
      let text: string;

      const textFile = await findTextFile({
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
  return findFileRecursively(outputDir, ({ entry, queueDir }) => {
    if (isMatchingWhisperJson(entry.name, prefixes)) {
      return path.join(queueDir, entry.name);
    }

    return null;
  });
}

type DirectorySearchPredicate = (options: {
  entry: { isFile(): boolean; isDirectory(): boolean; name: string };
  queueDir: string;
  resolvedDir: string;
}) => string | null;

async function findFileRecursively(startDir: string, predicate: DirectorySearchPredicate): Promise<string | null> {
  const queue: string[] = [startDir];
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

      const match = predicate({ entry, queueDir: dir, resolvedDir });
      if (match) {
        return match;
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
  return matchesTranscriptName(fileName, prefixes, ['.json', '.jsonl']);
}

function matchesTranscriptName(fileName: string, prefixes: string[], extensions: string[]): boolean {
  const normalisedFileName = normaliseForComparison(fileName);

  for (const prefix of prefixes) {
    if (!prefix) {
      continue;
    }

    const normalisedPrefix = normaliseForComparison(prefix);
    if (!normalisedPrefix) {
      continue;
    }

    for (const extension of extensions) {
      const target = `${prefix}${extension}`;
      const normalisedTarget = normaliseForComparison(target);

      if (!normalisedTarget) {
        continue;
      }

      if (normalisedFileName === normalisedTarget) {
        return true;
      }

      if (normalisedFileName.startsWith(normalisedTarget)) {
        return true;
      }

      if (normalisedFileName.endsWith(normalisedTarget)) {
        return true;
      }

      if (hasExtension(fileName, extension)) {
        const baseName = fileName.slice(0, -extension.length);
        const normalisedBase = normaliseForComparison(baseName);

        if (normalisedBase && normalisedBase === normalisedPrefix) {
          return true;
        }
      }
    }
  }

  return false;
}

async function findTextFile({
  resultFile,
  outputDir,
  parsedPath,
}: {
  resultFile: string | null;
  outputDir: string;
  parsedPath: ParsedPathInfo;
}): Promise<string | null> {
  return findTranscriptFileWithExtensions({ resultFile, outputDir, parsedPath, extensions: ['.txt'] });
}

async function findAlternativeTranscript({
  outputDir,
  parsedPath,
}: {
  outputDir: string;
  parsedPath: ParsedPathInfo;
}): Promise<{ path: string; type: 'tsv' | 'vtt' } | null> {
  const orderedExtensions: Array<{ extension: '.tsv' | '.vtt'; type: 'tsv' | 'vtt' }> = [
    { extension: '.tsv', type: 'tsv' },
    { extension: '.vtt', type: 'vtt' },
  ];

  for (const { extension, type } of orderedExtensions) {
    const candidate = await findTranscriptFileWithExtensions({
      resultFile: null,
      outputDir,
      parsedPath,
      extensions: [extension],
    });

    if (candidate) {
      return { path: candidate, type };
    }
  }

  return null;
}

async function findTranscriptFileWithExtensions({
  resultFile,
  outputDir,
  parsedPath,
  extensions,
}: {
  resultFile: string | null;
  outputDir: string;
  parsedPath: ParsedPathInfo;
  extensions: string[];
}): Promise<string | null> {
  const prefixSet = new Set<string>(createPrefixes(parsedPath));
  const directories = new Set<string>();

  if (resultFile) {
    const resultDir = path.dirname(resultFile);
    const baseFileName = path.basename(resultFile);
    const parsedResult = path.parse(baseFileName);

    directories.add(resultDir);

    if (parsedResult.name) {
      prefixSet.add(parsedResult.name);

      for (const suffix of ['.json', '.jsonl']) {
        if (parsedResult.name.endsWith(suffix)) {
          prefixSet.add(parsedResult.name.slice(0, -suffix.length));
        }
      }
    }
  }

  directories.add(outputDir);

  const prefixValues = Array.from(prefixSet).filter((value) => value);
  const extensionValues = extensions.filter((value) => value);

  if (prefixValues.length === 0 || extensionValues.length === 0) {
    return null;
  }

  if (directories.size > 0) {
    const candidates: string[] = [];
    for (const prefix of prefixValues) {
      if (!prefix) {
        continue;
      }

      for (const directory of directories) {
        for (const extension of extensionValues) {
          candidates.push(path.join(directory, `${prefix}${extension}`));
        }
      }
    }

    const existing = findFirstExisting(candidates);
    if (existing) {
      return existing;
    }

    for (const directory of directories) {
      const entries = await fs.promises
        .readdir(directory, { withFileTypes: true })
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

        if (matchesTranscriptName(entry.name, prefixValues, extensionValues)) {
          return path.join(directory, entry.name);
        }
      }
    }

    if (resultFile) {
      return null;
    }
  }

  return findFileRecursively(outputDir, ({ entry, queueDir }) => {
    if (matchesTranscriptName(entry.name, prefixValues, extensionValues)) {
      return path.join(queueDir, entry.name);
    }

    return null;
  });
}

function parseTsvSegments(raw: string): WhisperTranscriptionSegment[] {
  const lines = raw.split(/\r?\n/u).map((line) => line.trim());
  const segments: WhisperTranscriptionSegment[] = [];

  for (const line of lines) {
    if (!line) {
      continue;
    }

    const parts = line.split('\t');

    if (parts.length < 3) {
      continue;
    }

    if (parts[0]?.toLowerCase() === 'start' && parts[1]?.toLowerCase() === 'end') {
      continue;
    }

    const [startValue, endValue, ...textParts] = parts;
    const text = textParts.join('\t').trim();
    const start = parseNumberTimestamp(startValue);
    const end = parseNumberTimestamp(endValue);

    segments.push({
      start: start ?? undefined,
      end: end ?? undefined,
      text,
    });
  }

  return segments;
}

function parseVttSegments(raw: string): WhisperTranscriptionSegment[] {
  const lines = raw.split(/\r?\n/u);
  const segments: WhisperTranscriptionSegment[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index]!.trim();

    if (!line || /^\d+$/u.test(line) || line.toUpperCase() === 'WEBVTT') {
      index++;
      continue;
    }

    if (!line.includes('-->')) {
      index++;
      continue;
    }

    const [rawStart, rawEndWithSettings] = line.split('-->');
    const rawEnd = rawEndWithSettings?.split(/\s+/u)[0] ?? rawEndWithSettings ?? '';

    const start = parseVttTimestamp(rawStart ?? '');
    const end = parseVttTimestamp(rawEnd ?? '');

    index++;
    const textLines: string[] = [];
    while (index < lines.length) {
      const content = lines[index]!;
      if (!content.trim()) {
        break;
      }
      textLines.push(content.trim());
      index++;
    }

    segments.push({
      start: start ?? undefined,
      end: end ?? undefined,
      text: textLines.join(' ').trim(),
    });

    index++;
  }

  return segments;
}

function buildTextFromSegments(segments: WhisperTranscriptionSegment[]): string {
  return segments
    .map((segment) => segment.text?.trim())
    .filter((value) => value && value.length > 0)
    .join(' ')
    .trim();
}

function parseNumberTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseVttTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split(':');
  if (parts.length < 2) {
    return null;
  }

  const secondsPart = parts.pop();
  if (!secondsPart) {
    return null;
  }

  const seconds = Number.parseFloat(secondsPart.replace(',', '.'));
  if (!Number.isFinite(seconds)) {
    return null;
  }

  const minutesPart = parts.pop();
  const hoursPart = parts.pop();

  const minutes = minutesPart ? Number.parseInt(minutesPart, 10) : 0;
  const hours = hoursPart ? Number.parseInt(hoursPart, 10) : 0;

  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  const safeHours = Number.isFinite(hours) ? hours : 0;

  return safeHours * 3600 + safeMinutes * 60 + seconds;
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

function normaliseForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/giu, '');
}

function hasExtension(fileName: string, extension: string): boolean {
  return fileName.toLowerCase().endsWith(extension.toLowerCase());
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
