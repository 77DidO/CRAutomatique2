import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenAiService } from '../src/services/openai-service.js';

function createLogger() {
  return { info() {}, error() {}, debug() {}, warn() {} };
}

test('generateSummary treats quoted placeholder key as missing', async () => {
  const originalEnvKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const configStore = {
      async read() {
        return { llm: { apiKey: '"sk-replace-me"' } };
      },
    };

    const service = createOpenAiService({ configStore, logger: createLogger() });

    const result = await service.generateSummary({
      transcription: { text: 'hello' },
      template: { prompt: 'prompt' },
      participants: [],
      config: {},
    });

    assert.equal(result.markdown, null);
    assert.equal(result.reason, 'missing_api_key');
  } finally {
    if (originalEnvKey !== undefined) {
      process.env.OPENAI_API_KEY = originalEnvKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  }
});
