const STATUS_LABELS = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échec'
};

function formatDate(value) {
  if (!value) {
    return '—';
  }
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    return value;
  }
}

function StepList({ steps }) {
  if (!steps?.length) {
    return <p className="text-base-content/70 text-sm m-0">Aucune étape enregistrée.</p>;
  }

  return (
    <div className="diarization-segment-list">
      {steps.map((step) => (
        <div key={step.id} className="diarization-segment">
          <div className="diarization-segment__header">
            <span className="diarization-segment__speaker">{step.label}</span>
            <span className="diarization-segment__time">
              {STATUS_LABELS[step.status] ?? step.status}
            </span>
          </div>
          <p className="diarization-segment__text">
            {step.startedAt && `Début : ${formatDate(step.startedAt)}`}
            {step.finishedAt && ` · Fin : ${formatDate(step.finishedAt)}`}
          </p>
        </div>
      ))}
    </div>
  );
}

function formatDuration(start, end) {
  if (!start) {
    return null;
  }

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return null;
  }

  const diff = Math.max(0, endTime - startTime);
  const totalSeconds = Math.round(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours} h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }
  if (hours === 0 && seconds > 0) {
    parts.push(`${seconds} s`);
  }

  return parts.length > 0 ? parts.join(' ') : "moins d'une seconde";
}

function LogList({ logs, compact }) {
  if (!logs?.length) {
    return <p className="text-base-content/70 text-sm m-0">Aucun log disponible.</p>;
  }

  const entries = compact ? logs.slice(-4) : logs;

  return (
    <div className="logs-text whitespace-pre-wrap">
      {entries.map((entry, index) => (
        <p key={`${entry.timestamp ?? index}-${entry.message}`} className="m-0">
          <span className="text-xs text-base-content/70">{formatDate(entry.timestamp)} — </span>
          {entry.message}
        </p>
      ))}
    </div>
  );
}

export default function JobDetail({ job, loading, compact = false }) {
  if (loading && !job) {
    return <p className="text-base-content/70">Chargement du traitement…</p>;
  }

  if (!job) {
    return <p className="text-base-content/70 text-sm">Sélectionnez un traitement pour afficher ses détails.</p>;
  }

  const progressPercent = Math.round((job.progress ?? 0) * 100);
  const participants = job.participants?.length ? job.participants.join(', ') : '—';
  const firstStepStart = job.steps?.find((step) => step.startedAt)?.startedAt ?? job.createdAt;
  const finishedAt = job.completedAt ?? job.updatedAt;
  const completedDuration =
    job.status === 'completed' || job.status === 'failed'
      ? formatDuration(firstStepStart, finishedAt)
      : null;
  const inProgressDuration =
    job.status === 'processing' || job.status === 'queued'
      ? formatDuration(firstStepStart, null)
      : null;

  let summaryIcon = '⏳';
  let summaryTitle = 'Traitement en cours';
  let summaryDescription =
    inProgressDuration
      ? `Durée écoulée : ${inProgressDuration}.`
      : "En attente de démarrage du pipeline.";

  if (job.status === 'completed') {
    summaryIcon = '✅';
    summaryTitle = 'Traitement terminé';
    summaryDescription = completedDuration
      ? `Durée totale : ${completedDuration}.`
      : `Clôturé le ${formatDate(job.completedAt ?? job.updatedAt)}.`;
  } else if (job.status === 'failed') {
    summaryIcon = '⚠️';
    summaryTitle = 'Traitement en échec';
    summaryDescription = `Dernière mise à jour : ${formatDate(job.updatedAt)}.`;
  } else if (job.status === 'queued') {
    summaryIcon = '🗂️';
    summaryTitle = 'Traitement en attente';
  }

  return (
    <div className={`result-card ${compact ? 'space-y-6' : 'space-y-8'}`}>
      <div className="result-summary" role="status">
        <span className="result-summary__icon" aria-hidden="true">
          {summaryIcon}
        </span>
        <div className="result-summary__text">
          <p className="result-summary__title">{summaryTitle}</p>
          <p className="result-summary__subtitle">{summaryDescription}</p>
        </div>
      </div>
      <div className="status-line">
        <div>
          <p className="status-label">Traitement sélectionné</p>
          <h3 className="section-title m-0">{job.title}</h3>
          <p className="text-xs text-base-content/70 m-0">Créé le {formatDate(job.createdAt)}</p>
          <p className="text-xs text-base-content/70 m-0">Dernière mise à jour : {formatDate(job.updatedAt)}</p>
        </div>
        <div className="status-progress">
          <div className="progress-bar" role="progressbar" aria-valuenow={progressPercent}>
            <div className="progress-bar__value" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="status-progress-value">{progressPercent}%</span>
        </div>
      </div>

      <div className="status-meta">
        <div>
          <dt>Gabarit</dt>
          <dd>{job.template ?? '—'}</dd>
        </div>
        <div>
          <dt>Participants</dt>
          <dd>{participants}</dd>
        </div>
        <div>
          <dt>Statut</dt>
          <dd>{STATUS_LABELS[job.status] ?? job.status}</dd>
        </div>
        <div>
          <dt>Fichier source</dt>
          <dd>
            {job.source ? (
              <a href={job.source.url} target="_blank" rel="noreferrer" className="link">
                {job.source.originalName}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </div>

      {!compact && (
        <section className="space-y-6">
          <h4 className="section-title">Étapes du pipeline</h4>
          <StepList steps={job.steps} />
        </section>
      )}

      <section className="space-y-6">
        <h4 className="section-title">Exports disponibles</h4>
        {job.outputs?.length ? (
          <div className="resource-list">
            {job.outputs.map((output) => (
              <a
                key={output.filename}
                className="resource-link"
                href={output.url}
                target="_blank"
                rel="noreferrer"
              >
                <span>{output.label ?? output.filename}</span>
                <span className="text-xs text-base-content/70">{output.mimeType}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-base-content/70 text-sm m-0">Aucun export généré pour l'instant.</p>
        )}
      </section>

      <section className="space-y-6">
        <h4 className="section-title">Journal</h4>
        <LogList logs={job.logs} compact={compact} />
      </section>
    </div>
  );
}
