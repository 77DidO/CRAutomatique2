import { useEffect, useMemo, useState } from 'react';

function computeSummary(segments) {
  const totals = new Map();
  segments.forEach((segment) => {
    const duration = Math.max(0, Number(segment.end || 0) - Number(segment.start || 0));
    const speaker = segment.speaker || 'Inconnu';
    totals.set(speaker, (totals.get(speaker) || 0) + duration);
  });
  return Array.from(totals.entries()).map(([speaker, duration]) => ({ speaker, duration }));
}

function DiarizationCard({ job }) {
  const [segments, setSegments] = useState([]);
  const resource = job?.resources?.find((item) => item.type === 'segments.json');

  useEffect(() => {
    if (!resource) {
      setSegments([]);
      return;
    }
    let ignore = false;
    fetch(resource.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Invalid response');
        }
        return response.json();
      })
      .then((data) => {
        if (!ignore) {
          setSegments(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSegments([]);
        }
      });

    return () => {
      ignore = true;
    };
  }, [resource]);

  const totals = useMemo(() => computeSummary(segments), [segments]);
  const totalDuration = totals.reduce((acc, item) => acc + item.duration, 0);

  if (!resource) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Répartition des locuteurs</h2>
      </header>
      {totals.length === 0 ? (
        <p className="empty-placeholder">Aucune donnée de diarisation.</p>
      ) : (
        <ul className="diarization-list">
          {totals.map((item) => {
            const percentage = totalDuration ? Math.round((item.duration / totalDuration) * 1000) / 10 : 0;
            return (
              <li key={item.speaker}>
                <span className="diarization-list__speaker">{item.speaker}</span>
                <span className="diarization-list__duration">{item.duration.toFixed(1)} s</span>
                <span className="diarization-list__ratio">{percentage}%</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default DiarizationCard;
