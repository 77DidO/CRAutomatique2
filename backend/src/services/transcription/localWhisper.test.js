import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveWhisperBinary, WhisperBinaryNotFoundError } from './localWhisper.js';

describe('resolveWhisperBinary', () => {
  it('throws a friendly error when the binary path is not a string', async () => {
    await assert.rejects(
      resolveWhisperBinary(123),
      (error) => {
        assert(error instanceof WhisperBinaryNotFoundError);
        assert.match(error.message, /Valeur actuelle : "123"\./);
        return true;
      }
    );
  });
});
