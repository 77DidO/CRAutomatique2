import React, { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function JobList({ jobs, selectedJob, onSelect, onDelete }) {
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        event.target.closest('.history-row-menu') ||
        event.target.closest('.history-row-menu-trigger')
      ) {
        return;
      }
      setOpenMenuId(null);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

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
            <th scope="col" className="history-row-menu-header">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const isActive = selectedJob?.id === job.id;
            const progressValue = Math.round(job.progress ?? 0);
            const isMenuOpen = openMenuId === job.id;
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
                <td className="history-row-menu-cell">
                  <div className="history-row-menu">
                    <button
                      type="button"
                      className="history-row-menu-trigger btn btn-ghost btn-icon"
                      aria-haspopup="true"
                      aria-expanded={isMenuOpen}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuId((current) => (current === job.id ? null : job.id));
                      }}
                    >
                      <span className="sr-only">Afficher les actions</span>
                      <span aria-hidden="true">⋮</span>
                    </button>
                    {isMenuOpen && (
                      <div className="history-row-menu__content" role="menu">
                        <button
                          type="button"
                          className="history-row-menu__item"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId(null);
                            onSelect(job.id);
                          }}
                        >
                          Voir le détail
                        </button>
                        <button
                          type="button"
                          className="history-row-menu__item history-row-menu__item--danger"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenuId(null);
                            if (
                              window.confirm(
                                'Voulez-vous vraiment supprimer ce traitement ? Cette action est irréversible.'
                              )
                            ) {
                              onDelete(job.id);
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
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
