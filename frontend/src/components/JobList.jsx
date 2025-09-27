import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';
import useHistoryRowMenu from '../hooks/useHistoryRowMenu.js';

export default function JobList({ jobs, onDelete }) {
  const { registerMenuRef, toggleMenu, closeMenu, isMenuOpen, isDropup } = useHistoryRowMenu();

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
            const progressValue = Math.round(job.progress ?? 0);
            const menuOpen = isMenuOpen(job.id);
            const dropup = isDropup(job.id);
            const jobDetailPath = `/jobs/${job.id}`;
            const isProcessing = job.status === 'queued' || job.status === 'processing';
            return (
              <tr key={job.id}>
                <td>
                  <Link to={jobDetailPath} className="history-row__link">
                    <div className="font-medium">{job.filename}</div>
                    <div className="text-base-content/70 text-sm">
                      Créé le {new Date(job.createdAt).toLocaleString()}
                      {job.participants?.length ? ` • Participants : ${job.participants.join(', ')}` : ''}
                    </div>
                  </Link>
                </td>
                <td>
                  <Link to={jobDetailPath} className="history-row__link history-row__link--inline">
                    <StatusBadge status={job.status} />
                  </Link>
                </td>
                <td>
                  <Link to={jobDetailPath} className="history-row__link history-row__link--inline">
                    <div className="status-progress" aria-label="Avancement du traitement">
                      <div className="progress-bar" role="presentation">
                        <div className="progress-bar__value" style={{ width: `${progressValue}%` }} />
                      </div>
                      <span className="status-progress-value">{progressValue}%</span>
                    </div>
                  </Link>
                </td>
                <td className="history-row-menu-cell">
                  <div className="history-row-menu" ref={registerMenuRef(job.id)}>
                    <button
                      type="button"
                      className="history-row-menu-trigger btn btn-ghost btn-icon"
                      aria-haspopup="true"
                      aria-expanded={menuOpen}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleMenu(job.id);
                      }}
                    >
                      <span className="sr-only">Afficher les actions</span>
                      <span aria-hidden="true">⋮</span>
                    </button>
                    {menuOpen && (
                      <div
                        className={`history-row-menu__content${
                          dropup ? ' history-row-menu__content--dropup' : ''
                        }`}
                        role="menu"
                      >
                        <Link
                          to={jobDetailPath}
                          className="history-row-menu__item"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            closeMenu();
                          }}
                        >
                          Voir le détail
                        </Link>
                        <button
                          type="button"
                          className={`history-row-menu__item history-row-menu__item--danger${
                            isProcessing ? ' is-disabled' : ''
                          }`}
                          role="menuitem"
                          disabled={isProcessing}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isProcessing) {
                              return;
                            }
                            closeMenu();
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
