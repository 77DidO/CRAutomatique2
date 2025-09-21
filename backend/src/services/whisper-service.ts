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

      const baseName = path.parse(inputPath).name;
      const resultFile = path.join(outputDir, `${baseName}.json`);
      const textFile = path.join(outputDir, `${baseName}.txt`);

      if (!fs.existsSync(resultFile)) {
        throw new Error('Le fichier JSON Whisper est introuvable');
      }

      const raw = await fs.promises.readFile(resultFile, 'utf8');
      const data = JSON.parse(raw) as Partial<WhisperTranscriptionResult> & { segments?: unknown[] };
      let text: string;

      try {
        text = await fs.promises.readFile(textFile, 'utf8');
      } catch (error) {
        if (!isErrorWithCode(error) || error.code !== 'ENOENT') {
          throw error;
        }

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
