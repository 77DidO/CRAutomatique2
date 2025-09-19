import PropTypes from 'prop-types';
import MarkdownReport from './MarkdownReport.jsx';
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

  const statusChipClass = (() => {
    if (job.status === 'error') {
      return 'chip chip--error';
    }
    if (job.status === 'done') {
      return 'chip chip--success';
    }
    return 'chip';
  })();

  const summaryResource = job.resources?.find((resource) => resource.type === 'summary.md');

  return (
    <section className="surface-card status-summary">
      <div className="status-line">
        <div>
          <p className="status-label">Traitement en cours</p>
          <p className="status-value">{job.title || 'Sans titre'}</p>
          <p className="status-message">Gabarit utilisé : {job.template || '—'}</p>
        </div>
        <div className="status-actions">
          <span className={statusChipClass}>
            {job.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="status-progress">
        <span className="status-progress-value">
          {progressValue !== null ? `${Math.round(progressValue)}%` : 'En cours'}
        </span>
        <progress
          className="progress progress-primary"
          max="100"
          value={progressValue !== null ? progressValue : undefined}
          aria-label="Progression du traitement"
        />
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

      {job.status === 'done' && (
        <div>
          <h3 className="section-title m-0">Compte rendu</h3>
          {summaryResource ? (
            <MarkdownReport resourceUrl={summaryResource.url} preview />
          ) : job.summary ? (
            <p className="m-0">{job.summary}</p>
          ) : (
            <p className="text-base-content/70 m-0">Le compte rendu est en cours de préparation…</p>
          )}
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
    error: PropTypes.string,
    resources: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.string,
        url: PropTypes.string
      })
    )
  })
};

StatusCard.defaultProps = {
  job: null
};

export default StatusCard;
