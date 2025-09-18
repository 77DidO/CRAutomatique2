import PropTypes from 'prop-types';
import './StatusCard.css';

const STEP_ORDER = ['queued', 'preconvert', 'transcribe', 'clean', 'summarize', 'done'];

function StatusCard({ job }) {
  if (!job) {
    return (
      <section className="status-card empty">Aucun traitement en cours.</section>
    );
  }
  const currentIndex = STEP_ORDER.indexOf(job.status);
  return (
    <section className="status-card">
      <header>
        <div>
          <h2>{job.title}</h2>
          <p>
            Gabarit : <strong>{job.template || '—'}</strong>
          </p>
          {job.participants?.length > 0 && (
            <ul className="participants">
              {job.participants.map((participant) => (
                <li key={participant}>{participant}</li>
              ))}
            </ul>
          )}
        </div>
        <div className={`badge ${job.status === 'error' ? 'error' : ''}`}>
          {job.status.toUpperCase()}
        </div>
      </header>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${job.progress || 0}%` }} />
      </div>
      <ol className="steps">
        {STEP_ORDER.map((step, index) => (
          <li key={step} className={index <= currentIndex ? 'done' : ''}>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {job.error && <p className="error-message">{job.error}</p>}
      {job.summary && job.status === 'done' && (
        <article className="summary-preview">
          <h3>Résumé</h3>
          <p>{job.summary.slice(0, 280)}...</p>
        </article>
      )}
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
