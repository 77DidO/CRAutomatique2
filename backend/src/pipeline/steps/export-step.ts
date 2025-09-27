import path from 'node:path';
import fs from 'node:fs';
import type { JobOutput, PipelineContext, WhisperTranscriptionSegment } from '../../types/index.js';
import {
  buildSpeakerTimeline,
  formatTimestamp,
  type SpeakerTimelineData,
} from '../utils/speaker-utils.js';

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

  let summaryOutput: JobOutput | null = null;
  if (context.data.summary?.markdown) {
    const summaryPath = path.join(jobDir, 'summary.md');
    await fs.promises.writeFile(summaryPath, context.data.summary.markdown, 'utf8');
    summaryOutput = { label: 'Résumé', filename: 'summary.md', mimeType: 'text/markdown' };
    logger.debug(
      { jobId: job.id, summaryPath, summaryLength: context.data.summary.markdown.length },
      'Summary exported',
    );
  }

  const timeline = buildSpeakerTimeline(context.data.transcription?.segments);

  if (timeline) {
    const timedTranscriptPath = path.join(jobDir, 'transcription_timed.txt');
    await fs.promises.writeFile(timedTranscriptPath, buildTimedTranscript(timeline), 'utf8');
    outputs.push({
      label: 'Transcription horodatée (speakers)',
      filename: 'transcription_timed.txt',
      mimeType: 'text/plain',
    });
    logger.debug(
      {
        jobId: job.id,
        timedTranscriptPath,
        segmentCount: timeline.segments.length,
      },
      'Timed transcription exported',
    );

    const jsonPath = path.join(jobDir, 'segments.json');
    await fs.promises.writeFile(jsonPath, buildSegmentsJson(timeline), 'utf8');
    outputs.push({ label: 'Segments (JSON)', filename: 'segments.json', mimeType: 'application/json' });
    logger.debug(
      {
        jobId: job.id,
        jsonPath,
        speakerCount: timeline.speakers.length,
      },
      'Speaker segments JSON exported',
    );
  } else {
    logger.info({ jobId: job.id }, 'Timed transcription export skipped due to missing segments');
  }

  if (summaryOutput) {
    outputs.push(summaryOutput);
  }

  if (config.pipeline.enableSubtitles && context.data.transcription?.segments?.length) {
    // Génération des sous-titres à la volée pour éviter d'écrire sur disque si la fonctionnalité est désactivée.
    const vttPath = path.join(jobDir, 'subtitles.vtt');
    await fs.promises.writeFile(
      vttPath,
      buildVtt(context.data.transcription.segments, timeline ?? null),
      'utf8',
    );
    outputs.push({ label: 'Sous-titres (avec speakers)', filename: 'subtitles.vtt', mimeType: 'text/vtt' });
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

function buildVtt(
  segments: WhisperTranscriptionSegment[],
  timeline: SpeakerTimelineData | null,
): string {
  const header = 'WEBVTT\n\n';
  const body = segments
    .map((segment, index) => {
      const reference = timeline?.segments[index];
      const start = formatTimestamp(reference?.start ?? segment.start ?? 0);
      const end = formatTimestamp(reference?.end ?? segment.end ?? 0);
      const rawText = reference?.text ?? segment.text ?? '';
      const speakerLabel = reference?.speakerLabel;
      const text = speakerLabel ? `${speakerLabel}: ${rawText.trim()}` : rawText.trim();
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    })
    .join('\n');
  return header + body;
}

function buildTimedTranscript(timeline: SpeakerTimelineData): string {
  const header = '# Transcription horodatée\n\n';
  const body = timeline.segments
    .map((segment) => {
      const start = formatTimestamp(segment.start);
      const end = formatTimestamp(segment.end);
      const label = segment.speakerLabel ?? 'Speaker ?';
      const text = segment.text ? segment.text : '';
      const suffix = text ? ` ${text}` : '';
      return `[${start} - ${end}] ${label}:${suffix}`.trimEnd();
    })
    .join('\n');
  return header + body + (body ? '\n' : '');
}

function buildSegmentsJson(timeline: SpeakerTimelineData): string {
  const payload = {
    generatedAt: new Date().toISOString(),
    segments: timeline.segments.map((segment) => ({
      index: segment.index,
      start: segment.start,
      end: segment.end,
      duration: Number.isFinite(segment.duration) ? Number(segment.duration.toFixed(3)) : 0,
      text: segment.text,
      speaker: segment.speakerId,
      speakerLabel: segment.speakerLabel,
    })),
    speakers: timeline.speakers.map((speaker) => ({
      id: speaker.id,
      label: speaker.label,
      segmentCount: speaker.segmentCount,
      totalDuration: Number.isFinite(speaker.totalDuration)
        ? Number(speaker.totalDuration.toFixed(3))
        : 0,
    })),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
