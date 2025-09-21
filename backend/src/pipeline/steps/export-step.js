import path from 'node:path';
import fs from 'node:fs';

export async function exportStep(context) {
  const { job, environment, jobStore } = context;
  const jobDir = path.join(environment.jobsDir, job.id);
  const outputs = [];

  await jobStore.appendLog(job.id, 'Export des livrables');

  const transcription = context.data.transcription?.text || '';
  if (!transcription) {
    throw new Error('Transcription introuvable, export impossible');
  }
  const transcriptPath = path.join(jobDir, 'transcription_raw.txt');
  await fs.promises.writeFile(transcriptPath, transcription, 'utf8');
  outputs.push({
    label: 'Transcription brute',
    filename: 'transcription_raw.txt',
    mimeType: 'text/plain',
  });

  if (context.data.summary) {
    const summaryPath = path.join(jobDir, 'summary.md');
    await fs.promises.writeFile(summaryPath, context.data.summary.markdown, 'utf8');
    outputs.push({ label: 'Résumé', filename: 'summary.md', mimeType: 'text/markdown' });
  }

  if (context.data.transcription?.segments) {
    const vttPath = path.join(jobDir, 'subtitles.vtt');
    await fs.promises.writeFile(vttPath, buildVtt(context.data.transcription.segments), 'utf8');
    outputs.push({ label: 'Sous-titres', filename: 'subtitles.vtt', mimeType: 'text/vtt' });
  }

  for (const output of outputs) {
    await jobStore.addOutput(job.id, output);
  }

  context.data.outputs = outputs;

  await jobStore.appendLog(job.id, 'Exports finalisés');
}

function buildVtt(segments) {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((segment, index) => {
      const start = formatTimestamp(segment.start || 0);
      const end = formatTimestamp(segment.end || 0);
      const text = segment.text || '';
      return `${index + 1}\n${start} --> ${end}\n${text.trim()}\n`;
    })
    .join('\n');
  return header + body;
}

function formatTimestamp(seconds) {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}
