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

type PythonTranscribeScriptMode = 'openvino' | 'transformers';

interface BuildPythonTranscribeScriptOptions {
  inputPath: string;
  outputDir: string;
  config: WhisperConfig;
  mode?: PythonTranscribeScriptMode;
}

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

function isLikelyPythonCommand(command: string): boolean {
  const base = path.basename(command).toLowerCase();
  return (
    base === 'python' ||
    base === 'python3' ||
    base === 'python.exe' ||
    base === 'pythonw.exe' ||
    base === 'py' ||
    base === 'py.exe' ||
    /^python\d+(\.\d+)*$/u.test(base) ||
    /^python\d+(\.\d+)*\.exe$/u.test(base) ||
    /^py\d+(\.\d+)*$/u.test(base) ||
    /^py\d+(\.\d+)*\.exe$/u.test(base) ||
    base.startsWith('python-') ||
    base.endsWith('-python') ||
    base.includes('python')
  );
}

function shouldProbeWhisperProcessor(command: string): boolean {
  const base = path.basename(command).toLowerCase();

  if (
    base.endsWith('.js') ||
    base.endsWith('.mjs') ||
    base.endsWith('.cjs') ||
    base.endsWith('.ts') ||
    base.endsWith('.tsx')
  ) {
    return false;
  }

  return isLikelyPythonCommand(command);
}

const whisperProcessorProbeCache = new Map<string, Promise<boolean>>();

async function probeWhisperProcessorAvailability(
  command: string,
  cwd: string,
  logger: Logger
): Promise<boolean> {
  const cacheKey = `${command}@@${cwd}`;
  const cached = whisperProcessorProbeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const probePromise = new Promise<boolean>((resolve) => {
    const child = spawn(command, ['-c', 'from transformers import WhisperProcessor'], { cwd });
    let stderr = '';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        child.kill();
        logger.warn({ command }, 'WhisperProcessor import probe timed out; assuming unavailable');
        resolved = true;
        resolve(false);
      }
    }, 10_000);

    child.stderr.on('data', (chunk: unknown) => {
      const value = typeof chunk === 'string' ? chunk : String(chunk);
      stderr += value;
    });

    child.on('error', (error: Error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);
      logger.warn({ command, error: error.message }, 'Unable to probe WhisperProcessor availability');
      resolve(false);
    });

    child.on('close', (code: number | null) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timer);

      if (code === 0) {
        logger.info({ command }, 'WhisperProcessor import available; attempting OpenVINO mode first');
        resolve(true);
        return;
      }

      const payload: Record<string, unknown> = { command, code };
      if (stderr.trim().length > 0) {
        payload.stderr = stderr.substring(0, 500);
      }

      logger.warn(
        payload,
        'WhisperProcessor import unavailable; defaulting to Transformers transcription mode'
      );
      resolve(false);
    });
  }).finally(() => {
    const existing = whisperProcessorProbeCache.get(cacheKey);
    if (existing && existing !== probePromise) {
      return;
    }
  });

  whisperProcessorProbeCache.set(cacheKey, probePromise);

  try {
    const result = await probePromise;
    whisperProcessorProbeCache.set(cacheKey, Promise.resolve(result));
    return result;
  } catch (error) {
    whisperProcessorProbeCache.set(cacheKey, Promise.resolve(false));
    if (error instanceof Error) {
      logger.warn({ command, error: error.message }, 'Unexpected error during WhisperProcessor probe');
    }
    return false;
  }
}

function shouldRetryWithoutWhisperProcessor(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (typeof message !== 'string' || message.length === 0) {
    return false;
  }

  return message.includes("WhisperProcessor") && message.includes('not defined');
}

function buildPythonTranscribeScript({
  inputPath,
  outputDir,
  config,
  mode = 'openvino',
}: BuildPythonTranscribeScriptOptions): string {
  const requestedModel = typeof config.model === 'string' && config.model.trim().length > 0 ? config.model.trim() : null;
  const lowerModel = requestedModel?.toLowerCase() ?? null;
  const resolvedModel = lowerModel
    ? {
        tiny: 'openai/whisper-tiny',
        'tiny.en': 'openai/whisper-tiny.en',
        base: 'openai/whisper-base',
        'base.en': 'openai/whisper-base.en',
        small: 'openai/whisper-small',
        'small.en': 'openai/whisper-small.en',
        medium: 'openai/whisper-medium',
        'medium.en': 'openai/whisper-medium.en',
        large: 'openai/whisper-large-v2',
        'large-v1': 'openai/whisper-large-v1',
        'large-v2': 'openai/whisper-large-v2',
        'large-v3': 'openai/whisper-large-v3',
      }[lowerModel] ?? requestedModel
    : 'openai/whisper-base';

  const model = resolvedModel;
  const language = config.language ?? 'fr';
  const chunkDuration = typeof config.chunkDuration === 'number' && Number.isFinite(config.chunkDuration) && config.chunkDuration > 0
    ? config.chunkDuration
    : 30;
  const batchSize = typeof config.batchSize === 'number' && Number.isFinite(config.batchSize) && config.batchSize > 0
    ? config.batchSize
    : 1;

  const pythonInputPath = JSON.stringify(inputPath);
  const pythonOutputDir = JSON.stringify(outputDir);
  const pythonModel = JSON.stringify(model);
  const pythonLanguage = JSON.stringify(language);
  const useOpenvino = mode === 'openvino';

  const openvinoTranscriptionBlock = `def run_openvino_transcription():
    try:
        from transformers import WhisperProcessor as _WhisperProcessor
    except ImportError:  # pragma: no cover - handled at runtime
        _WhisperProcessor = None  # type: ignore[assignment]
    from transformers import AutoProcessor
    from transformers import pipeline
    from optimum.intel.openvino import OVModelForSpeechSeq2Seq

    log("Initializing OpenVINO optimized model...")
    log(f"Loading model: {MODEL_ID}")

    whisper_processor_cls = _WhisperProcessor
    processor = None

    if whisper_processor_cls is None:
        log("WhisperProcessor unavailable; falling back to AutoProcessor")
    else:
        try:
            processor = whisper_processor_cls.from_pretrained(MODEL_ID)
        except Exception as processor_error:  # pragma: no cover - handled at runtime
            log(f"Failed to initialize WhisperProcessor ({processor_error}); falling back to AutoProcessor")
            processor = None

    if processor is None:
        processor = AutoProcessor.from_pretrained(MODEL_ID)

    feature_extractor = getattr(processor, "feature_extractor", None)
    tokenizer = getattr(processor, "tokenizer", None)

    if feature_extractor is None or tokenizer is None:
        raise RuntimeError(
            "Processor is missing feature_extractor or tokenizer attributes required for transcription."
        )

    cache_dir_env = os.environ.get("WHISPER_OPENVINO_CACHE_DIR")
    if cache_dir_env:
        cache_dir = Path(cache_dir_env).expanduser()
    else:
        cache_dir = OUTPUT_DIR / "openvino-cache"

    cache_dir.mkdir(parents=True, exist_ok=True)

    ov_config = {"CACHE_DIR": str(cache_dir)}
    performance_hint = os.environ.get("WHISPER_OPENVINO_PERFORMANCE_HINT")
    if performance_hint:
        ov_config["PERFORMANCE_HINT"] = performance_hint
    else:
        ov_config["PERFORMANCE_HINT"] = "LATENCY"

    num_streams = os.environ.get("WHISPER_OPENVINO_NUM_STREAMS")
    if num_streams and num_streams.strip():
        ov_config["NUM_STREAMS"] = num_streams.strip()

    device_override = (os.environ.get("WHISPER_OPENVINO_DEVICE") or "CPU").strip() or "CPU"
    log(f"Using OpenVINO device: {device_override} (cache: {cache_dir})")

    model = OVModelForSpeechSeq2Seq.from_pretrained(
        MODEL_ID,
        device=device_override,
        ov_config=ov_config,
    )

    asr = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=tokenizer,
        feature_extractor=feature_extractor,
        chunk_length_s=CHUNK_LENGTH,
        batch_size=BATCH_SIZE,
        device=device_override.lower(),
    )

    result = asr(
        str(INPUT_PATH),
        return_timestamps=True,
        generate_kwargs={"language": LANGUAGE, "task": "transcribe"},
    )

    return normalize_result(result)
`;

  const transformersTranscriptionBlock = `def run_transformers_transcription():
    from transformers import AutoModelForSpeechSeq2Seq
    from transformers import AutoProcessor
    from transformers import pipeline

    log("Initializing Transformers speech recognition pipeline...")
    log(f"Loading model: {MODEL_ID}")

    processor = AutoProcessor.from_pretrained(MODEL_ID)

    feature_extractor = getattr(processor, "feature_extractor", None)
    tokenizer = getattr(processor, "tokenizer", None)

    if feature_extractor is None or tokenizer is None:
        raise RuntimeError(
            "Processor is missing feature_extractor or tokenizer attributes required for transcription."
        )

    model = AutoModelForSpeechSeq2Seq.from_pretrained(MODEL_ID)

    asr = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=tokenizer,
        feature_extractor=feature_extractor,
        chunk_length_s=CHUNK_LENGTH,
        batch_size=BATCH_SIZE,
    )

    result = asr(
        str(INPUT_PATH),
        return_timestamps=True,
        generate_kwargs={"language": LANGUAGE, "task": "transcribe"},
    )

    return normalize_result(result)
`;

  const openvinoExecutionBlock = useOpenvino
    ? `        try:
            result = run_openvino_transcription()
        except Exception as openvino_error:  # pragma: no cover - handled at runtime
            log(f"OpenVINO transcription failed: {openvino_error}")
            try:
                result = run_transformers_transcription()
            except Exception as transformers_error:  # pragma: no cover - handled at runtime
                log(f"Transformers transcription failed: {transformers_error}")
                result = run_fallback_transcription()
`
    : `        try:
            result = run_transformers_transcription()
        except Exception as transformers_error:  # pragma: no cover - handled at runtime
            log(f"Transformers transcription failed: {transformers_error}")
            result = run_fallback_transcription()
`;

  const openvinoFunctionBlock = useOpenvino ? `${openvinoTranscriptionBlock}

` : '';

  return `import json
import os
import sys
import traceback
from pathlib import Path

OUTPUT_DIR = Path(${pythonOutputDir})
INPUT_PATH = Path(${pythonInputPath})
MODEL_ID = ${pythonModel}
LANGUAGE = ${pythonLanguage}
CHUNK_LENGTH = float(${chunkDuration})
BATCH_SIZE = int(${batchSize})


def log(message: str) -> None:
    print(message, flush=True)


def ensure_output_dir(directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)


def normalize_timestamp(value):
    if isinstance(value, (tuple, list)) and len(value) == 2:
        start, end = value
        if start is None or end is None:
            return None
        try:
            return float(start), float(end)
        except (TypeError, ValueError):
            return None
    return None


def normalize_result(result):
    text = (result.get("text") or "").strip() if isinstance(result, dict) else ""
    language_code = (result.get("language") or LANGUAGE) if isinstance(result, dict) else LANGUAGE
    chunks = result.get("chunks") if isinstance(result, dict) else None

    segments = []
    if isinstance(chunks, list):
        for chunk in chunks:
            if not isinstance(chunk, dict):
                continue
            timestamp = normalize_timestamp(chunk.get("timestamp"))
            segment_text = (chunk.get("text") or "").strip()
            if not timestamp or not segment_text:
                continue
            start, end = timestamp
            segments.append({
                "start": float(start),
                "end": float(end),
                "text": segment_text,
            })

    return {
        "text": text,
        "language": language_code,
        "segments": segments,
    }


${openvinoFunctionBlock}${transformersTranscriptionBlock}


def run_fallback_transcription():
    import whisper

    log(f"Loading fallback Whisper model: {MODEL_ID}")
    model = whisper.load_model(MODEL_ID)
    result = model.transcribe(str(INPUT_PATH), language=LANGUAGE, verbose=False)

    text = (result.get("text") or "").strip() if isinstance(result, dict) else ""
    language_code = (result.get("language") or LANGUAGE) if isinstance(result, dict) else LANGUAGE
    segments = []

    if isinstance(result, dict):
        raw_segments = result.get("segments")
        if isinstance(raw_segments, list):
            for segment in raw_segments:
                if not isinstance(segment, dict):
                    continue
                segment_text = (segment.get("text") or "").strip()
                if not segment_text:
                    continue
                try:
                    start = float(segment.get("start")) if segment.get("start") is not None else 0.0
                    end = float(segment.get("end")) if segment.get("end") is not None else start
                except (TypeError, ValueError):
                    continue
                segments.append({
                    "start": start,
                    "end": end,
                    "text": segment_text,
                })

    return {
        "text": text,
        "language": language_code,
        "segments": segments,
    }


def main() -> None:
    log(f"Python executable: {sys.executable}")
    log(f"PYTHONPATH: {os.environ.get('PYTHONPATH', '')}")
    log(f"PATH: {os.environ.get('PATH', '')}")
    ffmpeg_binary = os.environ.get('FFMPEG_BINARY')
    ffmpeg_exists = bool(ffmpeg_binary and Path(ffmpeg_binary).exists())
    log(f"FFmpeg path exists: {ffmpeg_exists}")
    log(f"Démarrage de la transcription : {INPUT_PATH}")
    log(f"Dossier de sortie : {OUTPUT_DIR}")
    log("Using device: cpu")

    ensure_output_dir(OUTPUT_DIR)

    try:
${openvinoExecutionBlock}        transcript_path = OUTPUT_DIR / "transcript.json"

        transcript_path = OUTPUT_DIR / "transcript.json"
        with transcript_path.open('w', encoding='utf-8') as file:
            json.dump(result, file, ensure_ascii=False, indent=2)

        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:  # pragma: no cover - handled at runtime
        log(f"Erreur lors de la transcription : {error}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
`;
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

      if (isLikelyPythonCommand(command)) {
        const scriptPath = path.join(outputDir, '_transcribe.py');
        const timeout = 30 * 60 * 1000; // 30 minutes

        const writeScript = async (mode: PythonTranscribeScriptMode) => {
          const scriptContent = buildPythonTranscribeScript({ inputPath, outputDir, config, mode });
          await fs.promises.writeFile(scriptPath, scriptContent, 'utf8');
        };

        let initialMode: PythonTranscribeScriptMode = 'openvino';

        if (shouldProbeWhisperProcessor(command)) {
          const isAvailable = await probeWhisperProcessorAvailability(command, outputDir, logger);
          if (!isAvailable) {
            initialMode = 'transformers';
          }
        }

        await writeScript(initialMode);

        try {
          await runProcess(command, [scriptPath], { cwd: outputDir, logger, timeout });
        } catch (error) {
          if (initialMode !== 'openvino' || !shouldRetryWithoutWhisperProcessor(error)) {
            throw error;
          }

          logger.warn(
            {
              inputPath,
              outputDir,
              error: error instanceof Error ? error.message : error,
            },
            'Python Whisper transcription failed: retrying without WhisperProcessor dependency',
          );

          await writeScript('transformers');
          await runProcess(command, [scriptPath], { cwd: outputDir, logger, timeout });
        }

        const transcriptPath = path.join(outputDir, 'transcript.json');
        let raw: string;

        try {
          raw = await fs.promises.readFile(transcriptPath, 'utf8');
        } catch (error) {
          throw new Error(`Python Whisper transcription did not produce transcript.json in ${outputDir}`);
        }

        const data = JSON.parse(raw) as Partial<WhisperTranscriptionResult> & { segments?: unknown };
        let segments = parseJsonSegments(data.segments);
        let text = typeof data.text === 'string' ? data.text : '';

        if (text.trim().length === 0 && segments.length > 0) {
          text = buildTextFromSegments(segments);
        }

        const language = typeof data.language === 'string' && data.language.trim().length > 0
          ? data.language
          : config.language ?? null;

        return {
          model: config.model,
          text,
          segments,
          language,
        } satisfies WhisperTranscriptionResult;
      }

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
