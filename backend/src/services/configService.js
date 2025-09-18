import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '../../data/config.json');

let cachedConfig = null;

export function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    cachedConfig = {
      defaultTemplate: 'meeting-notes',
      diarization: true,
      enableSummary: true,
      llmProvider: 'openai',
      ollamaModel: 'llama3',
      openaiModel: 'gpt-4o-mini',
      chunkOverlap: 150,
      chunkSize: 1500
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cachedConfig, null, 2));
  } else {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    cachedConfig = JSON.parse(raw);
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
  const nextConfig = { ...getConfig(), ...partialConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(nextConfig, null, 2));
  cachedConfig = nextConfig;
  return cachedConfig;
}

export { CONFIG_PATH };
