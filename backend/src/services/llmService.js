import { spawn } from 'child_process';
import OpenAI from 'openai';

import { getConfig } from './configService.js';
import { info, warn } from '../utils/logger.js';

function createChatGPTClient(providerConfig) {
  const apiKey = providerConfig.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Aucune clé API configurée pour ChatGPT');
  }
  const baseURL = providerConfig.baseUrl?.trim() ? providerConfig.baseUrl.trim() : undefined;
  return new OpenAI({ apiKey, baseURL });
}

async function callChatGPT(prompt, providerConfig) {
  const client = createChatGPTClient(providerConfig);
  if (!providerConfig.model) {
    throw new Error('Aucun modèle ChatGPT configuré');
  }
  info('Appel du fournisseur ChatGPT.', { model: providerConfig.model });
  const completion = await client.responses.create({
    model: providerConfig.model,
    input: prompt
  });
  const textItem = completion.output?.find((item) => item.type === 'output_text');
  if (textItem?.output_text) {
    return textItem.output_text;
  }
  if (typeof completion.output_text === 'string') {
    return completion.output_text;
  }
  return '';
}

async function callOllama(prompt, providerConfig) {
  const command = providerConfig.command || process.env.OLLAMA_COMMAND || 'ollama';
  const model = providerConfig.model;
  if (!model) {
    return Promise.reject(new Error('Aucun modèle Ollama configuré'));
  }
  info('Appel du fournisseur Ollama.', { command, model });
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(command, ['run', model], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.write(prompt);
    child.stdin.end();
    child.stdout.on('data', (data) => chunks.push(data.toString()));
    child.stderr.on('data', (data) => chunks.push(data.toString()));
    child.on('error', reject);
    child.on('close', () => resolve(chunks.join('')));
  });
}

export async function generateSummary(prompt) {
  const config = getConfig();
  const providers = config.providers || {};
  const providerKey = config.llmProvider || 'chatgpt';
  const providerConfig = providers[providerKey];

  if (!providerConfig) {
    throw new Error(`Fournisseur LLM inconnu: ${providerKey}`);
  }

  if (providerKey === 'ollama') {
    warn('Génération de résumé via Ollama (mode expérimental).');
    return callOllama(prompt, providerConfig);
  }
  info('Génération de résumé via ChatGPT.');
  return callChatGPT(prompt, providerConfig);
}
