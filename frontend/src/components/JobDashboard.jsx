import React from 'react';
import { useOutletContext } from 'react-router-dom';
import JobList from './JobList.jsx';

export default function JobDashboard() {
  const { jobs, onDeleteJob } = useOutletContext();

  return (
    <section className="history-stack">
      <div className="surface-card space-y-4">
        <div>
          <h2 className="section-title">Historique des traitements</h2>
          <p className="text-base-content/70 text-sm">{jobs.length} traitement(s) enregistré(s)</p>
        </div>
        <JobList jobs={jobs} onDelete={onDeleteJob} />
      </div>
    </section>
  );
}
