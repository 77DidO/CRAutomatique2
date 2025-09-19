import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import OpenAI from 'openai';
import { getConfig, getOpenAIApiKey } from './configService.js';
import { info, warn, error as logError, debug } from '../utils/logger.js';

function secondsToTimestamp(seconds = 0) {
  const totalMillis = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
  const hours = Math.floor(totalMillis / 3_600_000);
  const minutes = Math.floor((totalMillis % 3_600_000) / 60_000);
  const secs = Math.floor((totalMillis % 60_000) / 1000);
  const millis = totalMillis % 1000;
  const hhmmss = [hours, minutes, secs]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
  return `${hhmmss}.${millis.toString().padStart(3, '0')}`;
}

function normalizeSegments(rawSegments = []) {
  return rawSegments.map((segment, index) => {
    const start = Number(segment.start ?? 0);
    const end = Number(segment.end ?? start);
    const safeStart = Number.isFinite(start) ? start : 0;
    const safeEnd = Number.isFinite(end) ? end : safeStart;
    return {
      speaker: segment.speaker || `SPEAKER_${index.toString().padStart(2, '0')}`,
      start: safeStart,
      end: safeEnd,
      text: (segment.text || '').trim()
    };
  });
}

function buildVtt(segments = []) {
  const lines = ['WEBVTT', ''];
  segments.forEach((segment, index) => {
    const start = secondsToTimestamp(segment.start);
    const end = secondsToTimestamp(segment.end);
    lines.push(String(index + 1));
    lines.push(`${start} --> ${end}`);
    lines.push(segment.text);
    lines.push('');
  });
  return `${lines.join('\n')}\n`;
}

function ensureSegments(rawSegments = [], fallbackText = '') {
  const segments = normalizeSegments(rawSegments);
  if (segments.length > 0) {
    return segments;
  }
  const text = (fallbackText || '').trim();
  if (!text) {
    return [];
  }
  return [
    {
      speaker: 'SPEAKER_00',
      start: 0,
      end: 0,
      text
    }
  ];
}

function buildSegmentsFromWords(words = []) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const text = words
    .map((word) => word?.word || word?.text || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return [];
  }

  const firstWithStart = words.find((word) => Number.isFinite(Number(word?.start)));
  const lastWithEnd = [...words].reverse().find((word) => Number.isFinite(Number(word?.end)));

  const safeStart = Number.isFinite(Number(firstWithStart?.start)) ? Number(firstWithStart.start) : 0;
  const safeEnd = Number.isFinite(Number(lastWithEnd?.end)) ? Number(lastWithEnd.end) : safeStart;

  return [
    {
      speaker: 'SPEAKER_00',
      start: safeStart,
      end: safeEnd,
      text
    }
  ];
}

async function transcribeWithOpenAI(
  filePath,
  { model, language, baseUrl, response_format: requestedFormat, diarization } = {}
) {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('Clé API OpenAI manquante pour la transcription.');
  }

  const config = getConfig();
  const resolvedBaseUrl = baseUrl || config?.providers?.chatgpt?.baseUrl || undefined;
  const client = new OpenAI({ apiKey, ...(resolvedBaseUrl ? { baseURL: resolvedBaseUrl } : {}) });
  debug('Envoi du fichier au service OpenAI Whisper', { model, language });
  const effectiveModel = model || 'gpt-4o-mini-transcribe';
  const preferredFormat = requestedFormat || 'verbose_json';
  const diarizationOption =
    diarization && typeof diarization === 'object'
      ? { diarization }
      : diarization
        ? { diarization: { enable: true } }
        : {};

  const formatCandidates = [];
  const fallbackOrder = ['verbose_json', 'json', 'text', ''];

  if (preferredFormat) {
    formatCandidates.push(preferredFormat);
  }

  fallbackOrder.forEach((format) => {
    if (!formatCandidates.includes(format)) {
      formatCandidates.push(format);
    }
  });

  let response;
  let responseFormatUsed = preferredFormat;
  let lastError;
  for (const format of formatCandidates) {
    const payload = {
      file: fs.createReadStream(filePath),
      model: effectiveModel,
      ...(language ? { language } : {}),
      ...diarizationOption,
      ...(format ? { response_format: format } : {})
    };

    try {
      response = await client.audio.transcriptions.create(payload);
      responseFormatUsed = format || 'text';
      if (!format && preferredFormat) {
        responseFormatUsed = preferredFormat;
      }
      break;
    } catch (error) {
      lastError = error;
      if (payload.file && typeof payload.file.destroy === 'function') {
        payload.file.destroy();
      }
      const errorMessage = error?.error?.message || error?.message || '';
      const lowerMessage = (errorMessage || '').toLowerCase();
      const formatUnsupported = Boolean(
        error?.error?.param === 'response_format' ||
          (lowerMessage &&
            (/response_format/.test(lowerMessage) ||
              (/format/.test(lowerMessage) &&
                (/support/.test(lowerMessage) || /compatible/.test(lowerMessage) || /available/.test(lowerMessage)))))
      );

      if (!formatUnsupported) {
        throw error;
      }

      const nextFormat = formatCandidates[formatCandidates.indexOf(format) + 1];
      if (!nextFormat) {
        throw error;
      }

      warn(
        "Le format de réponse demandé est indisponible pour ce modèle, tentative avec un format alternatif.",
        {
          model: effectiveModel,
          attemptedFormat: format || '(par défaut)',
          nextFormat: nextFormat || '(par défaut)',
          message: errorMessage
        }
      );
    }
  }

  if (!response) {
    throw lastError || new Error('Échec de la transcription, aucun format valide disponible.');
  }

  let segments = ensureSegments(response.segments || [], response.text);
  if (segments.length === 0 && Array.isArray(response.words) && response.words.length > 0) {
    segments = ensureSegments(buildSegmentsFromWords(response.words), response.text);
  }
  const text = (response.text || '').trim();
  const vtt = buildVtt(segments);
  info('Transcription récupérée via OpenAI', {
    model: effectiveModel,
    responseFormat: responseFormatUsed
  });
  return { text, segments, vtt, raw: response };
}

async function readWhisperVerboseJson(directory) {
  const files = fs.readdirSync(directory);
  const target = files.find((file) => file.endsWith('.verbose.json'));
  if (!target) {
    throw new Error('Le fichier verbose_json Whisper est introuvable.');
  }
  const raw = fs.readFileSync(path.join(directory, target), 'utf-8');
  return JSON.parse(raw);
}

async function transcribeWithWhisperBinary(filePath, options = {}) {
  const {
    binaryPath = 'whisper',
    model = 'small',
    language,
    additionalArgs = []
  } = options;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-'));
  const args = [
    filePath,
    '--model',
    model,
    '--output_dir',
    tmpDir,
    '--output_format',
    'verbose_json'
  ];
  if (language) {
    args.push('--language', language);
  }
  if (Array.isArray(additionalArgs) && additionalArgs.length > 0) {
    args.push(...additionalArgs);
  }

  info('Lancement de Whisper en ligne de commande', { binaryPath, model, language });
  const stderrChunks = [];
  await new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args);
    child.stderr.on('data', (chunk) => stderrChunks.push(chunk.toString()));
    child.on('error', (error) => {
      reject(new Error(`Impossible de lancer Whisper: ${error.message}`));
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper a échoué avec le code ${code}: ${stderrChunks.join('')}`));
      } else {
        resolve();
      }
    });
  });

  try {
    const result = await readWhisperVerboseJson(tmpDir);
    const segments = normalizeSegments(result.segments || []);
    const text = (result.text || '').trim();
    const vtt = buildVtt(segments);
    info('Transcription récupérée via Whisper local', { model });
    return { text, segments, vtt, raw: result };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export async function transcribeAudio(processedPath) {
  if (!processedPath) {
    throw new Error('Aucun fichier prétraité fourni pour la transcription.');
  }
  const config = getConfig();
  const transcriptionConfig = config.transcription || {};
  const provider = transcriptionConfig.provider || 'openai';

  debug('Transcription audio déclenchée', { provider, processedPath });
  try {
    if (provider === 'whisper') {
      return await transcribeWithWhisperBinary(processedPath, transcriptionConfig.whisper);
    }
    if (provider === 'openai') {
      return await transcribeWithOpenAI(processedPath, {
        ...transcriptionConfig.openai,
        diarization: config?.diarization
      });
    }
    warn('Fournisseur de transcription inconnu, utilisation d\'OpenAI par défaut.', { provider });
    return await transcribeWithOpenAI(processedPath, {
      ...transcriptionConfig.openai,
      diarization: config?.diarization
    });
  } catch (error) {
    logError('Erreur lors de la transcription audio', { provider, message: error.message });
    throw error;
  }
}
