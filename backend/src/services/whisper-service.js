import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { ensureDirectory } from '../utils/fs.js';

export function createWhisperService(environment, { logger }) {
  return {
    async transcribe({ inputPath, outputDir, config }) {
      ensureDirectory(outputDir);

      const args = buildArgs({
        inputPath,
        outputDir,
        config,
        command: environment.whisperBinary,
      });

      await runProcess(environment.whisperBinary, args, { cwd: outputDir, logger });

      const baseName = path.parse(inputPath).name;
      const resultFile = path.join(outputDir, `${baseName}.json`);
      const textFile = path.join(outputDir, `${baseName}.txt`);

      if (!fs.existsSync(resultFile)) {
        throw new Error('Le fichier JSON Whisper est introuvable');
      }

      const raw = await fs.promises.readFile(resultFile, 'utf8');
      const data = JSON.parse(raw);
      const text = await fs.promises.readFile(textFile, 'utf8');

      return {
        model: config.model,
        text,
        segments: data.segments || [],
        language: data.language || null,
      };
    },
  };
}

function buildArgs({ inputPath, outputDir, config, command }) {
  const args = [];

  if (shouldUsePythonModule(command)) {
    args.push('-m', 'whisper');
  }

  args.push(inputPath, '--output_dir', outputDir, '--output_format', 'json');
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

function shouldUsePythonModule(command) {
  if (!command) {
    return true;
  }

  const normalised = path.basename(String(command)).toLowerCase();
  return normalised === 'python' || normalised.startsWith('python');
}

async function runProcess(command, args, { cwd, logger }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      logger?.debug({ chunk: chunk.toString() }, 'whisper stderr');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper exited with code ${code}: ${stderr}`));
        return;
      }
      resolve();
    });
  });
}
