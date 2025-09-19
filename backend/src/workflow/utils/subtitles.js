function formatTimestamp(seconds) {
  const numeric = Number(seconds ?? 0);
  if (!Number.isFinite(numeric)) {
    return '00:00:00.000';
  }

  const totalMs = Math.max(0, Math.round(numeric * 1000));
  const hours = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
  const minutes = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
  const secondsPart = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
  const milliseconds = String(totalMs % 1000).padStart(3, '0');

  return `${hours}:${minutes}:${secondsPart}.${milliseconds}`;
}

export function createVttFromSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  const lines = ['WEBVTT', ''];
  segments.forEach((segment, index) => {
    const rawText = typeof segment?.text === 'string' ? segment.text.trim() : '';
    if (!rawText) {
      return;
    }

    const start = formatTimestamp(segment?.start ?? index * 5);
    const end = formatTimestamp(segment?.end ?? start);
    lines.push(`${index + 1}`, `${start} --> ${end}`, rawText, '');
  });

  return lines.join('\n').trimEnd();
}
