import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/config.json');

const DEFAULT_CONFIG = {
  defaultTemplate: 'meeting-notes',
  participants: [],
  diarization: true,
  enableSummary: true,
  llmProvider: 'chatgpt',
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
    openaiModel,
    openaiApiKey,
    openaiBaseUrl,
    ollamaModel,
    ollamaCommand,
    ...rest
  } = config;

  const merged = {
    ...DEFAULT_CONFIG,
    ...rest,
    providers: mergeProviders(rawProviders, {
      openaiModel,
      openaiApiKey,
      openaiBaseUrl,
      ollamaModel,
      ollamaCommand
    })
  };

  const provider = merged.llmProvider === 'openai' ? 'chatgpt' : merged.llmProvider;
  merged.llmProvider = provider in merged.providers ? provider : DEFAULT_CONFIG.llmProvider;

  return merged;
}

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    cachedConfig = normalizeConfig({});
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
  } else {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    cachedConfig = normalizeConfig(JSON.parse(raw));
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
  }
  return cachedConfig;
}

export function getConfig() {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}

export function saveConfig(partialConfig) {
  const nextConfig = normalizeConfig({ ...getConfig(), ...partialConfig });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(nextConfig, null, 2));
  cachedConfig = nextConfig;
  return cachedConfig;
}

export { CONFIG_PATH };
