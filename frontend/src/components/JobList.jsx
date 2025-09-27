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
                          className="history-row-menu__item history-row-menu__item--danger btn btn-error btn-with-icon"
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
                          <svg
                            aria-hidden="true"
                            focusable="false"
                            viewBox="0 0 20 20"
                            className="btn-with-icon__icon"
                          >
                            <path
                              d="M7 2.5A1.5 1.5 0 0 1 8.5 1h3A1.5 1.5 0 0 1 13 2.5V3h3.5a.75.75 0 0 1 0 1.5h-.638l-.74 10.013A2.25 2.25 0 0 1 12.88 16.5H7.12a2.25 2.25 0 0 1-1.742-.987L4.638 4.5H4a.75.75 0 0 1 0-1.5H7V2.5Zm1.5-.25a.25.25 0 0 0-.25.25V3h3.5v-.5a.25.25 0 0 0-.25-.25h-3Zm4.37 4.25a.75.75 0 0 1 1.495.11l-.427 6a.75.75 0 0 1-1.497-.107l.43-6.003Zm-4.508-.64a.75.75 0 0 1 .858.624l.73 6a.75.75 0 0 1-1.49.182l-.73-6a.75.75 0 0 1 .632-.806ZM6.03 6.36a.75.75 0 0 1 1.494.214l-.43 6.003a.75.75 0 0 1-1.496-.107l.432-6.11ZM6.25 4.5l-.33 4.66-.311 4.202a.75.75 0 0 0 .581.79c.417.09.846.135 1.276.135h5.004c.43 0 .859-.045 1.276-.135a.75.75 0 0 0 .58-.79l-.64-8.862H6.25Z"
                              fill="currentColor"
                            />
                          </svg>
                          <span>Supprimer</span>
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
