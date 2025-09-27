import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE } from '../api/client.js';
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

const PIPELINE_STEPS = [
  {
    key: 'pipeline',
    label: 'Orchestration',
    description: 'États globaux et transitions du pipeline',
  },
  {
    key: 'ingest',
    label: 'Prétraitement audio',
    description: 'Normalisation et préparation des supports audio',
  },
  {
    key: 'transcribe',
    label: 'Transcription',
    description: 'Conversion audio → texte',
  },
  {
    key: 'diarize',
    label: 'Diarisation',
    description: 'Identification des locuteurs',
  },
  {
    key: 'summarise',
    label: 'Synthèse',
    description: 'Génération des résumés automatiques',
  },
  {
    key: 'export',
    label: 'Exports',
    description: 'Production des livrables finaux',
  },
];

const PIPELINE_FALLBACK_STEP = {
  key: 'misc',
  label: 'Divers',
  description: 'Événements généraux ou hors pipeline',
};

const LOG_LEVEL_LABELS = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  warning: 'WARN',
  error: 'ERROR',
};

const KNOWN_LOG_LEVELS = new Set(['info', 'warn', 'error', 'debug']);

export default function JobDetail({ job, logs, isLoadingLogs, onDeleteJob }) {
  const [speakerData, setSpeakerData] = useState(null);
  const [isLoadingSpeakers, setIsLoadingSpeakers] = useState(false);
  const [speakersError, setSpeakersError] = useState(null);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [isLoadingOutput, setIsLoadingOutput] = useState(false);
  const [outputError, setOutputError] = useState(null);
  const [outputContent, setOutputContent] = useState('');
  const [expandedPipelineStep, setExpandedPipelineStep] = useState(
    PIPELINE_STEPS[0]?.key ?? PIPELINE_FALLBACK_STEP.key,
  );
  const hasInteractedWithPipeline = useRef(false);

  const segmentsOutput = job?.outputs?.find((output) => output.filename === 'segments.json');
  const jobId = job?.id ?? null;
  const jobUpdatedAt = job?.updatedAt ?? null;
  const segmentsFilename = segmentsOutput?.filename ?? null;
  const segmentsKey = jobId && segmentsFilename ? `${jobId}:${segmentsFilename}:${jobUpdatedAt}` : null;
  const outputs = useMemo(() => job?.outputs ?? [], [job?.outputs]);
  const selectedOutputFilename = selectedOutput?.filename ?? null;
  const selectedOutputMime = selectedOutput?.mimeType ?? null;
  const canPreviewOutput = selectedOutput ? canPreviewMimeType(selectedOutputMime) : false;
  const pipelineSections = useMemo(() => {
    const safeLogs = Array.isArray(logs) ? logs : [];
    const groups = new Map();
    const knownKeys = new Set([...PIPELINE_STEPS.map((step) => step.key), PIPELINE_FALLBACK_STEP.key]);

    for (const entry of safeLogs) {
      const rawKey =
        typeof entry.pipelineStep === 'string' ? entry.pipelineStep.trim().toLowerCase() : '';
      const key = rawKey && knownKeys.has(rawKey) ? rawKey : PIPELINE_FALLBACK_STEP.key;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(entry);
    }

    const sortEntries = (entries) =>
      [...entries].sort((a, b) => {
        const parsedA = Date.parse(a?.timestamp ?? '');
        const parsedB = Date.parse(b?.timestamp ?? '');
        const timeA = Number.isFinite(parsedA) ? parsedA : 0;
        const timeB = Number.isFinite(parsedB) ? parsedB : 0;
        return timeA - timeB;
      });

    const sections = PIPELINE_STEPS.map((step) => ({
      ...step,
      entries: sortEntries(groups.get(step.key) ?? []),
    }));

    sections.push({
      ...PIPELINE_FALLBACK_STEP,
      entries: sortEntries(groups.get(PIPELINE_FALLBACK_STEP.key) ?? []),
    });

    return sections;
  }, [logs]);
  const hasLogs = pipelineSections.some((section) => section.entries.length > 0);

  useEffect(() => {
    setSelectedOutput(null);
    setIsLoadingOutput(false);
    setOutputError(null);
    setOutputContent('');
  }, [jobId]);

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
    if (!pipelineSections.length) {
      return;
    }

    const currentSection = pipelineSections.find((section) => section.key === expandedPipelineStep);

    if (!currentSection) {
      const fallbackKey = pipelineSections[0]?.key ?? PIPELINE_FALLBACK_STEP.key;
      setExpandedPipelineStep(fallbackKey);
      return;
    }

    if (hasInteractedWithPipeline.current) {
      return;
    }

    if (currentSection.entries.length === 0) {
      const firstWithLogs = pipelineSections.find((section) => section.entries.length > 0);
      if (firstWithLogs && firstWithLogs.key !== expandedPipelineStep) {
        setExpandedPipelineStep(firstWithLogs.key);
      }
    }
  }, [pipelineSections, expandedPipelineStep]);

  useEffect(() => {
    if (!jobId || !selectedOutput) {
      return undefined;
    }

    const controller = new AbortController();
    let isMounted = true;
    const { filename, mimeType } = selectedOutput;

    if (!canPreviewMimeType(mimeType)) {
      setOutputContent('');
      setOutputError(null);
      setIsLoadingOutput(false);
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
        const response = await fetch(`${API_BASE}/api/assets/${jobId}/${segmentsFilename}`, {
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

  const togglePipelineSection = (key) => {
    hasInteractedWithPipeline.current = true;
    setExpandedPipelineStep((current) => (current === key ? current : key));
  };

  const hasSegmentsOutput = job.outputs?.some((output) => output.filename === 'segments.json');
  const progressValue = Math.round(job.progress ?? 0);
  const speakerCount = speakerData?.speakers?.length ?? 0;
  const segmentCount = speakerData?.segments?.length ?? 0;

  return (
    <div className="history-detail">
      <header className="history-detail-header">
        <div className="history-detail-heading">
          <div>
            <h2 className="section-title history-detail-title">{job.filename}</h2>
            <div className="text-base-content/70 text-sm">
              Déclenché le {new Date(job.createdAt).toLocaleString()} • Dernière mise à jour{' '}
              {new Date(job.updatedAt).toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="history-delete-btn btn btn-error btn-sm btn-icon"
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
            <span className="sr-only">Supprimer ce traitement</span>
            <span aria-hidden="true">🗑</span>
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

      <section aria-labelledby="job-speakers" className="space-y-3 history-speakers">
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
        {!isLoadingLogs && !hasLogs && (
          <p className="logs-placeholder">Aucun événement pour le moment.</p>
        )}
        <dl className="pipeline-accordion" aria-label="Journal du pipeline">
          {pipelineSections.map((section) => {
            const isOpen = expandedPipelineStep === section.key;
            const entryCount = section.entries.length;
            const eventLabel =
              entryCount === 0
                ? '0 événement'
                : entryCount === 1
                ? '1 événement'
                : `${entryCount} événements`;
            const panelId = `pipeline-panel-${section.key}`;
            const buttonId = `pipeline-trigger-${section.key}`;

            return (
              <div
                key={section.key}
                className={`pipeline-accordion__item${isOpen ? ' pipeline-accordion__item--open' : ''}`}
              >
                <dt className="pipeline-accordion__summary">
                  <button
                    type="button"
                    className="pipeline-accordion__button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    id={buttonId}
                    onClick={() => togglePipelineSection(section.key)}
                  >
                    <span className="pipeline-accordion__summary-text">
                      <span className="pipeline-accordion__title">{section.label}</span>
                      {section.description ? (
                        <span className="pipeline-accordion__description">{section.description}</span>
                      ) : null}
                    </span>
                    <span className="pipeline-accordion__meta">{eventLabel}</span>
                    <span className="pipeline-accordion__chevron" aria-hidden="true" />
                  </button>
                </dt>
                <dd
                  id={panelId}
                  className="pipeline-accordion__panel"
                  aria-labelledby={buttonId}
                  role="region"
                  hidden={!isOpen}
                >
                  {entryCount ? (
                    <ol className="pipeline-accordion__logs">
                      {section.entries.map((entry, index) => {
                        const normalisedLevel =
                          typeof entry.level === 'string' ? entry.level.toLowerCase() : 'info';
                        const levelKey = normalisedLevel === 'warning' ? 'warn' : normalisedLevel;
                        const safeLevelKey = KNOWN_LOG_LEVELS.has(levelKey) ? levelKey : 'info';
                        const levelLabel =
                          LOG_LEVEL_LABELS[levelKey] ?? LOG_LEVEL_LABELS[safeLevelKey] ?? safeLevelKey.toUpperCase();
                        const timestampLabel = entry.timestamp
                          ? new Date(entry.timestamp).toLocaleTimeString()
                          : '—';
                        return (
                          <li
                            key={`${entry.timestamp}-${index}`}
                            className={`pipeline-accordion__log pipeline-accordion__log--${safeLevelKey}`}
                          >
                            <div className="pipeline-accordion__log-header">
                              <span className="pipeline-accordion__timestamp">{timestampLabel}</span>
                              <span className={`pipeline-accordion__level pipeline-accordion__level--${safeLevelKey}`}>
                                {levelLabel}
                              </span>
                            </div>
                            <p className="pipeline-accordion__message">{entry.message}</p>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="pipeline-accordion__empty">
                      Aucun événement enregistré pour cette étape.
                    </p>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
