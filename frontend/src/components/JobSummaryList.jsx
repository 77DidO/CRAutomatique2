import { useMemo } from 'react';

const STATUS_LABELS = {
  queued: 'En attente',
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échec'
};

const STATUS_ICONS = {
  queued: '🗂️',
  processing: '⏳',
  completed: '✅',
  failed: '⚠️'
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

function formatDuration(start, end, status) {
  if (!start) {
    return '—';
  }

  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : Date.now();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return '—';
  }

  if (!end && (status === 'processing' || status === 'queued')) {
    return 'En cours…';
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

  return parts.length > 0 ? parts.join(' ') : 'moins d\'une seconde';
}

export default function JobSummaryList({ jobs }) {
  const summaries = useMemo(() => {
    if (!Array.isArray(jobs)) {
      return [];
    }

    return jobs.slice(0, 4).map((job) => {
      const firstStepStart = job.steps?.find((step) => step.startedAt)?.startedAt ?? job.createdAt;
      const finishedAt =
        job.status === 'completed' || job.status === 'failed'
          ? job.completedAt ?? job.updatedAt
          : null;

      return {
        id: job.id,
        title: job.title,
        template: job.template,
        status: job.status,
        statusLabel: STATUS_LABELS[job.status] ?? job.status,
        icon: STATUS_ICONS[job.status] ?? '📄',
        startedAt: firstStepStart,
        completedAt: job.completedAt,
        updatedAt: job.updatedAt,
        durationLabel: formatDuration(firstStepStart, finishedAt, job.status),
        participants: Array.isArray(job.participants) && job.participants.length > 0
          ? job.participants.join(', ')
          : '—'
      };
    });
  }, [jobs]);

  if (summaries.length === 0) {
    return <p className="text-base-content/70 text-sm m-0">Aucun traitement enregistré pour le moment.</p>;
  }

  return (
    <div className="summary-grid">
      {summaries.map((summary) => (
        <article key={summary.id} className="summary-card" aria-label={`Résumé du traitement ${summary.title}`}>
          <div className="summary-header">
            <span className="summary-icon" aria-hidden="true">{summary.icon}</span>
            <div>
              <p className="summary-title">{summary.title}</p>
              <p className="summary-subtitle">Démarré le {formatDate(summary.startedAt)}</p>
            </div>
          </div>
          <dl className="summary-meta">
            <div>
              <dt>Statut</dt>
              <dd>
                <span className="chip" style={summary.status === 'failed'
                  ? { background: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-error)' }
                  : summary.status === 'processing'
                    ? { background: 'rgba(246, 139, 30, 0.12)', color: 'var(--color-secondary)' }
                    : undefined
                }
                >
                  {summary.statusLabel}
                </span>
              </dd>
            </div>
            <div>
              <dt>Durée</dt>
              <dd>{summary.durationLabel}</dd>
            </div>
            <div>
              <dt>Gabarit</dt>
              <dd>{summary.template ?? '—'}</dd>
            </div>
            <div>
              <dt>Participants</dt>
              <dd>{summary.participants}</dd>
            </div>
          </dl>
          <p className="summary-footer">
            Dernière mise à jour : {formatDate(summary.updatedAt)}
          </p>
        </article>
      ))}
    </div>
  );
}
