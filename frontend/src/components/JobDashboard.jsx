import React, { useEffect, useState } from 'react';
import JobList from './JobList.jsx';
import JobDetail from './JobDetail.jsx';
import { api } from '../api/client.js';

export default function JobDashboard({ jobs, selectedJob, onSelectJob }) {
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!selectedJob) {
      setLogs([]);
      return () => {
        isMounted = false;
      };
    }
    async function fetchLogs() {
      setIsLoadingLogs(true);
      try {
        const entries = await api.getJobLogs(selectedJob.id);
        if (isMounted) setLogs(entries);
      } catch (error) {
        if (isMounted) setLogs([{ message: error.message, level: 'error', timestamp: new Date().toISOString() }]);
      } finally {
        if (isMounted) setIsLoadingLogs(false);
      }
    }
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedJob]);

  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="surface-card space-y-4">
        <div>
          <h2 className="section-title">Historique des traitements</h2>
          <p className="text-base-content/70 text-sm">{jobs.length} traitement(s) enregistré(s)</p>
        </div>
        <JobList jobs={jobs} selectedJob={selectedJob} onSelect={onSelectJob} />
      </div>
      <div className="surface-card">
        <JobDetail job={selectedJob} logs={logs} isLoadingLogs={isLoadingLogs} />
      </div>
    </section>
  );
}
