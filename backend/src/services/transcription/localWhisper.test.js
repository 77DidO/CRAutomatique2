import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveWhisperBinary,
  resolveWhisperCommand,
  WhisperBinaryNotFoundError,
  isWindowsCommandNotFoundExitCode,
  isWindowsStorePythonPath,
  buildPythonModuleArgs
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

  it('adds -3 when falling back to the Windows py launcher', async () => {
    const args = buildPythonModuleArgs('py.exe');
    assert.deepEqual(args, ['-3', '-m', 'whisper']);
  });
});

describe('isWindowsCommandNotFoundExitCode', () => {
  it('returns true only for the Windows command-not-found exit code', () => {
    assert.equal(isWindowsCommandNotFoundExitCode(9009, 'win32'), true);
    assert.equal(isWindowsCommandNotFoundExitCode(9009, 'linux'), false);
    assert.equal(isWindowsCommandNotFoundExitCode(undefined, 'win32'), false);
  });
});

describe('isWindowsStorePythonPath', () => {
  it('detects Microsoft Store python launchers on Windows', () => {
    const result = isWindowsStorePythonPath('C:/Users/test/AppData/Local/Microsoft/WindowsApps/python3.exe', 'win32');
    assert.equal(result, true);
  });

  it('ignores regular paths or non-Windows platforms', () => {
    assert.equal(isWindowsStorePythonPath('/usr/bin/python3', 'linux'), false);
    assert.equal(isWindowsStorePythonPath('C:/Python311/python.exe', 'win32'), false);
  });
});
