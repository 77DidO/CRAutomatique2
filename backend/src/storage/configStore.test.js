import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeTranscriptionConfig } from './configStore.js';

describe('sanitizeTranscriptionConfig', () => {
  it('normalizes whisper-prefixed model names to CLI-compatible values', () => {
    const sanitized = sanitizeTranscriptionConfig({ model: 'whisper-large-v3' });
    assert.equal(sanitized.model, 'large-v3');
  });

  it('removes empty model names after normalization', () => {
    const sanitized = sanitizeTranscriptionConfig({ model: 'whisper-' });
    assert.equal(Object.hasOwn(sanitized, 'model'), false);
  });
});
