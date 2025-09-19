import PropTypes from 'prop-types';
const STEP_ORDER = ['queued', 'preconvert', 'transcribe', 'clean', 'summarize', 'done'];

function StatusCard({ job }) {
  if (!job) {
    return (
      <section className="surface-card">
        <p className="text-base-content/70 m-0">Aucun traitement en cours.</p>
      </section>
    );
  }
  const currentIndex = STEP_ORDER.indexOf(job.status);
  const progressValue =
    typeof job.progress === 'number' && Number.isFinite(job.progress)
      ? Math.min(Math.max(job.progress, 0), 100)
      : null;

  const statusStyle = (() => {
    if (job.status === 'error') {
      return { background: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-error)' };
    }
    if (job.status === 'done') {
      return { background: 'rgba(21, 128, 61, 0.12)', color: 'var(--color-success)' };
    }
    return {};
  })();

  return (
    <section className="surface-card status-summary">
      <div className="status-line">
        <div>
          <p className="status-label">Traitement en cours</p>
          <p className="status-value">{job.title || 'Sans titre'}</p>
          <p className="status-message">Gabarit utilisé : {job.template || '—'}</p>
        </div>
        <div className="status-actions">
          <span className="chip" style={statusStyle}>
            {job.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="status-progress">
        <span className="status-progress-value">
          {progressValue !== null ? `${Math.round(progressValue)}%` : 'En cours'}
        </span>
        <div className="progress-bar" aria-hidden={progressValue === null}>
          <div
            className="progress-bar__value"
            style={{ width: `${progressValue !== null ? progressValue : 100}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-sm text-base-content/70 m-0">Étapes</p>
        <ul className="inline-list mt-4">
          {STEP_ORDER.map((step, index) => (
            <li key={step} className={index <= currentIndex ? undefined : 'opacity-70'}>
              {step}
            </li>
          ))}
        </ul>
      </div>

      {job.participants?.length > 0 && (
        <div>
          <p className="text-sm text-base-content/70 m-0">Participants</p>
          <ul className="chip-list mt-4">
            {job.participants.map((participant) => (
              <li key={participant} className="chip">
                {participant}
              </li>
            ))}
          </ul>
        </div>
      )}

      {job.error && (
        <div className="p-4 bg-base-200/60 rounded-xl border border-base-300">
          <p className="error-text m-0">{job.error}</p>
        </div>
      )}

      {job.summary && job.status === 'done' && (
        <div className="prose">
          <h3>Résumé</h3>
          <p>{job.summary.slice(0, 280)}…</p>
        </div>
      )}

      <p className="text-xs text-base-content/70 m-0">Identifiant : {job.id}</p>
    </section>
  );
}

StatusCard.propTypes = {
  job: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string,
    template: PropTypes.string,
    participants: PropTypes.arrayOf(PropTypes.string),
    progress: PropTypes.number,
    summary: PropTypes.string,
    error: PropTypes.string
  })
};

StatusCard.defaultProps = {
  job: null
};

export default StatusCard;
