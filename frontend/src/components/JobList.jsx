import React from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function JobList({ jobs, selectedJob, onSelect, onDelete }) {
  if (!jobs.length) {
    return <p>Aucun traitement pour le moment.</p>;
  }

  return (
    <div className="list">
      {jobs.map((job) => (
        <article key={job.id} className={['list-item', selectedJob?.id === job.id ? 'active' : ''].join(' ')}>
          <div>
            <div className="job-header">
              <h3>{job.filename}</h3>
              <StatusBadge status={job.status} />
            </div>
            <p className="job-meta">Créé le {new Date(job.createdAt).toLocaleString()}</p>
            <div className="job-progress" aria-label="Avancement du traitement">
              <div className="job-progress-bar" style={{ width: `${job.progress ?? 0}%` }} />
            </div>
            {job.participants?.length > 0 && (
              <p className="job-participants">Participants : {job.participants.join(', ')}</p>
            )}
          </div>
          <div className="job-actions">
            <button className="button secondary" type="button" onClick={() => onSelect(job.id)}>
              Consulter
            </button>
            <button className="button danger" type="button" onClick={() => onDelete(job.id)}>
              Supprimer
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
