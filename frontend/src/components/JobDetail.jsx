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
    return <p className="empty-state">Aucune étape enregistrée.</p>;
  }

  return (
    <ol className="step-list">
      {steps.map((step) => (
        <li key={step.id} className={`step-item status-${step.status}`}>
          <div>
            <strong>{step.label}</strong>
            <p className="meta">
              {step.startedAt && `Début : ${formatDate(step.startedAt)}`}
              {step.finishedAt && ` · Fin : ${formatDate(step.finishedAt)}`}
            </p>
          </div>
          <span className="status-badge status-pill">{STATUS_LABELS[step.status] ?? step.status}</span>
        </li>
      ))}
    </ol>
  );
}

function LogList({ logs, compact }) {
  if (!logs?.length) {
    return <p className="empty-state">Aucun log disponible.</p>;
  }

  const entries = compact ? logs.slice(-4) : logs;

  return (
    <ul className="log-list">
      {entries.map((entry, index) => (
        <li key={`${entry.timestamp ?? index}-${entry.message}`}> 
          <span className="meta">{formatDate(entry.timestamp)}</span>
          <span>{entry.message}</span>
        </li>
      ))}
    </ul>
  );
}

export default function JobDetail({ job, loading, compact = false }) {
  if (loading && !job) {
    return <p>Chargement du traitement…</p>;
  }

  if (!job) {
    return <p className="empty-state">Sélectionnez un traitement pour afficher ses détails.</p>;
  }

  const progressPercent = Math.round((job.progress ?? 0) * 100);
  const participants = job.participants?.length ? job.participants.join(', ') : '—';

  return (
    <div className={`job-detail ${compact ? 'job-detail-compact' : ''}`}>
      <div className="detail-grid">
        <div>
          <h3>{job.title}</h3>
          <p className="meta">Créé le {formatDate(job.createdAt)}</p>
          <p className="meta">Mise à jour : {formatDate(job.updatedAt)}</p>
        </div>
        <div className="detail-status">
          <span className={`status-badge status-${job.status}`}>{STATUS_LABELS[job.status] ?? job.status}</span>
          <div className="progress-bar" role="progressbar" aria-valuenow={progressPercent}>
            <div className="progress-inner" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="meta">{progressPercent}%</span>
        </div>
      </div>

      <dl className="detail-overview">
        <div>
          <dt>Gabarit</dt>
          <dd>{job.template ?? '—'}</dd>
        </div>
        <div>
          <dt>Participants</dt>
          <dd>{participants}</dd>
        </div>
        <div>
          <dt>Fichier source</dt>
          <dd>
            {job.source ? (
              <a href={job.source.url} target="_blank" rel="noreferrer">{job.source.originalName}</a>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {!compact && (
        <section>
          <h4>Étapes du pipeline</h4>
          <StepList steps={job.steps} />
        </section>
      )}

      <section>
        <h4>Exports disponibles</h4>
        {job.outputs?.length ? (
          <ul className="asset-list">
            {job.outputs.map((output) => (
              <li key={output.filename}>
                <a href={output.url} target="_blank" rel="noreferrer">
                  {output.label ?? output.filename}
                </a>
                <span className="meta">{output.mimeType}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">Aucun export généré pour l'instant.</p>
        )}
      </section>

      <section>
        <h4>Journal</h4>
        <LogList logs={job.logs} compact={compact} />
      </section>
    </div>
  );
}
