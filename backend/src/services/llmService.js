import { spawn } from 'child_process';
import OpenAI from 'openai';

import { getConfig } from './configService.js';

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for OpenAI provider');
  }
  return new OpenAI({ apiKey });
}

async function callOpenAI(prompt) {
  const client = createOpenAIClient();
  const { openaiModel } = getConfig();
  const completion = await client.responses.create({
    model: openaiModel,
    input: prompt
  });
  const [{ output_text: text }] = completion.output.filter((item) => item.type === 'output_text');
  return text || '';
}

async function callOllama(prompt) {
  const { ollamaModel } = getConfig();
  const command = process.env.OLLAMA_COMMAND || 'ollama';
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(command, ['run', ollamaModel], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.write(prompt);
    child.stdin.end();
    child.stdout.on('data', (data) => chunks.push(data.toString()));
    child.stderr.on('data', (data) => chunks.push(data.toString()));
    child.on('error', reject);
    child.on('close', () => resolve(chunks.join('')));
  });
}

export async function generateSummary(prompt) {
  const { llmProvider } = getConfig();
  if (llmProvider === 'ollama') {
    return callOllama(prompt);
  }
  return callOpenAI(prompt);
}
