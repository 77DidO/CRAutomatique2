import React from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function JobList({ jobs, selectedJob, onSelect, onDelete }) {
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
            <th scope="col" className="text-right">
              Actions
            </th>
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
                onClick={() => onSelect(job.id)}
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
                <td>
                  <div className="history-table-actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelect(job.id);
                      }}
                    >
                      Consulter
                    </button>
                    <button
                      type="button"
                      className="btn btn-error btn-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(job.id);
                      }}
                    >
                      Supprimer
                    </button>
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
