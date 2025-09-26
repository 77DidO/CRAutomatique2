import type {
  WhisperTranscriptionSegment,
} from '../../types/index.js';

export interface SpeakerAggregate {
  id: string;
  label: string;
  segmentCount: number;
  totalDuration: number;
}

export interface SpeakerTimelineSegment {
  index: number;
  start: number | null;
  end: number | null;
  duration: number;
  text: string;
  speakerId: string | null;
  speakerLabel: string | null;
}

export interface SpeakerTimelineData {
  segments: SpeakerTimelineSegment[];
  speakers: SpeakerAggregate[];
}

export function buildSpeakerTimeline(
  segments: WhisperTranscriptionSegment[] | undefined,
): SpeakerTimelineData | null {
  if (!Array.isArray(segments) || segments.length === 0) {
    return null;
  }

  const speakerOrder = new Map<string, number>();
  const aggregates = new Map<string, SpeakerAggregate>();
  const timeline: SpeakerTimelineSegment[] = [];

  let segmentIndex = 0;

  for (const segment of segments) {
    const text = typeof segment.text === 'string' ? segment.text.trim() : '';
    const start = typeof segment.start === 'number' ? Math.max(segment.start, 0) : null;
    const end = typeof segment.end === 'number' ? Math.max(segment.end, 0) : null;
    const duration = start != null && end != null && end > start ? end - start : 0;

    const diarizationSpeaker = segment.diarization?.find((item) => typeof item?.speaker === 'string')?.speaker;
    const speakerIdRaw = typeof segment.speaker === 'string' && segment.speaker.trim()
      ? segment.speaker.trim()
      : diarizationSpeaker && diarizationSpeaker.trim()
        ? diarizationSpeaker.trim()
        : null;

    let speakerLabel: string | null = null;

    if (speakerIdRaw) {
      if (!speakerOrder.has(speakerIdRaw)) {
        speakerOrder.set(speakerIdRaw, speakerOrder.size);
      }
      const order = speakerOrder.get(speakerIdRaw) ?? 0;
      speakerLabel = `Speaker ${order + 1}`;

      const aggregate = aggregates.get(speakerIdRaw) ?? {
        id: speakerIdRaw,
        label: speakerLabel,
        segmentCount: 0,
        totalDuration: 0,
      };
      aggregate.segmentCount += 1;
      aggregate.totalDuration += duration;
      aggregate.label = speakerLabel; // garantit la mise à jour si l'ordre change
      aggregates.set(speakerIdRaw, aggregate);
    }

    segmentIndex += 1;
    timeline.push({
      index: segmentIndex,
      start,
      end,
      duration,
      text,
      speakerId: speakerIdRaw,
      speakerLabel,
    });
  }

  if (timeline.every((item) => item.speakerId == null)) {
    return {
      segments: timeline,
      speakers: [],
    };
  }

  const orderedSpeakers = Array.from(aggregates.values()).sort((a, b) => {
    const orderA = speakerOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const orderB = speakerOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });

  return {
    segments: timeline,
    speakers: orderedSpeakers,
  };
}

export function formatSpeakerOverview(speakers: SpeakerAggregate[] | undefined): string | null {
  if (!Array.isArray(speakers) || speakers.length === 0) {
    return null;
  }

  const lines = speakers.map((speaker) => {
    const duration = formatDuration(speaker.totalDuration);
    const plural = speaker.segmentCount > 1 ? 's' : '';
    return `- ${speaker.label} : ${speaker.segmentCount} intervention${plural}, ${duration}`;
  });

  return `Répartition des interventions :\n${lines.join('\n')}`;
}

export function formatTimestamp(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '00:00:00.000';
  }
  const clamped = Math.max(seconds, 0);
  const date = new Date(clamped * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '0s';
  }

  const totalSeconds = Math.max(Math.round(seconds), 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}
