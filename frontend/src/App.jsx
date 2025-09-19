import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfigPanel from './components/ConfigPanel.jsx';
import JobDetail from './components/JobDetail.jsx';
import JobList from './components/JobList.jsx';
import TemplateManager from './components/TemplateManager.jsx';
import UploadForm from './components/UploadForm.jsx';
import {
  createJob,
  deleteJob,
  fetchConfig,
  fetchHealth,
  fetchJob,
  fetchJobs,
  fetchTemplates,
  updateConfig,
  createTemplate,
  updateTemplate,
  deleteTemplate as apiDeleteTemplate
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

  const handleTemplateCreate = useCallback(async (payload) => {
    try {
      setErrorMessage(null);
      const created = await createTemplate(payload);
      setTemplates((current) => [...current, created]);
      setStatusMessage(`Gabarit « ${created.name} » ajouté.`);
      return created;
    } catch (error) {
      setErrorMessage(error.message);
      throw error;
    }
  }, []);

  const handleTemplateUpdate = useCallback(async (templateId, payload) => {
    try {
      setErrorMessage(null);
      const updated = await updateTemplate(templateId, payload);
      setTemplates((current) => current.map((tpl) => (tpl.id === updated.id ? updated : tpl)));
      setStatusMessage(`Gabarit « ${updated.name} » mis à jour.`);
      return updated;
    } catch (error) {
      setErrorMessage(error.message);
      throw error;
    }
  }, []);

  const handleTemplateDelete = useCallback(async (templateId) => {
    try {
      setErrorMessage(null);
      await apiDeleteTemplate(templateId);
      setTemplates((current) => current.filter((tpl) => tpl.id !== templateId));
      setStatusMessage('Gabarit supprimé.');
    } catch (error) {
      setErrorMessage(error.message);
      throw error;
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
  const healthStatus = health?.status ?? 'unknown';
  const healthChipStyle =
    healthStatus === 'ok'
      ? undefined
      : healthStatus === 'offline'
        ? { background: 'rgba(220, 38, 38, 0.12)', color: 'var(--color-error)' }
        : { background: 'rgba(246, 139, 30, 0.16)', color: 'var(--color-secondary)' };
  const healthSummaryLabel =
    healthStatus === 'ok' ? 'Opérationnel' : healthStatus === 'offline' ? 'Hors ligne' : 'En attente';
  const healthProgressValue = healthStatus === 'ok' ? 100 : healthStatus === 'offline' ? 0 : 50;

  return (
    <div className="pb-72">
      <header className="navbar">
        <div className="flex items-center gap-3">
          <span className="font-medium text-base-content" style={{ fontSize: '1.05rem' }}>
            CR Automatique
          </span>
          <span className="chip" style={healthChipStyle}>
            {healthSummaryLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-sm ${tab.id === activeTab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="page-container space-y-8">
        <div className="home-header">
          <div>
            <h1 className="page-title">Pilotez vos traitements audio &amp; vidéo</h1>
            <p className="home-subtitle">Pipeline audio &amp; vidéo simulé avec suivi complet.</p>
          </div>
          <div className="surface-card status-summary">
            <div className="status-line">
              <div>
                <p className="status-label">État du backend</p>
                <p className="status-value">{healthSummaryLabel}</p>
                <p className="status-message">{healthLabel}</p>
              </div>
              <div className="status-progress">
                <div className="progress-bar" aria-hidden="true">
                  <div className="progress-bar__value" style={{ width: `${healthProgressValue}%` }} />
                </div>
                <span className="status-progress-value">
                  {healthStatus === 'unknown' ? '—' : `${healthProgressValue}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="surface-card bg-base-200/60">
            <div className="flex items-center justify-between gap-4">
              <p className="m-0 text-green-600">{statusMessage}</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStatusMessage(null)}
                aria-label="Fermer le message de statut"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="surface-card bg-base-200/60">
            <div className="flex items-center justify-between gap-4">
              <p className="m-0 error-text">{errorMessage}</p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setErrorMessage(null)}
                aria-label="Fermer le message d'erreur"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        <main className="space-y-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <section className="surface-card">
                <h2 className="section-title">Créer un nouveau traitement</h2>
                <p className="text-base-content/70 text-sm">
                  Ajoutez un fichier audio ou vidéo pour lancer un nouveau pipeline de transcription et de synthèse.
                </p>
                <UploadForm templates={templates} onSubmit={handleJobCreated} />
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <section className="surface-card">
                  <h2 className="section-title">Derniers traitements</h2>
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
                <section className="surface-card">
                  <h2 className="section-title">Résumé du traitement courant</h2>
                  <JobDetail job={selectedJob} loading={loadingJob} compact />
                </section>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="grid gap-6 md:grid-cols-2">
              <section className="surface-card">
                <div className="status-line">
                  <div>
                    <h2 className="section-title">Historique des traitements</h2>
                    <p className="status-message">
                      Consultez l'ensemble des traitements lancés et reprenez-en un en un clic.
                    </p>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => loadJobs()}>
                    Rafraîchir
                  </button>
                </div>
                <JobList
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onSelect={setSelectedJobId}
                  onDelete={handleDeleteJob}
                />
              </section>
              <section className="surface-card">
                <h2 className="section-title">Détails du traitement</h2>
                <JobDetail job={selectedJob} loading={loadingJob} />
              </section>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="grid gap-6 md:grid-cols-2">
              <section className="surface-card">
                <h2 className="section-title">Configuration du pipeline</h2>
                <ConfigPanel config={config} onSave={handleConfigSave} loading={savingConfig} />
              </section>
              <section className="surface-card">
                <h2 className="section-title">Gabarits &amp; prompts</h2>
                <TemplateManager
                  templates={templates}
                  onCreate={handleTemplateCreate}
                  onUpdate={handleTemplateUpdate}
                  onDelete={handleTemplateDelete}
                />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
