import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfigPanel from './components/ConfigPanel.jsx';
import JobDetail from './components/JobDetail.jsx';
import JobList from './components/JobList.jsx';
import UploadForm from './components/UploadForm.jsx';
import {
  createJob,
  deleteJob,
  fetchConfig,
  fetchHealth,
  fetchJob,
  fetchJobs,
  fetchTemplates,
  updateConfig
} from './services/api.js';

const REFRESH_INTERVAL = 4000;

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'history', label: 'Historique' },
  { id: 'config', label: 'Configuration' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [health, setHealth] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [config, setConfig] = useState(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const loadHealth = useCallback(async () => {
    try {
      const status = await fetchHealth();
      setHealth(status);
    } catch (error) {
      setHealth({ status: 'offline', details: error.message });
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const data = await fetchTemplates();
      setTemplates(data);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const data = await fetchConfig();
      setConfig(data);
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const data = await fetchJobs();
      setJobs(data);
      if (data.length > 0 && !selectedJobId) {
        setSelectedJobId(data[0].id);
      }
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, [selectedJobId]);

  const refreshSelectedJob = useCallback(async (jobId) => {
    if (!jobId) {
      setSelectedJob(null);
      return;
    }

    setLoadingJob(true);
    try {
      const job = await fetchJob(jobId);
      setSelectedJob(job);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoadingJob(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    loadTemplates();
    loadConfig();
    loadJobs();
  }, [loadHealth, loadTemplates, loadConfig, loadJobs]);

  useEffect(() => {
    refreshSelectedJob(selectedJobId);
  }, [refreshSelectedJob, selectedJobId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadJobs();
      if (selectedJobId) {
        refreshSelectedJob(selectedJobId);
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadJobs, refreshSelectedJob, selectedJobId]);

  const handleJobCreated = useCallback(async (formData) => {
    try {
      setErrorMessage(null);
      const job = await createJob(formData);
      setStatusMessage(`Traitement « ${job.title} » démarré.`);
      setSelectedJobId(job.id);
      await loadJobs();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, [loadJobs]);

  const handleDeleteJob = useCallback(async (jobId) => {
    try {
      setErrorMessage(null);
      await deleteJob(jobId);
      setStatusMessage('Traitement supprimé.');
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setSelectedJob(null);
      }
      await loadJobs();
    } catch (error) {
      setErrorMessage(error.message);
    }
  }, [loadJobs, selectedJobId]);

  const handleConfigSave = useCallback(async (nextConfig) => {
    try {
      setSavingConfig(true);
      setErrorMessage(null);
      const saved = await updateConfig(nextConfig);
      setConfig(saved);
      setStatusMessage('Configuration enregistrée.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSavingConfig(false);
    }
  }, []);

  const healthLabel = useMemo(() => {
    if (!health) {
      return '—';
    }
    if (health.status === 'ok') {
      return 'API opérationnelle';
    }
    if (health.status === 'offline') {
      return `API indisponible : ${health.details}`;
    }
    return JSON.stringify(health);
  }, [health]);

  const latestJobs = useMemo(() => jobs.slice(0, 5), [jobs]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>CR Automatique</h1>
          <p className="subtitle">Pipeline audio &amp; vidéo simulé avec suivi complet.</p>
        </div>
        <div className="health-indicator" data-status={health?.status ?? 'unknown'}>
          <span className="dot" />
          <span>{healthLabel}</span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {statusMessage && (
        <div className="banner success" role="status">
          {statusMessage}
          <button type="button" onClick={() => setStatusMessage(null)} aria-label="Fermer">×</button>
        </div>
      )}

      {errorMessage && (
        <div className="banner error" role="alert">
          {errorMessage}
          <button type="button" onClick={() => setErrorMessage(null)} aria-label="Fermer">×</button>
        </div>
      )}

      <main className="app-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-grid">
            <section className="card">
              <h2>Créer un nouveau traitement</h2>
              <UploadForm templates={templates} onSubmit={handleJobCreated} />
            </section>
            <section className="card">
              <h2>Derniers traitements</h2>
              <JobList
                jobs={latestJobs}
                selectedJobId={selectedJobId}
                onSelect={(jobId) => {
                  setSelectedJobId(jobId);
                  setActiveTab('history');
                }}
                onDelete={handleDeleteJob}
                compact
              />
            </section>
            <section className="card">
              <h2>Résumé du traitement courant</h2>
              <JobDetail job={selectedJob} loading={loadingJob} compact />
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-grid">
            <section className="card">
              <div className="card-header">
                <h2>Historique des traitements</h2>
                <button type="button" onClick={() => loadJobs()}>Rafraîchir</button>
              </div>
              <JobList
                jobs={jobs}
                selectedJobId={selectedJobId}
                onSelect={setSelectedJobId}
                onDelete={handleDeleteJob}
              />
            </section>
            <section className="card">
              <h2>Détails du traitement</h2>
              <JobDetail job={selectedJob} loading={loadingJob} />
            </section>
          </div>
        )}

        {activeTab === 'config' && (
          <section className="card">
            <h2>Configuration du pipeline</h2>
            <ConfigPanel
              config={config}
              onSave={handleConfigSave}
              loading={savingConfig}
            />
          </section>
        )}
      </main>
    </div>
  );
}
