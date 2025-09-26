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
    return <p className="history-empty">Sélectionnez un traitement pour afficher les détails.</p>;
  }

  const hasSegmentsOutput = job.outputs?.some((output) => output.filename === 'segments.json');
  const progressValue = Math.round(job.progress ?? 0);
  const speakerCount = speakerData?.speakers?.length ?? 0;
  const segmentCount = speakerData?.segments?.length ?? 0;

  return (
    <div className="history-detail">
      <header className="history-detail-header">
        <div>
          <h2 className="section-title">{job.filename}</h2>
          <div className="text-base-content/70 text-sm">
            Déclenché le {new Date(job.createdAt).toLocaleString()} • Dernière mise à jour{' '}
            {new Date(job.updatedAt).toLocaleString()}
          </div>
        </div>
        <div className="status-line">
          <div className="status-actions">
            <StatusBadge status={job.status} />
          </div>
          <div className="status-progress" aria-label="Progression du traitement">
            <div className="progress-bar" role="presentation">
              <div className="progress-bar__value" style={{ width: `${progressValue}%` }} />
            </div>
            <span className="status-progress-value">{progressValue}%</span>
          </div>
        </div>
      </header>

      <section aria-labelledby="job-outputs" className="space-y-3">
        <h3 id="job-outputs" className="section-title">
          Exports disponibles
        </h3>
        {job.outputs?.length ? (
          <div className="resource-list">
            {job.outputs.map((output) => (
              <a
                key={output.filename}
                className="resource-link"
                href={`/api/assets/${job.id}/${output.filename}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>{output.label}</span>
                <span className="text-base-content/70 text-sm">{output.mimeType}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-base-content/70">Aucun export n'est encore disponible.</p>
        )}
      </section>

      <section aria-labelledby="job-speakers" className="space-y-3">
        <h3 id="job-speakers" className="section-title">
          Interventions par speaker
        </h3>
        {!hasSegmentsOutput && <p className="text-base-content/70">Données speaker non disponibles pour ce traitement.</p>}
        {hasSegmentsOutput && isLoadingSpeakers && <p className="text-base-content/70">Chargement des segments…</p>}
        {hasSegmentsOutput && speakersError && (
          <p className="error-text">Impossible de charger les segments : {speakersError}</p>
        )}
        {hasSegmentsOutput && !isLoadingSpeakers && !speakersError && speakerData && (
          <div className="space-y-6">
            <div className="diarization-summary">
              <div className="diarization-card">
                <p className="diarization-card__title">Locuteurs identifiés</p>
                <p className="diarization-card__metric">{speakerCount}</p>
                <p className="diarization-card__meta">Nombre total de voix</p>
              </div>
              <div className="diarization-card">
                <p className="diarization-card__title">Segments</p>
                <p className="diarization-card__metric">{segmentCount}</p>
                <p className="diarization-card__meta">Entrées diarisation</p>
              </div>
            </div>

            {speakerData.speakers?.length ? (
              <ul className="inline-list" aria-label="Liste des locuteurs">
                {speakerData.speakers.map((speaker) => (
                  <li key={speaker.id}>
                    {speaker.label} • {speaker.segmentCount} intervention{speaker.segmentCount > 1 ? 's' : ''}
                    {speaker.totalDuration ? ` • ${formatDuration(speaker.totalDuration)}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base-content/70">Aucun speaker identifié.</p>
            )}

            {speakerData.segments?.length ? (
              <div className="diarization-segment-list" role="list">
                {speakerData.segments.map((segment) => (
                  <article key={segment.index} className="diarization-segment" role="listitem">
                    <div className="diarization-segment__header">
                      <span className="diarization-segment__speaker">{segment.speakerLabel || 'Speaker ?'}</span>
                      <span className="diarization-segment__time">
                        {formatTimestamp(segment.start)} – {formatTimestamp(segment.end)}
                      </span>
                    </div>
                    {segment.text ? (
                      <p className="diarization-segment__text">{segment.text}</p>
                    ) : (
                      <p className="diarization-segment__text">
                        <em>(Silence)</em>
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-base-content/70">Aucune découpe segmentée disponible.</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="job-logs" className="space-y-3">
        <h3 id="job-logs" className="section-title">
          Journal du pipeline
        </h3>
        {isLoadingLogs && <p className="text-base-content/70">Chargement des logs…</p>}
        {logs.length ? (
          <div className="log-list">
            {logs.map((entry, index) => (
              <div key={`${entry.timestamp}-${index}`} className="log-entry">
                <div className="meta">
                  {new Date(entry.timestamp).toLocaleTimeString()} • {entry.level?.toUpperCase()}
                </div>
                <div>{entry.message}</div>
              </div>
            ))}
          </div>
        ) : (
          !isLoadingLogs && <p className="logs-placeholder">Aucun événement pour le moment.</p>
        )}
      </section>
    </div>
  );
}
