import React from 'react';
import { useNavigate } from 'react-router-dom';
import JobList from '../components/JobList.jsx';

export default function HistoryListPage({ jobs, isLoading, error, onDeleteJob }) {
  const navigate = useNavigate();

  const handleSelectJob = (jobId) => {
    navigate(`/historique/${jobId}`);
  };

  const subtitle = isLoading
    ? 'Chargement des traitements…'
    : `${jobs.length} traitement(s) enregistré(s)`;

  return (
    <section className="surface-card space-y-4">
      <div>
        <h2 className="section-title">Historique des traitements</h2>
        <p className="text-base-content/70 text-sm">{subtitle}</p>
      </div>
      {error && (
        <div role="alert" className="alert alert--error">
          {error}
        </div>
      )}
      {isLoading ? (
        <p className="text-base-content/70">Chargement en cours…</p>
      ) : (
        <JobList jobs={jobs} selectedJob={null} onSelect={handleSelectJob} onDelete={onDeleteJob} />
      )}
    </section>
  );
}
