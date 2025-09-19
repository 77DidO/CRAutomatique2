import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadCard from '../components/UploadCard.jsx';
import JobList from '../components/JobList.jsx';
import JobStatusBadge from '../components/JobStatusBadge.jsx';
import LogsPanel from '../components/LogsPanel.jsx';
import { fetchConfig, fetchItems } from '../services/api.js';

function sortJobs(items) {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function DashboardPage() {
  const [config, setConfig] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const navigate = useNavigate();

  const loadConfig = useCallback(() => {
    fetchConfig()
      .then(setConfig)
      .catch(() => {
        setConfig(null);
      });
  }, []);

  const loadJobs = useCallback(() => {
    setIsLoadingJobs(true);
    fetchItems()
      .then((items) => {
        setJobs(sortJobs(items));
      })
      .catch(() => {
        setJobs([]);
      })
      .finally(() => {
        setIsLoadingJobs(false);
      });
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, 5000);
    return () => clearInterval(timer);
  }, [loadJobs]);

  const activeJob = useMemo(
    () => jobs.find((job) => job.status !== 'done' && job.status !== 'error'),
    [jobs]
  );

  const latestJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  const handleCreated = (job) => {
    loadJobs();
    if (job?.id) {
      navigate(`/jobs/${job.id}`);
    }
  };

  return (
    <div className="page">
      <h1>Tableau de bord</h1>
      <div className="grid grid--responsive">
        <UploadCard
          templates={config?.templates || []}
          defaultTemplate={config?.defaultTemplate}
          onCreated={handleCreated}
        />
        <section className="card">
          <header className="card__header">
            <h2 className="card__title">Traitement en cours</h2>
          </header>
          {activeJob ? (
            <div className="active-job">
              <h3>{activeJob.title}</h3>
              <p>
                Statut : <JobStatusBadge status={activeJob.status} />
              </p>
              <p>Modèle : {activeJob.template || '—'}</p>
              <button className="btn" type="button" onClick={() => navigate(`/jobs/${activeJob.id}`)}>
                Ouvrir le détail
              </button>
            </div>
          ) : (
            <p className="empty-placeholder">Aucun traitement en cours.</p>
          )}
        </section>
      </div>

      <LogsPanel
        jobId={activeJob?.id}
        isActive={Boolean(activeJob && activeJob.status !== 'done' && activeJob.status !== 'error')}
      />

      <section className="card">
        <header className="card__header">
          <h2 className="card__title">Derniers comptes rendus</h2>
        </header>
        {isLoadingJobs && !latestJobs.length ? <p>Chargement…</p> : <JobList jobs={latestJobs} />}
      </section>
    </div>
  );
}

export default DashboardPage;
