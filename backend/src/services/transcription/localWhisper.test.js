import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveWhisperBinary,
  resolveWhisperCommand,
  WhisperBinaryNotFoundError,
  createWhisperProcessError
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

  it('tries provided python candidates until one resolves', async () => {
    const attempts = [];
    const fakeResolver = async (candidate) => {
      attempts.push(candidate);
      if (candidate === 'nonexistent-whisper-binary') {
        throw new WhisperBinaryNotFoundError('missing');
      }
      if (candidate === 'python3' || candidate === 'python') {
        throw new WhisperBinaryNotFoundError('missing');
      }
      if (candidate === 'py') {
        return 'C:/Python/py.exe';
      }
      throw new Error('unexpected candidate');
    };

    const result = await resolveWhisperCommand('nonexistent-whisper-binary', {
      resolver: fakeResolver,
      pythonCandidates: ['python3', 'python', 'py']
    });

    assert.deepEqual(attempts, ['nonexistent-whisper-binary', 'python3', 'python', 'py']);
    assert.equal(result.command, 'C:/Python/py.exe');
    assert.deepEqual(result.prefixArgs, ['-m', 'whisper']);
    assert.equal(result.resolvedWithFallback, true);
  });
});

describe('createWhisperProcessError', () => {
  it('converts exit code 9009 into a WhisperBinaryNotFoundError', () => {
    const error = createWhisperProcessError({
      code: 9009,
      command: 'whisper.exe',
      stdout: 'out',
      stderr: 'err'
    });

    assert(error instanceof WhisperBinaryNotFoundError);
    assert.equal(error.stdout, 'out');
    assert.equal(error.stderr, 'err');
    assert.match(error.message, /Valeur actuelle : "whisper\.exe"/);
  });
});
