import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveWhisperBinary,
  resolveWhisperCommand,
  WhisperBinaryNotFoundError
} from './localWhisper.js';

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

describe('resolveWhisperCommand', () => {
  it('falls back to python -m whisper when the preferred binary is missing', async () => {
    const result = await resolveWhisperCommand('nonexistent-whisper-binary');
    assert.equal(Array.isArray(result.prefixArgs), true);
    assert.deepEqual(result.prefixArgs, ['-m', 'whisper']);
    assert.equal(typeof result.command, 'string');
    assert.ok(result.command.toLowerCase().includes('python'));
    assert.equal(result.resolvedWithFallback, true);
  });
});
