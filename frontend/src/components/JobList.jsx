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

export default function JobList({ jobs, selectedJobId, onSelect, onDelete, compact = false }) {
  if (!jobs || jobs.length === 0) {
    return <p className="empty-state">Aucun traitement enregistré pour le moment.</p>;
  }

  return (
    <div className={`job-list ${compact ? 'job-list-compact' : ''}`}>
      {jobs.map((job) => {
        const progressPercent = Math.round((job.progress ?? 0) * 100);
        const status = STATUS_LABELS[job.status] ?? job.status;
        const isSelected = selectedJobId === job.id;

        return (
          <button
            key={job.id}
            type="button"
            className={`job-item ${isSelected ? 'selected' : ''}`}
            onClick={() => onSelect?.(job.id)}
          >
            <div className="job-item-header">
              <div>
                <h3>{job.title}</h3>
                <p className="meta">
                  Créé le {formatDate(job.createdAt)} · Gabarit « {job.template} »
                </p>
              </div>
              <span className={`status-badge status-${job.status}`}>{status}</span>
            </div>

            <div className="job-progress">
              <div className="progress-bar" role="progressbar" aria-valuenow={progressPercent}>
                <div className="progress-inner" style={{ width: `${progressPercent}%` }} />
              </div>
              <span>{progressPercent}%</span>
            </div>

            {!compact && (
              <div className="job-actions">
                <span>Dernière mise à jour : {formatDate(job.updatedAt)}</span>
                <button
                  type="button"
                  className="link danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete?.(job.id);
                  }}
                >
                  Supprimer
                </button>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
