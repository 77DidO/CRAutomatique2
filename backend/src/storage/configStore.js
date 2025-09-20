import { readFile, writeFile } from 'fs/promises';
import { CONFIG_FILE } from '../config/paths.js';

function toStructuredClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function sanitizeTranscriptionConfig(config) {
  if (!config || typeof config !== 'object') {
    return {};
  }

  const sanitized = toStructuredClone(config);
  const stringFields = ['engine', 'binaryPath', 'model', 'modelPath', 'language'];

  stringFields.forEach((field) => {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitized[field].trim();
      if (sanitized[field].length === 0) {
        delete sanitized[field];
      }
    }
  });

  if (Object.hasOwn(sanitized, 'translate')) {
    sanitized.translate = sanitized.translate === true
      || sanitized.translate === 'true'
      || sanitized.translate === 1
      || sanitized.translate === '1';
  }

  if (Object.hasOwn(sanitized, 'temperature')) {
    if (typeof sanitized.temperature === 'string') {
      const parsed = Number.parseFloat(sanitized.temperature);
      if (Number.isFinite(parsed)) {
        sanitized.temperature = parsed;
      } else {
        delete sanitized.temperature;
      }
    }
    if (typeof sanitized.temperature === 'number') {
      sanitized.temperature = Math.max(0, Math.min(1, sanitized.temperature));
    }
  }

  if (Object.hasOwn(sanitized, 'extraArgs')) {
    if (typeof sanitized.extraArgs === 'string') {
      sanitized.extraArgs = sanitized.extraArgs
        .split(/\r?\n|\s+/)
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    } else if (Array.isArray(sanitized.extraArgs)) {
      sanitized.extraArgs = sanitized.extraArgs
        .map((value) => String(value ?? '').trim())
        .filter((value) => value.length > 0);
    } else {
      delete sanitized.extraArgs;
    }

    if (Array.isArray(sanitized.extraArgs) && sanitized.extraArgs.length === 0) {
      delete sanitized.extraArgs;
    }
  }

  return sanitized;
}

function normalizeConfigInput(partialConfig) {
  if (!partialConfig || typeof partialConfig !== 'object') {
    return {};
  }

  const normalized = toStructuredClone(partialConfig);

  if (normalized.whisper) {
    normalized.whisper = sanitizeTranscriptionConfig(normalized.whisper);
  }

  if (normalized.transcription || normalized.whisper) {
    const mergedTranscription = {
      engine: 'local-whisper',
      ...(normalized.whisper ?? {}),
      ...(normalized.transcription ?? {})
    };
    normalized.transcription = sanitizeTranscriptionConfig(mergedTranscription);
  }

  return normalized;
}

export class ConfigStore {
  constructor() {
    this.config = null;
  }

  async init() {
    this.config = await this.readConfig();
  }

  async readConfig() {
    const content = await readFile(CONFIG_FILE, 'utf8');
    if (content.trim().length === 0) {
      return {};
    }
    return JSON.parse(content);
  }

  async get() {
    if (!this.config) {
      this.config = await this.readConfig();
    }
    return this.config;
  }

  async set(nextConfig) {
    this.config = nextConfig;
    const payload = JSON.stringify(nextConfig, null, 2);
    await writeFile(CONFIG_FILE, `${payload}\n`, 'utf8');
    return this.config;
  }

  async merge(partialConfig) {
    const current = await this.get();
    const merged = toStructuredClone(current);

    const deepMerge = (target, source) => {
      Object.entries(source).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
          }
          deepMerge(target[key], value);
        } else {
          target[key] = value;
        }
      });
    };

    deepMerge(merged, normalizeConfigInput(partialConfig));
    return this.set(merged);
  }
}

export { normalizeConfigInput };
export { sanitizeTranscriptionConfig };
