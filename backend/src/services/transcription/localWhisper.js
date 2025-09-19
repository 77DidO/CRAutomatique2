import { spawn } from 'child_process';
import { access, mkdir, readFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';

async function ensureFileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// Execute a local Whisper-compatible CLI and collect the resulting transcription.
export async function transcribeWithLocalWhisper({
  jobId,
  audioPath,
  options = {},
  logger
}) {
  const activeLogger = logger ?? {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  if (!audioPath) {
    throw new Error('Aucun fichier audio fourni pour la transcription.');
  }

  const binaryPath = options.binaryPath?.trim()
    || process.env.WHISPER_BINARY_PATH?.trim()
    || 'whisper';

  const outputDir = options.outputDir
    || options.outputDirectory
    || path.dirname(audioPath);

  await mkdir(outputDir, { recursive: true });

  // Default arguments request a JSON payload alongside the plain text transcript.
  const args = [
    audioPath,
    '--output_format',
    'json',
    '--output_dir',
    outputDir
  ];

  if (options.model) {
    args.push('--model', options.model);
  }
  if (options.modelPath) {
    args.push('--model_dir', options.modelPath);
  }
  if (options.language && options.language !== 'auto') {
    args.push('--language', options.language);
  }
  if (options.translate === true) {
    args.push('--task', 'translate');
  }
  if (typeof options.temperature === 'number') {
    args.push('--temperature', String(options.temperature));
  }
  if (Array.isArray(options.extraArgs)) {
    args.push(...options.extraArgs.map((value) => String(value)));
  }

  activeLogger.info('Exécution du moteur Whisper local.', { binaryPath, args, outputDir, jobId });

  await new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        if (stdout.trim().length > 0) {
          activeLogger.debug('Whisper local stdout.', { stdout });
        }
        if (stderr.trim().length > 0) {
          activeLogger.debug('Whisper local stderr.', { stderr });
        }
        resolve();
      } else {
        const error = new Error(`Le processus Whisper s'est terminé avec le code ${code}.`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });

  const audioBaseName = path.parse(audioPath).name;
  const jsonPath = path.join(outputDir, `${audioBaseName}.json`);
  const textPath = path.join(outputDir, `${audioBaseName}.txt`);

  let transcriptionText = '';
  let transcriptionSegments = [];
  let rawPayload = null;

  if (await ensureFileExists(jsonPath)) {
    const jsonContent = await readFile(jsonPath, 'utf8');
    try {
      rawPayload = JSON.parse(jsonContent);
      if (Array.isArray(rawPayload?.segments)) {
        transcriptionSegments = rawPayload.segments.map((segment) => ({
          id: segment?.id,
          start: segment?.start,
          end: segment?.end,
          text: typeof segment?.text === 'string' ? segment.text.trim() : ''
        }));
      }
      if (typeof rawPayload?.text === 'string') {
        transcriptionText = rawPayload.text.trim();
      }
    } catch (error) {
      activeLogger.warn('Impossible de parser le JSON de transcription, utilisation du fichier texte.', { error: error?.message });
    }
  }

  if (!transcriptionText && await ensureFileExists(textPath)) {
    transcriptionText = (await readFile(textPath, 'utf8')).trim();
  }

  if (!transcriptionText) {
    throw new Error('Aucune donnée de transcription générée par Whisper.');
  }

  return {
    text: transcriptionText,
    segments: transcriptionSegments,
    model: options.model ?? null,
    raw: rawPayload
  };
}
