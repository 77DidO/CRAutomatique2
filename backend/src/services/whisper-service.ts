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

type TranscriptFallbackType = 'txt' | 'tsv' | 'vtt';

type ParsedPathInfo = ReturnType<typeof path.parse>;

type AlternativeTranscript = {
  type: Exclude<TranscriptFallbackType, 'txt'>;
  path: string;
  segments: WhisperTranscriptionSegment[];
};

interface RunProcessOptions {
  cwd: string;
  logger: Logger;
  timeout?: number;
}

function isErrorWithCode(error: unknown): error is { code: string } {
  return Boolean(error && typeof error === 'object' && 'code' in error);
}

async function runProcess(command: string, args: string[], { cwd, logger, timeout }: RunProcessOptions): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    logger.info({ command, args, cwd }, 'Démarrage du processus Whisper');

    const child = spawn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    const timer = timeout
      ? setTimeout(() => {
          child.kill();
          reject(new Error(`Processus Whisper arrêté après ${timeout}ms d'exécution`));
        }, timeout)
      : null;

    child.stdout.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stdout += value;
      logger.info({ chunk: value }, 'Sortie Whisper');
    });

    child.stderr.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stderr += value;
      logger.warn({ chunk: value }, 'Erreur Whisper');
    });

    child.on('error', (error: Error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code: number | null) => {
      if (timer) clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Processus Whisper terminé avec le code ${code}:\n${stderr}`));
        return;
      }

      logger.info(
        { stdout: stdout.substring(0, 500), stderr: stderr.substring(0, 500) },
        'Processus Whisper terminé avec succès'
      );
      resolve();
    });
  });
}

async function readDirectoryRecursive(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await readDirectoryRecursive(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function scoreCandidate(filePath: string, parsed: ParsedPathInfo): number {
  const baseName = parsed.name.toLowerCase();
  const baseWithExtension = parsed.base.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  let score = 0;

  if (fileName.includes(baseWithExtension)) {
    score += 4;
  }

  if (fileName.includes(baseName)) {
    score += 3;
  }

  if (fileName.startsWith(baseName)) {
    score += 1;
  }

  if (fileName.startsWith(baseWithExtension)) {
    score += 1;
  }

  // Penalise deeply nested matches to prefer simple layouts
  const depth = filePath.split(path.sep).length;
  score -= depth * 0.01;

  return score;
}

function findBestMatchingFile(files: string[], parsed: ParsedPathInfo, extension: string): string | null {
  const lowerExt = extension.toLowerCase();
  const candidates = files.filter((file) => file.toLowerCase().endsWith(lowerExt));

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    const scoreDiff = scoreCandidate(b, parsed) - scoreCandidate(a, parsed);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return a.length - b.length;
  });

  return candidates[0] ?? null;
}

function parseJsonSegments(data: unknown): WhisperTranscriptionSegment[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const segments: WhisperTranscriptionSegment[] = [];

  for (const segment of data) {
    if (!segment || typeof segment !== 'object') {
      continue;
    }

    const { start, end, text } = segment as { start?: unknown; end?: unknown; text?: unknown };
    const parsedStart = typeof start === 'number' ? start : Number.parseFloat(String(start ?? ''));
    const parsedEnd = typeof end === 'number' ? end : Number.parseFloat(String(end ?? ''));
    const parsedText = typeof text === 'string' ? text.trim() : '';

    if (!Number.isNaN(parsedStart) && !Number.isNaN(parsedEnd) && parsedText.length > 0) {
      segments.push({ start: parsedStart, end: parsedEnd, text: parsedText });
    }
  }

  return segments;
}

function parseTsvSegments(content: string): WhisperTranscriptionSegment[] {
  const lines = content.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }

  const segments: WhisperTranscriptionSegment[] = [];

  for (const line of lines) {
    const [startRaw, endRaw, ...textParts] = line.split('\t');
    if (!startRaw || !endRaw || textParts.length === 0) {
      continue;
    }

    // Skip header rows
    if (startRaw.toLowerCase() === 'start' && endRaw.toLowerCase() === 'end') {
      continue;
    }

    const start = Number.parseFloat(startRaw);
    const end = Number.parseFloat(endRaw);
    const text = textParts.join('\t').trim();

    if (!Number.isNaN(start) && !Number.isNaN(end) && text.length > 0) {
      segments.push({ start, end, text });
    }
  }

  return segments;
}

function parseTimestamp(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})\.(\d{3})$/u);
  if (!match) {
    return null;
  }

  const [, hours, minutes, seconds, milliseconds] = match;
  const totalSeconds = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(milliseconds) / 1000;
  return Number.isFinite(totalSeconds) ? totalSeconds : null;
}

function parseVttSegments(content: string): WhisperTranscriptionSegment[] {
  const sanitized = content.replace(/^\uFEFF/u, '').trim();
  if (sanitized.length === 0) {
    return [];
  }

  const blocks = sanitized
    .split(/\r?\n\r?\n/u)
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && block.toUpperCase() !== 'WEBVTT');

  const segments: WhisperTranscriptionSegment[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/u).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      continue;
    }

    const timingLine = lines[0]?.trim();
    const cueMatch = timingLine.match(/-->+/u);
    if (!cueMatch) {
      continue;
    }

    const [startRaw, endRaw] = timingLine.split(/-->+/u).map((value) => value.trim());
    const start = startRaw ? parseTimestamp(startRaw) : null;
    const end = endRaw ? parseTimestamp(endRaw) : null;
    const text = lines.slice(1).join(' ').trim();

    if (start !== null && end !== null && text.length > 0) {
      segments.push({ start, end, text });
    }
  }

  return segments;
}

function buildTextFromSegments(segments: WhisperTranscriptionSegment[]): string {
  return segments
    .map((segment) => segment.text?.trim() ?? '')
    .filter((text) => text.length > 0)
    .join(' ')
    .trim();
}

async function findAlternativeTranscript(
  files: string[],
  parsed: ParsedPathInfo
): Promise<AlternativeTranscript | null> {
  const tsvFile = findBestMatchingFile(files, parsed, '.tsv');
  if (tsvFile) {
    const raw = await fs.promises.readFile(tsvFile, 'utf8');
    const segments = parseTsvSegments(raw);
    if (segments.length > 0) {
      return { type: 'tsv', path: tsvFile, segments };
    }
  }

  const vttFile = findBestMatchingFile(files, parsed, '.vtt');
  if (vttFile) {
    const raw = await fs.promises.readFile(vttFile, 'utf8');
    const segments = parseVttSegments(raw);
    if (segments.length > 0) {
      return { type: 'vtt', path: vttFile, segments };
    }
  }

  return null;
}

function buildWhisperArgs(inputPath: string, outputDir: string, config: WhisperConfig): string[] {
  const args = [inputPath, '--output_dir', outputDir, '--output_format', 'all'];

  if (config.model) {
    args.push('--model', config.model);
  }

  if (config.language) {
    args.push('--language', config.language);
  }

  if (config.computeType) {
    args.push('--compute_type', config.computeType);
  }

  if (typeof config.batchSize === 'number' && Number.isFinite(config.batchSize) && config.batchSize > 0) {
    args.push('--batch_size', String(config.batchSize));
  }

  return args;
}

async function recoverFromMissingJson({
  files,
  parsed,
  logger,
  inputPath,
  outputDir,
  textFromJson,
}: {
  files: string[];
  parsed: ParsedPathInfo;
  logger: Logger;
  inputPath: string;
  outputDir: string;
  textFromJson: string | null;
}): Promise<{ text: string; segments: WhisperTranscriptionSegment[]; type: TranscriptFallbackType; path?: string }> {
  const textFile = findBestMatchingFile(files, parsed, '.txt');
  let fallbackSourceType: TranscriptFallbackType | null = null;
  let fallbackSourcePath: string | undefined;
  let text: string | null = null;
  let segments: WhisperTranscriptionSegment[] = [];

  if (textFile) {
    try {
      text = await fs.promises.readFile(textFile, 'utf8');
      fallbackSourceType = 'txt';
      fallbackSourcePath = textFile;
    } catch (error) {
      if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (text === null) {
    const alternative = await findAlternativeTranscript(files, parsed);
    if (alternative) {
      fallbackSourceType = alternative.type;
      fallbackSourcePath = alternative.path;
      segments = alternative.segments;
      text = buildTextFromSegments(segments);
    }
  }

  if (text === null || (text.trim().length === 0 && segments.length === 0 && (!textFromJson || textFromJson.trim().length === 0))) {
    throw new Error('Whisper output missing textual data: no JSON, TXT, TSV, or VTT transcripts were produced.');
  }

  if (text === null) {
    text = textFromJson ?? '';
  }

  const warnPayload: Record<string, unknown> = { inputPath, outputDir };
  if (textFile) {
    warnPayload.textFile = textFile;
  }
  if (fallbackSourcePath && fallbackSourcePath !== textFile) {
    warnPayload.fallbackSource = fallbackSourcePath;
  }

  const type = fallbackSourceType ?? 'txt';
  const message =
    type === 'txt'
      ? 'Whisper JSON output missing; falling back to TXT output only'
      : `Whisper JSON output missing; falling back to ${type.toUpperCase()} output`;

  logger.warn(warnPayload, message);

  if (segments.length === 0 && type === 'txt') {
    segments = [];
  }

  return {
    text,
    segments,
    type,
    path: fallbackSourcePath,
  };
}

export function createWhisperService(environment: Environment, { logger }: CreateWhisperServiceOptions): WhisperService {
  const command = environment.whisperBinary ?? process.env.WHISPER_BINARY ?? 'whisper';

  return {
    async transcribe({ inputPath, outputDir, config }): Promise<WhisperTranscriptionResult> {
      ensureDirectory(outputDir);

      const args = buildWhisperArgs(inputPath, outputDir, config);
      const timeout = 30 * 60 * 1000; // 30 minutes
      await runProcess(command, args, { cwd: outputDir, logger, timeout });

      const parsedPath = path.parse(inputPath);
      const files = await readDirectoryRecursive(outputDir);
      const jsonFile = findBestMatchingFile(files, parsedPath, '.json');

      if (!jsonFile) {
        const fallback = await recoverFromMissingJson({
          files,
          parsed: parsedPath,
          logger,
          inputPath,
          outputDir,
          textFromJson: null,
        });

        return {
          model: config.model,
          text: fallback.text,
          segments: fallback.segments,
          language: null,
        } satisfies WhisperTranscriptionResult;
      }

      const raw = await fs.promises.readFile(jsonFile, 'utf8');
      const data = JSON.parse(raw) as Partial<WhisperTranscriptionResult> & { segments?: unknown };

      const jsonText = typeof data.text === 'string' ? data.text : null;
      const language = typeof data.language === 'string' ? data.language : config.language ?? null;
      let segments = parseJsonSegments(data.segments);

      const textFile = findBestMatchingFile(files, parsedPath, '.txt');
      let text: string | null = null;

      if (textFile) {
        try {
          text = await fs.promises.readFile(textFile, 'utf8');
        } catch (error) {
          if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
            throw error;
          }
        }
      }

      if (text === null) {
        text = jsonText ?? '';
      }

      if (text.trim().length === 0 && segments.length === 0) {
        const fallback = await recoverFromMissingJson({
          files,
          parsed: parsedPath,
          logger,
          inputPath,
          outputDir,
          textFromJson: jsonText,
        });

        if (fallback.type !== 'txt') {
          segments = fallback.segments;
        }

        return {
          model: config.model,
          text: fallback.text,
          segments,
          language: fallback.type === 'txt' ? null : language,
        } satisfies WhisperTranscriptionResult;
      }

      return {
        model: config.model,
        text,
        segments,
        language,
      } satisfies WhisperTranscriptionResult;
    },
  };
}
