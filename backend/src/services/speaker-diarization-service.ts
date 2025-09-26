import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureDirectory } from '../utils/fs.js';
import type {
  DiarizationResult,
  DiarizationSegment,
  DiarizationService,
  Environment,
  Logger,
} from '../types/index.js';

interface CreateSpeakerDiarizationServiceOptions {
  logger: Logger;
  spawn?: typeof spawn;
}

interface RunProcessOptions {
  command: string;
  args: string[];
  cwd?: string;
  logger: Logger;
  timeout?: number;
  spawnFn: typeof spawn;
}

function runProcess({ command, args, cwd, logger, timeout, spawnFn }: RunProcessOptions): Promise<{ stdout: string }>
{
  return new Promise((resolve, reject) => {
    logger.info({ command, args, cwd }, 'Démarrage du processus de diarisation');

    const child = spawnFn(command, args, { cwd });
    let stdout = '';
    let stderr = '';

    const timer = timeout
      ? setTimeout(() => {
          child.kill();
          reject(new Error(`Processus de diarisation arrêté après ${timeout}ms`));
        }, timeout)
      : null;

    child.stdout.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stdout += value;
      logger.debug({ chunk: value }, 'Sortie diarisation');
    });

    child.stderr.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stderr += value;
      logger.warn({ chunk: value }, 'Erreur diarisation');
    });

    child.on('error', (error: Error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code: number | null) => {
      if (timer) clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Processus de diarisation terminé avec le code ${code}:\n${stderr}`));
        return;
      }

      logger.info(
        { stdout: stdout.substring(0, 500), stderr: stderr.substring(0, 500) },
        'Processus de diarisation terminé avec succès',
      );
      resolve({ stdout });
    });
  });
}

function parseSegments(payload: unknown): DiarizationSegment[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const segmentsRaw = (payload as { segments?: unknown }).segments;
  if (!Array.isArray(segmentsRaw)) {
    return [];
  }

  const segments: DiarizationSegment[] = [];

  for (const segment of segmentsRaw) {
    if (!segment || typeof segment !== 'object') {
      continue;
    }

    const { start, end, speaker } = segment as {
      start?: unknown;
      end?: unknown;
      speaker?: unknown;
    };

    const parsedStart = typeof start === 'number' ? start : Number.parseFloat(String(start ?? ''));
    const parsedEnd = typeof end === 'number' ? end : Number.parseFloat(String(end ?? ''));

    if (Number.isNaN(parsedStart) || Number.isNaN(parsedEnd)) {
      continue;
    }

    let parsedSpeaker: string = '';
    if (typeof speaker === 'string') {
      parsedSpeaker = speaker.trim();
    } else if (typeof speaker === 'number') {
      parsedSpeaker = String(speaker);
    } else if (speaker != null) {
      parsedSpeaker = String(speaker);
    }

    if (!parsedSpeaker) {
      parsedSpeaker = 'Speaker';
    }

    segments.push({ start: parsedStart, end: parsedEnd, speaker: parsedSpeaker });
  }

  return segments;
}

function tryParseJson(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch (error) {
    if (content.trim().length > 0) {
      throw error;
    }
    return null;
  }
}

export function createSpeakerDiarizationService(
  environment: Environment,
  { logger, spawn: spawnOverride }: CreateSpeakerDiarizationServiceOptions,
): DiarizationService {
  const rootDirectory =
    typeof environment.rootDir === 'string' && environment.rootDir.length > 0
      ? environment.rootDir
      : process.cwd();
  const tmpDirectory =
    typeof environment.tmpDir === 'string' && environment.tmpDir.length > 0
      ? environment.tmpDir
      : path.join(rootDirectory, 'tmp');

  const pythonExecutable =
    process.env.DIARIZATION_PYTHON_PATH || process.env.WHISPER_PYTHON_PATH || 'python3';
  const scriptPath =
    process.env.DIARIZATION_SCRIPT_PATH ||
    path.join(rootDirectory, 'backend', 'tools', 'speaker-diarization.py');
  const timeout = Number.parseInt(process.env.DIARIZATION_TIMEOUT ?? '', 10);
  const spawnFn = typeof spawnOverride === 'function' ? spawnOverride : spawn;

  return {
    async diarize({ inputPath, outputDir }): Promise<DiarizationResult> {
      if (!inputPath) {
        throw new Error('Chemin audio introuvable pour la diarisation');
      }

      const diarizationDir = outputDir ?? path.join(tmpDirectory, 'diarization');
      ensureDirectory(diarizationDir);
      const outputFile = path.join(diarizationDir, 'segments.json');

      logger.info(
        { inputPath, scriptPath, diarizationDir, outputFile },
        'Diarization service started',
      );

      const args = [scriptPath, '--input', inputPath, '--output', outputFile];
      if (process.env.DIARIZATION_MODEL) {
        args.push('--model', process.env.DIARIZATION_MODEL);
      }

      const { stdout } = await runProcess({
        command: pythonExecutable,
        args,
        cwd: rootDirectory,
        logger,
        timeout: Number.isNaN(timeout) ? undefined : timeout,
        spawnFn,
      });

      let payload: unknown | null = tryParseJson(stdout);

      if ((!payload || typeof payload !== 'object') && fs.existsSync(outputFile)) {
        const fileContent = await fs.promises.readFile(outputFile, 'utf-8');
        payload = tryParseJson(fileContent);
      }

      if (!payload) {
        logger.warn(
          { inputPath, outputFile },
          'Aucune donnée de diarisation renvoyée par le script',
        );
        return { segments: [] };
      }

      const segments = parseSegments(payload);
      return { segments };
    },
  };
}
