import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { info, warn } from '../utils/logger.js';
import { DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATES, ensureTemplateList } from '../constants/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/config.json');

const DEFAULT_CONFIG = {
  defaultTemplate: DEFAULT_TEMPLATE_ID,
  templates: DEFAULT_TEMPLATES.map((template) => ({ ...template })),
  participants: [],
  diarization: true,
  enableSummary: true,
  llmProvider: 'chatgpt',
  rubrics: ['Thème', 'Participants', 'Décisions', 'Actions à venir'],

  transcription: {
    provider: 'openai',
    openai: {
      model: 'gpt-4o-mini-transcribe',
      language: '',
      baseUrl: '',
      apiKey: ''
    },
    whisper: {
      binaryPath: 'whisper',
      model: 'small',
      language: '',
      additionalArgs: []
    }
  },
  providers: {
    chatgpt: {
      label: 'ChatGPT (OpenAI)',
      apiKey: '',
      baseUrl: '',
      model: 'gpt-4o-mini'
    },
    ollama: {
      label: 'Ollama',
      command: 'ollama',
      host: 'http://localhost:11434',
      model: 'llama3'
    }
  },
  chunkOverlap: 150,
  chunkSize: 1500
};

let cachedConfig = null;

function mergeTranscription(raw = {}) {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG.transcription));
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const provider = typeof raw.provider === 'string' ? raw.provider : base.provider;
  const openai = {
    ...base.openai,
    ...(raw.openai && typeof raw.openai === 'object' ? raw.openai : {})
  };
  const whisper = {
    ...base.whisper,
    ...(raw.whisper && typeof raw.whisper === 'object' ? raw.whisper : {})
  };

  if (!Array.isArray(whisper.additionalArgs)) {
    whisper.additionalArgs = base.whisper.additionalArgs.slice();
  }

  return {
    provider,
    openai,
    whisper
  };
}

function mergeProviders(rawProviders = {}, legacyConfig = {}) {
  const providers = Object.fromEntries(
    Object.entries(DEFAULT_CONFIG.providers).map(([key, value]) => [key, { ...value }])
  );

  Object.entries(rawProviders).forEach(([key, value]) => {
    providers[key] = {
      ...(DEFAULT_CONFIG.providers[key] || {}),
      ...value
    };
  });

  if (legacyConfig.openaiModel || legacyConfig.openaiApiKey || legacyConfig.openaiBaseUrl) {
    providers.chatgpt = {
      ...providers.chatgpt,
      ...(legacyConfig.openaiModel ? { model: legacyConfig.openaiModel } : {}),
      ...(legacyConfig.openaiApiKey ? { apiKey: legacyConfig.openaiApiKey } : {}),
      ...(legacyConfig.openaiBaseUrl ? { baseUrl: legacyConfig.openaiBaseUrl } : {})
    };
  }

  if (legacyConfig.ollamaModel || legacyConfig.ollamaCommand) {
    providers.ollama = {
      ...providers.ollama,
      ...(legacyConfig.ollamaModel ? { model: legacyConfig.ollamaModel } : {}),
      ...(legacyConfig.ollamaCommand ? { command: legacyConfig.ollamaCommand } : {})
    };
  }

  return providers;
}

function normalizeDiarization(rawValue) {
  if (typeof rawValue === 'boolean') {
    return {
      enable: rawValue
    };
  }

  if (!rawValue || typeof rawValue !== 'object') {
    return { enable: Boolean(DEFAULT_CONFIG.diarization) };
  }

  const parseNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseBoolean = (value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }
    return Boolean(value);
  };

  const normalized = {
    enable: parseBoolean(rawValue.enable ?? rawValue)
  };

  const speakerCount = parseNumber(rawValue.speaker_count);
  if (speakerCount !== null) {
    normalized.speaker_count = speakerCount;
  }

  const minSpeakers = parseNumber(rawValue.min_speakers);
  if (minSpeakers !== null) {
    normalized.min_speakers = minSpeakers;
  }

  const maxSpeakers = parseNumber(rawValue.max_speakers);
  if (maxSpeakers !== null) {
    normalized.max_speakers = maxSpeakers;
  }

  return normalized;
}

function normalizeTemplates(rawTemplates) {
  const templates = ensureTemplateList(rawTemplates);
  return templates.map((template) => ({ ...template }));
}

function normalizeRubrics(rawRubrics) {
  if (!Array.isArray(rawRubrics)) {
    return DEFAULT_CONFIG.rubrics.slice();
  }

  const sanitized = rawRubrics
    .map((rubric) => (typeof rubric === 'string' ? rubric.trim() : ''))
    .filter((rubric) => rubric.length > 0);

  return sanitized.length > 0 ? sanitized : DEFAULT_CONFIG.rubrics.slice();
}

function normalizeConfig(config = {}) {
  const {
    providers: rawProviders,
    transcription: rawTranscription,
    diarization: rawDiarization,
    ui: rawUI,
    openaiModel,
    openaiApiKey,
    openaiBaseUrl,
    ollamaModel,
    ollamaCommand,
    chunkSize,
    chunkOverlap,
    defaultTemplate,
    participants,
    templates: rawTemplates,
    rubrics: rawRubrics,
    ...rest
  } = config;

  const parsedChunkSize = Number(chunkSize);
  const parsedChunkOverlap = Number(chunkOverlap);

  const mergedTemplates = normalizeTemplates(rawTemplates);

  const merged = {
    ...DEFAULT_CONFIG,
    ...rest,
    ...(Number.isFinite(parsedChunkSize) && parsedChunkSize > 0
      ? { chunkSize: parsedChunkSize }
      : {}),
    ...(Number.isFinite(parsedChunkOverlap) && parsedChunkOverlap >= 0
      ? { chunkOverlap: parsedChunkOverlap }
      : {}),
    diarization: normalizeDiarization(rawDiarization),
    providers: mergeProviders(rawProviders, {
      openaiModel,
      openaiApiKey,
      openaiBaseUrl,
      ollamaModel,
      ollamaCommand
    }),
    transcription: mergeTranscription(rawTranscription),
    templates: mergedTemplates,
    rubrics: normalizeRubrics(rawRubrics)

  };

  const provider = merged.llmProvider === 'openai' ? 'chatgpt' : merged.llmProvider;
  merged.llmProvider = provider in merged.providers ? provider : DEFAULT_CONFIG.llmProvider;

  const preferredTemplateId =
    typeof defaultTemplate === 'string' && defaultTemplate.trim()
      ? defaultTemplate.trim()
      : merged.defaultTemplate;
  const availableTemplateIds = new Set(mergedTemplates.map((template) => template.id));
  if (availableTemplateIds.size === 0) {
    merged.templates = DEFAULT_TEMPLATES.map((template) => ({ ...template }));
    availableTemplateIds.clear();
    merged.templates.forEach((template) => availableTemplateIds.add(template.id));
  }

  if (!availableTemplateIds.has(preferredTemplateId)) {
    const defaultCandidate = availableTemplateIds.has(DEFAULT_TEMPLATE_ID)
      ? DEFAULT_TEMPLATE_ID
      : merged.templates[0]?.id || DEFAULT_TEMPLATE_ID;
    merged.defaultTemplate = defaultCandidate;
  } else {
    merged.defaultTemplate = preferredTemplateId;
  }

  return merged;
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    cachedConfig = normalizeConfig({});
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
    info('Fichier de configuration créé avec les valeurs par défaut.');
  } else {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    cachedConfig = normalizeConfig(JSON.parse(raw));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
    info('Configuration chargée depuis le disque.');
  }
  return cachedConfig;
}

export function getConfig() {
  if (!cachedConfig) {
    warn('Configuration demandée avant le chargement, chargement automatique.');
    return loadConfig();
  }
  return cachedConfig;
}

export function saveConfig(partialConfig) {
  const nextConfig = normalizeConfig({ ...getConfig(), ...partialConfig });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(nextConfig, null, 2));
  cachedConfig = nextConfig;
  info('Configuration sauvegardée.', { llmProvider: cachedConfig.llmProvider });
  return cachedConfig;
}

export function getOpenAIApiKey() {
  const config = getConfig();
  return (
    config?.transcription?.openai?.apiKey
      || config?.providers?.chatgpt?.apiKey
      || process.env.OPENAI_API_KEY
      || ''
  );
}

export { CONFIG_PATH };
