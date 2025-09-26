import React, { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

function formatTimestamp(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '00:00:00';
  }
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hours, minutes, secs].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatDuration(seconds) {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return '0s';
  }
  const totalSeconds = Math.max(0, Math.round(seconds));
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

export default function JobDetail({ job, logs, isLoadingLogs }) {
  const [speakerData, setSpeakerData] = useState(null);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false);
  const [speakersError, setSpeakersError] = useState(null);

  const segmentsOutput = job?.outputs?.find((output) => output.filename === 'segments.json');
  const jobId = job?.id ?? null;
  const jobUpdatedAt = job?.updatedAt ?? null;
  const segmentsFilename = segmentsOutput?.filename ?? null;
  const segmentsKey = jobId && segmentsFilename ? `${jobId}:${segmentsFilename}:${jobUpdatedAt}` : null;

  useEffect(() => {
    let isMounted = true;

    if (!jobId || !segmentsFilename || !segmentsKey) {
      setSpeakerData(null);
      setSpeakersError(null);
      setIsLoadingSpeakers(false);
      return () => {
        isMounted = false;
      };
    }

    const controller = new AbortController();
    setSpeakerData(null);
    setIsLoadingSpeakers(true);
    setSpeakersError(null);

    async function fetchSegments() {
      try {
        const response = await fetch(`/api/assets/${jobId}/${segmentsFilename}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        if (isMounted) {
          setSpeakerData(payload);
        }
      } catch (error) {
        if (isMounted) {
          const err = error instanceof Error ? error : new Error('Erreur inconnue');
          if (err.name !== 'AbortError') {
            setSpeakersError(err.message);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingSpeakers(false);
        }
      }
    }

    fetchSegments();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [jobId, segmentsFilename, segmentsKey]);

  if (!job) {
    return <p>Sélectionnez un traitement pour afficher les détails.</p>;
  }

  const hasSegmentsOutput = job.outputs?.some((output) => output.filename === 'segments.json');

  return (
    <div className="job-detail">
      <header className="job-detail-header">
        <div>
          <h2 className="section-title">
            {job.filename}
            <StatusBadge status={job.status} />
          </h2>
          <p className="job-meta">
            Déclenché le {new Date(job.createdAt).toLocaleString()} • Dernière mise à jour {new Date(job.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="job-progress large">
          <div className="job-progress-bar" style={{ width: `${job.progress ?? 0}%` }} />
        </div>
      </header>

      <section aria-labelledby="job-outputs">
        <h3 id="job-outputs">Exports disponibles</h3>
        {job.outputs?.length ? (
          <div className="asset-list">
            {job.outputs.map((output) => (
              <a
                key={output.filename}
                className="asset-link"
                href={`/api/assets/${job.id}/${output.filename}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>{output.label}</span>
                <span className="asset-meta">{output.mimeType}</span>
              </a>
            ))}
          </div>
        ) : (
          <p>Aucun export n'est encore disponible.</p>
        )}
      </section>

      <section aria-labelledby="job-speakers">
        <h3 id="job-speakers">Interventions par speaker</h3>
        {!hasSegmentsOutput && <p>Données speaker non disponibles pour ce traitement.</p>}
        {hasSegmentsOutput && isLoadingSpeakers && <p>Chargement des segments…</p>}
        {hasSegmentsOutput && speakersError && (
          <p className="text-error">Impossible de charger les segments : {speakersError}</p>
        )}
        {hasSegmentsOutput && !isLoadingSpeakers && !speakersError && speakerData && (
          <div className="speaker-section">
            {speakerData.speakers?.length ? (
              <ul className="speaker-stats">
                {speakerData.speakers.map((speaker) => (
                  <li key={speaker.id}>
                    <span className="label">{speaker.label}</span>
                    <span className="meta">
                      {speaker.segmentCount} intervention{speaker.segmentCount > 1 ? 's' : ''} •{' '}
                      {formatDuration(speaker.totalDuration)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucun speaker identifié.</p>
            )}
            {speakerData.segments?.length ? (
              <div className="segment-timeline" role="list">
                {speakerData.segments.map((segment) => (
                  <div key={segment.index} className="segment-row" role="listitem">
                    <div className="time-range">
                      {formatTimestamp(segment.start)} – {formatTimestamp(segment.end)}
                    </div>
                    <div className="speaker-label">{segment.speakerLabel || 'Speaker ?'}</div>
                    <div className="segment-text">{segment.text || <em>(Silence)</em>}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>Aucune découpe segmentée disponible.</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="job-logs">
        <h3 id="job-logs">Journal du pipeline</h3>
        {isLoadingLogs && <p>Chargement des logs…</p>}
        <div className="logs">
          {logs.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} className="log-entry">
              <div className="meta">
                {new Date(entry.timestamp).toLocaleTimeString()} • {entry.level?.toUpperCase()}
              </div>
              <div>{entry.message}</div>
            </div>
          ))}
          {!logs.length && <p>Aucun événement pour le moment.</p>}
        </div>
      </section>
    </div>
  );
}
