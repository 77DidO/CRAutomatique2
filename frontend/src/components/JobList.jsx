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
    return (
      <p className="text-base-content/70 text-sm m-0">
        Aucun traitement enregistré pour le moment.
      </p>
    );
  }

  return (
    <div className="history-table-wrapper">
      <table className="history-table">
        <thead>
          <tr>
            <th>Traitement</th>
            <th>Progression</th>
            <th>Statut</th>
            {!compact && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const progressPercent = Math.round((job.progress ?? 0) * 100);
            const status = STATUS_LABELS[job.status] ?? job.status;
            const isSelected = selectedJobId === job.id;

            return (
              <tr
                key={job.id}
                className={isSelected ? 'history-row--active' : undefined}
                onClick={() => onSelect?.(job.id)}
              >
                <td>
                  <p className="m-0 font-medium text-base-content">{job.title}</p>
                  <p className="m-0 text-xs text-base-content/70">
                    Gabarit « {job.template ?? '—'} »
                  </p>
                  <p className="m-0 text-xs text-base-content/70">
                    Créé le {formatDate(job.createdAt)} · Mise à jour {formatDate(job.updatedAt)}
                  </p>
                </td>
                <td>
                  <div className="status-progress">
                    <div className="progress-bar" role="progressbar" aria-valuenow={progressPercent}>
                      <div className="progress-bar__value" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="status-progress-value">{progressPercent}%</span>
                  </div>
                </td>
                <td>
                  <span
                    className="chip"
                    style={
                      job.status === 'failed'
                        ? { background: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-error)' }
                        : job.status === 'processing'
                          ? { background: 'rgba(246, 139, 30, 0.12)', color: 'var(--color-secondary)' }
                          : undefined
                    }
                  >
                    {status}
                  </span>
                </td>
                {!compact && (
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn btn-error btn-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete?.(job.id);
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
