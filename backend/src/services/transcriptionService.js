import fs from 'fs';
import path from 'path';
import { info, debug } from '../utils/logger.js';

function normalizeText(buffer) {
  if (!buffer || buffer.length === 0) {
    return '';
  }
  const text = buffer.toString('utf-8').replace(/\s+/g, ' ').trim();
  if (text) {
    return text;
  }
  return 'Transcription simulée indisponible pour ce format.';
}

function buildSegments(text) {
  if (!text) {
    return [];
  }
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (sentences.length === 0) {
    return [];
  }
  const now = Date.now();
  return sentences.map((sentence, index) => ({
    speaker: `SPEAKER_${index.toString().padStart(2, '0')}`,
    start: index * 5,
    end: index * 5 + 4,
    text: sentence,
    id: `${now}-${index}`
  }));
}

function buildVtt(segments) {
  const lines = ['WEBVTT', ''];
  segments.forEach((segment, index) => {
    const start = new Date(segment.start * 1000).toISOString().substr(11, 8);
    const end = new Date(segment.end * 1000).toISOString().substr(11, 8);
    lines.push(String(index + 1));
    lines.push(`${start}.000 --> ${end}.000`);
    lines.push(segment.text);
    lines.push('');
  });
  return `${lines.join('\n')}\n`;
}

export async function transcribeAudio(filePath) {
  if (!filePath) {
    throw new Error('Aucun fichier fourni pour la transcription.');
  }
  debug('Lecture du fichier pour transcription simulée', { filePath });
  const buffer = await fs.promises.readFile(filePath);
  const text = normalizeText(buffer);
  const segments = buildSegments(text);
  const vtt = buildVtt(segments);
  info('Transcription simulée réalisée', {
    file: path.basename(filePath),
    segments: segments.length
  });
  return {
    text,
    segments,
    vtt
  };
}
