import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAiService } from '../src/services/openai-service.js';
import type { ConfigStore, Logger, LlmConfig, Template, WhisperTranscriptionResult } from '../src/types/index.js';

function createLogger(): Logger {
  return {
    info() {},
    error() {},
    debug() {},
    warn() {},
  };
}

test('generateSummary treats quoted placeholder key as missing', async () => {
  const originalEnvKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const configStore = {
      async initialise() {},
      async read() {
        return {
          whisper: { model: 'base', language: null, computeType: 'auto', batchSize: 0, vad: true, chunkDuration: 0 },
          llm: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2, maxOutputTokens: 1200, apiKey: '"sk-replace-me"' },
          pipeline: { enableSummaries: true, enableSubtitles: true, enableDiarization: false },
        };
      },
      async write() {
        throw new Error('not implemented');
      },
    } satisfies ConfigStore;

    const service = createOpenAiService({ configStore, logger: createLogger() });

    const transcription: WhisperTranscriptionResult = {
      model: 'base',
      text: 'hello',
      segments: [],
      language: 'fr',
    };

    const template: Template = {
      id: 'tpl',
      name: 'Test',
      description: '',
      prompt: 'prompt',
    };

    const config: LlmConfig = {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      maxOutputTokens: 1200,
      apiKey: null,
    };

    const result = await service.generateSummary({
      transcription,
      template,
      participants: [],
      config,
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
