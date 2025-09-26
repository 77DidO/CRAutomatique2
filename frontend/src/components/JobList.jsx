import React from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function JobList({ jobs, selectedJob, onSelect }) {
  const handleSelect = (jobId) => {
    if (onSelect) {
      onSelect(jobId);
    }
  };

  if (!jobs.length) {
    return <p className="history-empty">Aucun traitement pour le moment.</p>;
  }

  return (
    <div className="history-table-wrapper">
      <table className="history-table">
        <thead>
          <tr>
            <th scope="col">Fichier</th>
            <th scope="col">Statut</th>
            <th scope="col">Progression</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const isActive = selectedJob?.id === job.id;
            const progressValue = Math.round(job.progress ?? 0);
            return (
              <tr
                key={job.id}
                className={isActive ? 'history-row--active' : undefined}
                role="link"
                tabIndex={0}
                onClick={() => handleSelect(job.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect(job.id);
                  }
                }}
              >
                <td>
                  <div className="font-medium">{job.filename}</div>
                  <div className="text-base-content/70 text-sm">
                    Créé le {new Date(job.createdAt).toLocaleString()}
                    {job.participants?.length ? ` • Participants : ${job.participants.join(', ')}` : ''}
                  </div>
                </td>
                <td>
                  <StatusBadge status={job.status} />
                </td>
                <td>
                  <div className="status-progress" aria-label="Avancement du traitement">
                    <div className="progress-bar" role="presentation">
                      <div className="progress-bar__value" style={{ width: `${progressValue}%` }} />
                    </div>
                    <span className="status-progress-value">{progressValue}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
