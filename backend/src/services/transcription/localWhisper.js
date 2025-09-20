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

export class WhisperBinaryNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WhisperBinaryNotFoundError';
  }
}

const WHISPER_BINARY_GUIDANCE = 'Le binaire Whisper est introuvable. Installez la CLI `whisper` (https://github.com/openai/whisper#setup) '
  + 'ou configurez `transcription.binaryPath` avec le chemin complet vers l’exécutable.';

async function isExecutable(filePath) {
  const accessMode = process.platform === 'win32' ? fsConstants.F_OK : fsConstants.X_OK;
  try {
    await access(filePath, accessMode);
    return true;
  } catch {
    return false;
  }
}

function expandWindowsExtensions(command) {
  if (process.platform !== 'win32') {
    return [command];
  }

  if (path.extname(command)) {
    return [command];
  }

  const pathext = (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
    .split(';')
    .filter((value) => value.trim().length > 0);

  if (pathext.length === 0) {
    return [command];
  }

  return pathext.map((extension) => `${command}${extension}`);
}

function isWindowsCommandNotFoundExitCode(code, platform = process.platform) {
  if (code === null || code === undefined) {
    return false;
  }

  if (platform !== 'win32') {
    return false;
  }

  return Number(code) === 9009;
}

function isWindowsStorePythonPath(candidate, platform = process.platform) {
  if (platform !== 'win32') {
    return false;
  }

  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return false;
  }

  const normalized = candidate.replace(/\\/g, '/').toLowerCase();
  if (!normalized.includes('/microsoft/windowsapps/')) {
    return false;
  }

  const executableName = path.basename(normalized);
  return /^py(\.exe)?$/.test(executableName)
    || /^python(\d+(\.\d+)*)?(\.exe)?$/.test(executableName);
}

function isPythonExecutable(candidate) {
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return false;
  }

  const normalizedCandidate = candidate.trim().toLowerCase();
  const executableName = path.basename(normalizedCandidate);

  return /^python(\d+(\.\d+)*)?(\.exe)?$/.test(executableName)
    || /^py(\.exe)?$/.test(executableName);
}

function buildPythonModuleArgs(command) {
  const executableName = path.basename(String(command ?? '')).toLowerCase();
  if (executableName === 'py' || executableName === 'py.exe') {
    return ['-3', '-m', 'whisper'];
  }
  return ['-m', 'whisper'];
}

async function resolveWhisperBinary(binaryPath) {
  const trimmedPath = typeof binaryPath === 'string' ? binaryPath.trim() : '';

  if (!trimmedPath) {
    const displayedValue = typeof binaryPath === 'string' ? binaryPath : String(binaryPath);
    throw new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${displayedValue}".`);
  }
  const candidates = [];

  if (path.isAbsolute(trimmedPath)) {
    candidates.push(...expandWindowsExtensions(trimmedPath));
  } else {
    const pathEntries = (process.env.PATH || '')
      .split(path.delimiter)
      .filter((value) => value.trim().length > 0);

    const possiblePaths = expandWindowsExtensions(trimmedPath);
    candidates.push(...possiblePaths);
    for (const entry of pathEntries) {
      for (const possiblePath of possiblePaths) {
        candidates.push(path.join(entry, possiblePath));
      }
    }
  }

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      if (isWindowsStorePythonPath(candidate)) {
        continue;
      }
      return candidate;
    }
  }

  throw new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${trimmedPath}".`);
}

async function resolveWhisperCommand(preferredBinaryPath) {
  const treatPreferredAsPython = isPythonExecutable(preferredBinaryPath);

  if (treatPreferredAsPython) {
    try {
      const resolvedPython = await resolveWhisperBinary(preferredBinaryPath);
      return {
        command: resolvedPython,
        prefixArgs: buildPythonModuleArgs(resolvedPython),
        resolvedWithFallback: true
      };
    } catch (error) {
      if (!(error instanceof WhisperBinaryNotFoundError)) {
        throw new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${preferredBinaryPath}".`);
      }
      // Continue with fallback resolution below.
    }
  }

  let resolvedBinaryPath;
  try {
    resolvedBinaryPath = await resolveWhisperBinary(preferredBinaryPath);
    return {
      command: resolvedBinaryPath,
      prefixArgs: [],
      resolvedWithFallback: false
    };
  } catch (error) {
    if (!(error instanceof WhisperBinaryNotFoundError)) {
      throw new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${preferredBinaryPath}".`);
    }

    const pythonCandidates = [];
    if (!treatPreferredAsPython && typeof preferredBinaryPath === 'string' && preferredBinaryPath.trim().length > 0) {
      pythonCandidates.push(preferredBinaryPath.trim());
    }
    pythonCandidates.push('python3', 'python', 'py');

    for (const candidate of pythonCandidates) {
      if (!isPythonExecutable(candidate)) {
        continue;
      }

      try {
        const resolvedPython = await resolveWhisperBinary(candidate);
        return {
          command: resolvedPython,
          prefixArgs: buildPythonModuleArgs(resolvedPython),
          resolvedWithFallback: true
        };
      } catch (innerError) {
        if (!(innerError instanceof WhisperBinaryNotFoundError)) {
          throw new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${candidate}".`);
        }
      }
    }

    throw error;
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

  const normalizedOptionBinaryPath = typeof options.binaryPath === 'string' ? options.binaryPath.trim() : '';
  const normalizedEnvBinaryPath = typeof process.env.WHISPER_BINARY_PATH === 'string'
    ? process.env.WHISPER_BINARY_PATH.trim()
    : '';

  const binaryPath = normalizedOptionBinaryPath
    || normalizedEnvBinaryPath
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

  let resolvedBinaryPath;
  let prefixArgs = [];
  try {
    const resolution = await resolveWhisperCommand(binaryPath);
    resolvedBinaryPath = resolution.command;
    prefixArgs = resolution.prefixArgs;
    if (resolution.resolvedWithFallback) {
      activeLogger.info('Binaire Whisper introuvable, utilisation de python -m whisper.', {
        resolvedBinaryPath
      });
    }
  } catch (error) {
    if (error instanceof WhisperBinaryNotFoundError) {
      throw error;
    }
    throw new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${binaryPath}".`);
  }

  const finalArgs = [...prefixArgs, ...args];

  activeLogger.info('Exécution du moteur Whisper local.', {
    binaryPath: resolvedBinaryPath,
    args: finalArgs,
    outputDir,
    jobId
  });

  await new Promise((resolve, reject) => {
    const child = spawn(resolvedBinaryPath, finalArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (error?.code === 'ENOENT') {
        reject(new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${resolvedBinaryPath}".`));
        return;
      }
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
        if (isWindowsCommandNotFoundExitCode(code)) {
          reject(new WhisperBinaryNotFoundError(`${WHISPER_BINARY_GUIDANCE} Valeur actuelle : "${resolvedBinaryPath}".`));
          return;
        }

        const error = new Error(`Le processus Whisper s'est terminé avec le code ${code}.`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });

  const parsedAudioPath = path.parse(audioPath);
  const candidateBaseNames = [];
  if (parsedAudioPath.name) {
    candidateBaseNames.push(parsedAudioPath.name);
  }
  if (parsedAudioPath.base && !candidateBaseNames.includes(parsedAudioPath.base)) {
    candidateBaseNames.push(parsedAudioPath.base);
  }

  let matchedCandidate = null;

  for (const baseName of candidateBaseNames) {
    const candidate = {
      baseName,
      jsonPath: path.join(outputDir, `${baseName}.json`),
      textPath: path.join(outputDir, `${baseName}.txt`)
    };

    const [jsonExists, textExists] = await Promise.all([
      ensureFileExists(candidate.jsonPath),
      ensureFileExists(candidate.textPath)
    ]);

    if (jsonExists || textExists) {
      matchedCandidate = {
        ...candidate,
        jsonExists,
        textExists
      };
      break;
    }
  }

  if (!matchedCandidate) {
    throw new Error('Aucune donnée de transcription générée par Whisper.');
  }

  activeLogger.debug('Fichiers de transcription détectés.', {
    baseName: matchedCandidate.baseName,
    jsonExists: matchedCandidate.jsonExists,
    textExists: matchedCandidate.textExists
  });

  let transcriptionText = '';
  let transcriptionSegments = [];
  let rawPayload = null;

  if (matchedCandidate?.jsonExists) {
    const jsonContent = await readFile(matchedCandidate.jsonPath, 'utf8');
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

  if (!transcriptionText && matchedCandidate?.textExists) {
    transcriptionText = (await readFile(matchedCandidate.textPath, 'utf8')).trim();
  }

  if (!transcriptionText && transcriptionSegments.length > 0) {
    transcriptionText = transcriptionSegments
      .map((segment) => segment.text)
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(' ')
      .trim();
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

export { resolveWhisperBinary };
export { resolveWhisperCommand };
export { isWindowsCommandNotFoundExitCode };
export { isWindowsStorePythonPath };
export { buildPythonModuleArgs };
