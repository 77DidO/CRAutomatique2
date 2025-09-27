import React, { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import JobList from './JobList.jsx';

export default function JobDashboard() {
  const { jobs, onDeleteJob } = useOutletContext();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return jobs;
    }

    return jobs.filter((job) => {
      const filename = job.filename?.toLowerCase() ?? '';
      const status = job.status?.toLowerCase() ?? '';
      const participants = Array.isArray(job.participants)
        ? job.participants.join(' ').toLowerCase()
        : '';
      const identifier = String(job.id ?? '').toLowerCase();

      return (
        filename.includes(normalizedQuery) ||
        status.includes(normalizedQuery) ||
        participants.includes(normalizedQuery) ||
        identifier.includes(normalizedQuery)
      );
    });
  }, [jobs, searchQuery]);

  const isFiltering = searchQuery.trim().length > 0;
  const subtitle = isFiltering
    ? `${filteredJobs.length} traitement(s) trouvé(s)`
    : `${jobs.length} traitement(s) enregistré(s)`;
  const emptyMessage = !jobs.length
    ? "Aucun traitement pour le moment."
    : "Aucun traitement ne correspond à votre recherche.";

  return (
    <section className="history-stack">
      <div className="surface-card space-y-6">
        <div className="history-toolbar">
          <div className="history-toolbar-info">
            <h2 className="section-title">Historique des traitements</h2>
            <p className="text-base-content/70 text-sm">{subtitle}</p>
          </div>
          <div className="history-toolbar-actions">
            <label className="sr-only" htmlFor="job-history-search">
              Rechercher dans l'historique des traitements
            </label>
            <input
              id="job-history-search"
              type="search"
              className="input input-sm history-toolbar-search"
              placeholder="Rechercher"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer le filtre"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
        <JobList jobs={filteredJobs} onDelete={onDeleteJob} emptyMessage={emptyMessage} />
      </div>
    </section>
  );
}
