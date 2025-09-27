import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';

export default function JobList({ jobs, onDelete }) {
  const [openMenu, setOpenMenu] = useState({ id: null, dropup: false });
  const menuRefs = useRef(new Map());

  const registerMenuRef = (id) => (node) => {
    if (node) {
      menuRefs.current.set(id, node);
    } else {
      menuRefs.current.delete(id);
    }
  };

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        event.target.closest('.history-row-menu') ||
        event.target.closest('.history-row-menu-trigger')
      ) {
        return;
      }
      setOpenMenu({ id: null, dropup: false });
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useLayoutEffect(() => {
    const menuId = openMenu.id;
    if (!menuId) {
      return;
    }

    const menuElement = menuRefs.current.get(menuId);
    if (!menuElement) {
      return;
    }

    const contentElement = menuElement.querySelector('.history-row-menu__content');
    if (!contentElement) {
      return;
    }

    const rect = contentElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const containerElement =
      menuElement.closest('.surface-card') || menuElement.closest('[data-dropup-container]');
    const containerRect = containerElement?.getBoundingClientRect();
    const bottomLimit = Math.min(viewportHeight, containerRect?.bottom ?? viewportHeight);
    const shouldDropup = rect.bottom > bottomLimit;

    setOpenMenu((current) => {
      if (current.id !== menuId || current.dropup === shouldDropup) {
        return current;
      }
      return { ...current, dropup: shouldDropup };
    });
  }, [openMenu.id]);

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
            const isMenuOpen = openMenu.id === job.id;
            const isDropup = isMenuOpen && openMenu.dropup;
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
                      aria-expanded={isMenuOpen}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenu((current) =>
                          current.id === job.id
                            ? { id: null, dropup: false }
                            : { id: job.id, dropup: false }
                        );
                      }}
                    >
                      <span className="sr-only">Afficher les actions</span>
                      <span aria-hidden="true">⋮</span>
                    </button>
                    {isMenuOpen && (
                      <div
                        className={`history-row-menu__content${
                          isDropup ? ' history-row-menu__content--dropup' : ''
                        }`}
                        role="menu"
                      >
                        <Link
                          to={jobDetailPath}
                          className="history-row-menu__item"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMenu({ id: null, dropup: false });
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
                            setOpenMenu({ id: null, dropup: false });
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
