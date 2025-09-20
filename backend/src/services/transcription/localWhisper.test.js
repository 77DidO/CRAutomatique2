import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as localWhisper from './localWhisper.js';

describe('transcribeWithLocalWhisper output discovery', () => {
  it('prefers legacy stemmed output files when available', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'local-whisper-'));
    const outputDir = path.join(tempRoot, 'out');
    await mkdir(outputDir, { recursive: true });
    const audioPath = path.join(tempRoot, 'sample.mjs');
    await writeFile(audioPath, 'process.exit(0);', 'utf8');
    await writeFile(path.join(outputDir, 'sample.txt'), 'Transcription legacy', 'utf8');

    try {
      const result = await localWhisper.transcribeWithLocalWhisper({
        jobId: 'job-123',
        audioPath,
        options: { outputDir, binaryPath: process.execPath }
      });

      assert.equal(result.text, 'Transcription legacy');
      assert.equal(result.segments.length, 0);
      assert.equal(result.raw, null);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('uses basename with extension outputs and reconstructs text from segments', async () => {
    const tempRoot = await mkdtemp(path.join(tmpdir(), 'local-whisper-'));
    const outputDir = path.join(tempRoot, 'out');
    await mkdir(outputDir, { recursive: true });
    const audioPath = path.join(tempRoot, 'sample.mjs');
    await writeFile(audioPath, 'process.exit(0);', 'utf8');
    const jsonPayload = {
      segments: [
        { id: 0, start: 0, end: 1.2, text: 'Bonjour' },
        { id: 1, start: 1.2, end: 2.4, text: 'tout le monde' }
      ]
    };
    await writeFile(
      path.join(outputDir, 'sample.mjs.json'),
      JSON.stringify(jsonPayload),
      'utf8'
    );

    try {
      const result = await localWhisper.transcribeWithLocalWhisper({
        jobId: 'job-456',
        audioPath,
        options: { outputDir, binaryPath: process.execPath }
      });

      assert.equal(result.text, 'Bonjour tout le monde');
      assert.equal(result.segments.length, 2);
      assert.deepEqual(result.raw, jsonPayload);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
