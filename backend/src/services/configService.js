import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { info, warn } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/config.json');

const DEFAULT_CONFIG = {
  defaultTemplate: 'meeting-notes',
  participants: [],
  diarization: true,
  enableSummary: true,
  llmProvider: 'chatgpt',
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

function normalizeConfig(config = {}) {
  const {
    providers: rawProviders,
    transcription: rawTranscription,
    openaiModel,
    openaiApiKey,
    openaiBaseUrl,
    ollamaModel,
    ollamaCommand,
    chunkSize,
    chunkOverlap,
    ...rest
  } = config;

  const parsedChunkSize = Number(chunkSize);
  const parsedChunkOverlap = Number(chunkOverlap);

  const merged = {
    ...DEFAULT_CONFIG,
    ...rest,
    ...(Number.isFinite(parsedChunkSize) && parsedChunkSize > 0
      ? { chunkSize: parsedChunkSize }
      : {}),
    ...(Number.isFinite(parsedChunkOverlap) && parsedChunkOverlap >= 0
      ? { chunkOverlap: parsedChunkOverlap }
      : {}),
    providers: mergeProviders(rawProviders, {
      openaiModel,
      openaiApiKey,
      openaiBaseUrl,
      ollamaModel,
      ollamaCommand
    }),
    transcription: mergeTranscription(rawTranscription)
  };

  const provider = merged.llmProvider === 'openai' ? 'chatgpt' : merged.llmProvider;
  merged.llmProvider = provider in merged.providers ? provider : DEFAULT_CONFIG.llmProvider;

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
