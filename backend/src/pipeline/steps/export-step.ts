import path from 'node:path';
import fs from 'node:fs';
import type { JobOutput, PipelineContext, WhisperTranscriptionSegment } from '../../types/index.js';

export async function exportStep(context: PipelineContext): Promise<void> {
  const { job, environment, jobStore, logger, config } = context;
  const jobDir = path.join(environment.jobsDir, job.id);
  const outputs: JobOutput[] = [];

  await jobStore.appendLog(job.id, 'Export des livrables');
  logger.info({ jobId: job.id, jobDir }, 'Export step started');

  const transcription = context.data.transcription?.text ?? '';
  if (!transcription) {
    // Sans transcription, la suite des exports serait incohérente : on préfère remonter une erreur claire.
    logger.error({ jobId: job.id }, 'Export step failed due to missing transcription');
    throw new Error('Transcription introuvable, export impossible');
  }
  const transcriptPath = path.join(jobDir, 'transcription_raw.txt');
  await fs.promises.writeFile(transcriptPath, transcription, 'utf8');
  outputs.push({
    label: 'Transcription brute',
    filename: 'transcription_raw.txt',
    mimeType: 'text/plain',
  });
  logger.debug(
    { jobId: job.id, transcriptPath, transcriptLength: transcription.length },
    'Raw transcription exported',
  );

  if (context.data.summary?.markdown) {
    const summaryPath = path.join(jobDir, 'summary.md');
    await fs.promises.writeFile(summaryPath, context.data.summary.markdown, 'utf8');
    outputs.push({ label: 'Résumé', filename: 'summary.md', mimeType: 'text/markdown' });
    logger.debug(
      { jobId: job.id, summaryPath, summaryLength: context.data.summary.markdown.length },
      'Summary exported',
    );
  }

  if (config.pipeline.enableSubtitles && context.data.transcription?.segments?.length) {
    // Génération des sous-titres à la volée pour éviter d'écrire sur disque si la fonctionnalité est désactivée.
    const vttPath = path.join(jobDir, 'subtitles.vtt');
    await fs.promises.writeFile(vttPath, buildVtt(context.data.transcription.segments), 'utf8');
    outputs.push({ label: 'Sous-titres', filename: 'subtitles.vtt', mimeType: 'text/vtt' });
    logger.debug(
      { jobId: job.id, vttPath, segmentCount: context.data.transcription.segments.length },
      'Subtitles exported',
    );
  } else if (!config.pipeline.enableSubtitles) {
    logger.info({ jobId: job.id }, 'Subtitles export skipped because subtitles are disabled');
  }

  for (const output of outputs) {
    await jobStore.addOutput(job.id, output);
  }

  context.data.outputs = outputs;
  logger.info({ jobId: job.id, outputCount: outputs.length }, 'Export step completed');

  await jobStore.appendLog(job.id, 'Exports finalisés');
}

function buildVtt(segments: WhisperTranscriptionSegment[]): string {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((segment, index) => {
      const start = formatTimestamp(segment.start ?? 0);
      const end = formatTimestamp(segment.end ?? 0);
      const text = segment.text ?? '';
      return `${index + 1}\n${start} --> ${end}\n${text.trim()}\n`;
    })
    .join('\n');
  return header + body;
}

function formatTimestamp(seconds: number): string {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}
