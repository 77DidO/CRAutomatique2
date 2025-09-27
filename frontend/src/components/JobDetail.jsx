import React, { useEffect, useMemo, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { renderMarkdown } from '../utils/renderMarkdown.js';

function canPreviewMimeType(mimeType) {
  if (!mimeType) {
    return true;
  }
  const normalized = mimeType.toLowerCase();
  return (
    normalized.startsWith('text/') ||
    normalized.includes('json') ||
    normalized.includes('markdown') ||
    normalized === 'application/xml'
  );
}

function toValidDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDuration(startValue, endValue) {
  const start = toValidDate(startValue);
  const end = toValidDate(endValue);
  if (!start || !end) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return null;
  }

  const totalSeconds = Math.round(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (minutes > 0) {
    parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} s`);
  }

  return parts.join(' ');
}

export default function JobDetail({ job, logs, isLoadingLogs }) {
  const [speakerData, setSpeakerData] = useState(null);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false);
  const [speakersError, setSpeakersError] = useState(null);
  const [summaryContent, setSummaryContent] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState(null);
  const jobId = job?.id ?? null;
  const jobUpdatedAt = job?.updatedAt ?? null;
  const segmentsFilename = segmentsOutput?.filename ?? null;
  const segmentsKey = jobId && segmentsFilename ? `${jobId}:${segmentsFilename}:${jobUpdatedAt}` : null;
  const hasSummaryOutput = job?.outputs?.some((output) => output.filename === 'summary.md') ?? false;
  const summaryKey = jobId && hasSummaryOutput ? `${jobId}:summary:${jobUpdatedAt}` : null;

  useEffect(() => {
    if (!selectedOutputFilename) {
      return;
    }
    const stillExists = outputs.some((output) => output.filename === selectedOutputFilename);
    if (!stillExists) {
      setSelectedOutput(null);
      setIsLoadingOutput(false);
      setOutputError(null);
      setOutputContent('');
    }
  }, [outputs, selectedOutputFilename]);

  useEffect(() => {
    if (!jobId || !selectedOutput) {
      return undefined;
    }

    const controller = new AbortController();
    let isMounted = true;
    const { filename, mimeType } = selectedOutput;

    if (!jobId || !segmentsFilename || !segmentsKey) {
      setSpeakerData(null);
      setSpeakersError(null);
      setIsLoadingSpeakers(false);
      return () => {
        isMounted = false;
        controller.abort();
      };
    }

    async function fetchOutput() {
      setIsLoadingOutput(true);
      setOutputError(null);
      setOutputContent('');
      try {
        const response = await fetch(`${API_BASE}/api/assets/${jobId}/${filename}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const rawText = await response.text();
        let formatted = rawText;
        if (mimeType?.toLowerCase().includes('json')) {
          try {
            formatted = JSON.stringify(JSON.parse(rawText), null, 2);
          } catch (error) {
            formatted = rawText;
          }
        }
        if (isMounted) {
          setOutputContent(formatted);
        }
      } catch (error) {
        if (isMounted) {
          const err = error instanceof Error ? error : new Error('Erreur inconnue');
          if (err.name !== 'AbortError') {
            setOutputError(err.message);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingOutput(false);
        }
      }
    }

    fetchOutput();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [jobId, selectedOutput]);

  useEffect(() => {
    let isMounted = true;

    if (!summaryKey) {
      setSummaryContent('');
      setSummaryError(null);
      setIsLoadingSummary(false);
      return () => {
        isMounted = false;
      };
    }

    const controller = new AbortController();
    setIsLoadingSummary(true);
    setSummaryError(null);
    setSummaryContent('');

    async function fetchSummary() {
      try {
        const response = await fetch(`/api/assets/${jobId}/summary.md`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const text = await response.text();
        if (isMounted) {
          setSummaryContent(text.trim());
        }
      } catch (error) {
        if (isMounted) {
          const err = error instanceof Error ? error : new Error('Erreur inconnue');
          if (err.name !== 'AbortError') {
            setSummaryError(err.message);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoadingSummary(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [summaryKey, jobId]);

  const renderedSummary = useMemo(() => renderMarkdown(summaryContent), [summaryContent]);

  if (!job) {
    return <p className="history-empty">Sélectionnez un traitement pour afficher les détails.</p>;
  }

  const progressValue = Math.round(job.progress ?? 0);
  const formattedProcessingDuration = useMemo(() => {
    if (!job) {
      return null;
    }
    if (job.status !== 'completed') {
      return 'en cours';
    }
    return formatDuration(job.createdAt, job.updatedAt) ?? '—';
  }, [job?.status, job?.createdAt, job?.updatedAt]);

  return (
    <div className="history-detail">
      <header className="history-detail-header">
        <div className="history-detail-heading">
          <div>
            <h2 className="section-title history-detail-title">{job.filename}</h2>
            <div className="text-base-content/70 text-sm">
              Déclenché le {new Date(job.createdAt).toLocaleString()} • Dernière mise à jour{' '}
              {new Date(job.updatedAt).toLocaleString()} • Temps de traitement :{' '}
              {formattedProcessingDuration ?? '—'}
            </div>
          </div>
          <button
            type="button"
            className="history-delete-btn btn btn-error btn-md btn-with-icon"
            onClick={() => {
              if (
                window.confirm(
                  'Voulez-vous vraiment supprimer ce traitement ? Cette action est irréversible.'
                )
              ) {
                onDeleteJob?.(job.id);
              }
            }}
          >
            <svg
              className="btn-with-icon__icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 7.5h12M9.75 7.5V6.75A1.5 1.5 0 0 1 11.25 5.25h1.5a1.5 1.5 0 0 1 1.5 1.5V7.5m1.5 0V18a1.5 1.5 0 0 1-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5V7.5m3 3v6m3-6v6"
              />
            </svg>
            <span>Supprimer</span>
          </button>
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

      <section aria-labelledby="job-summary" className="space-y-3">
        <h3 id="job-summary" className="section-title">
          Synthèse automatique
        </h3>
        {!hasSummaryOutput && (
          <p className="text-base-content/70">Aucun fichier de synthèse n'est disponible pour ce traitement.</p>
        )}
        {hasSummaryOutput && isLoadingSummary && (
          <p className="text-base-content/70">Chargement de la synthèse…</p>
        )}
        {hasSummaryOutput && summaryError && (
          <p className="error-text">Impossible de charger la synthèse : {summaryError}</p>
        )}
        {hasSummaryOutput && !isLoadingSummary && !summaryError && renderedSummary && (
          <div
            className="summary-preview"
            aria-label="Résumé du traitement"
            role="region"
            dangerouslySetInnerHTML={{ __html: renderedSummary }}
          />
        )}
        {hasSummaryOutput && !isLoadingSummary && !summaryError && !renderedSummary && (
          <p className="text-base-content/70">Le fichier de synthèse est vide.</p>
        )}
      </section>

      <section aria-labelledby="job-outputs" className="space-y-3">
        <h3 id="job-outputs" className="section-title">
          Exports disponibles
        </h3>
        {outputs.length ? (
          <div className="resource-list">
            {outputs.map((output) => {
              const isActive = selectedOutput?.filename === output.filename;
              return (
                <button
                  key={output.filename}
                  type="button"
                  className={`resource-link${isActive ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedOutput({
                      filename: output.filename,
                      label: output.label,
                      mimeType: output.mimeType,
                    });
                  }}
                >
                  <span>{output.label}</span>
                  <span className="text-base-content/70 text-sm">{output.mimeType}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-base-content/70">Aucun export n'est encore disponible.</p>
        )}
        {selectedOutput && (
          <div className="resource-preview">
            <div className="resource-preview__header">
              <div>
                <p className="resource-preview__title">{selectedOutput.label}</p>
                <p className="resource-preview__meta text-sm">
                  {selectedOutput.filename}
                  {selectedOutput.mimeType ? ` • ${selectedOutput.mimeType}` : ''}
                </p>
              </div>
              <a
                className="btn btn-secondary btn-sm"
                href={`${API_BASE}/api/assets/${job.id}/${selectedOutput.filename}`}
                target="_blank"
                rel="noreferrer"
              >
                Télécharger
              </a>
            </div>
            {isLoadingOutput && <p className="text-base-content/70">Chargement de l'export…</p>}
            {outputError && <p className="error-text">Impossible de charger l'export : {outputError}</p>}
            {!isLoadingOutput && !outputError && !canPreviewOutput && (
              <p className="text-base-content/70">
                Ce format ne peut pas être prévisualisé. Utilisez le bouton de téléchargement pour le consulter.
              </p>
            )}
            {!isLoadingOutput && !outputError && canPreviewOutput && (
              <pre className="resource-preview__content">{outputContent}</pre>
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
          <ol className="pipeline-stepper pipeline-stepper--compact" aria-label="Chronologie du pipeline">
            {logs.map((entry, index) => {
              const level = typeof entry.level === 'string' ? entry.level.toLowerCase() : 'info';
              const eventDate = new Date(entry.timestamp);
              const timestampLabel = eventDate.toLocaleString();
              return (
                <li
                  key={`${entry.timestamp}-${index}`}
                  className={`pipeline-stepper__item pipeline-stepper__item--${level}`}
                >
                  <span className="pipeline-stepper__index" aria-hidden="true" />
                  <div className="pipeline-stepper__body">
                    <div className="pipeline-stepper__message">{entry.message}</div>
                    <time className="pipeline-stepper__timestamp" dateTime={eventDate.toISOString()}>
                      {timestampLabel}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          !isLoadingLogs && <p className="logs-placeholder">Aucun événement pour le moment.</p>
        )}
      </section>
    </div>
  );
}
