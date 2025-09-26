import React, { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext.jsx';
import { api } from './api/client.js';
import UploadForm from './components/UploadForm.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import TemplateManager from './components/TemplateManager.jsx';
import HistoryListPage from './pages/HistoryListPage.jsx';
import JobDetailPage from './pages/JobDetailPage.jsx';
import './styles/app.css';

const NAV_ITEMS = [
  { id: 'upload', label: 'Nouveau traitement', to: '/' },
  { id: 'history', label: 'Historique', to: '/historique' },
  { id: 'config', label: 'Configuration', to: '/configuration' },
  { id: 'templates', label: 'Gabarits', to: '/gabarits' },
];

function AppShell() {
  const {
    config,
    setConfig,
    templates,
    setTemplates,
    jobs,
    isJobsLoading,
    jobsError,
    refreshJobs,
  } = useAppContext();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const [initialConfig, tpl] = await Promise.all([
          api.getConfig(),
          api.listTemplates(),
        ]);
        if (!isMounted) {
          return;
        }
        setConfig(initialConfig);
        setTemplates(tpl);
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [setConfig, setTemplates]);

  const handleUpload = async (payload) => {
    setError(null);
    try {
      const job = await api.createJob(payload);
      await refreshJobs();
      navigate(`/historique/${job.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  };

  const handleDeleteJob = async (jobId) => {
    setError(null);
    try {
      await api.deleteJob(jobId);
      await refreshJobs();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  const handleSaveConfig = async (nextConfig) => {
    setError(null);
    try {
      const updated = await api.updateConfig(nextConfig);
      setConfig(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  };

  const handleCreateTemplate = async (template) => {
    setError(null);
    try {
      const created = await api.createTemplate(template);
      setTemplates(await api.listTemplates());
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  };

  const handleUpdateTemplate = async (id, template) => {
    setError(null);
    try {
      await api.updateTemplate(id, template);
      setTemplates(await api.listTemplates());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  };

  const handleDeleteTemplate = async (id) => {
    setError(null);
    try {
      await api.deleteTemplate(id);
      setTemplates(await api.listTemplates());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  return (
    <div className="app-shell page-container pb-48">
      <header className="home-header">
        <div>
          <h1 className="page-title">CR Automatique</h1>
          <p className="home-subtitle">Traitement audio local avec résumés assistés OpenAI</p>
        </div>
        <nav className="navbar" aria-label="Navigation principale">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'btn',
                  isActive ? 'btn-primary' : 'btn-secondary',
                  'btn-sm',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {error && (
        <div role="alert" className="alert alert--error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="surface-card">
          <p className="text-base-content/70">Chargement en cours…</p>
        </div>
      ) : (
        <main className="space-y-8">
          <Routes>
            <Route
              path="/"
              element={<UploadForm templates={templates} onSubmit={handleUpload} />}
            />
            <Route
              path="/historique"
              element={(
                <HistoryListPage
                  jobs={jobs}
                  isLoading={isJobsLoading}
                  error={jobsError}
                  onDeleteJob={handleDeleteJob}
                />
              )}
            />
            <Route path="/historique/:jobId" element={<JobDetailPage jobsError={jobsError} />} />
            <Route
              path="/configuration"
              element={
                config ? (
                  <ConfigPanel config={config} onSave={handleSaveConfig} />
                ) : (
                  <div className="surface-card">
                    <p className="text-base-content/70">
                      Configuration indisponible. Veuillez réessayer plus tard.
                    </p>
                  </div>
                )
              }
            />
            <Route
              path="/gabarits"
              element={(
                <TemplateManager
                  templates={templates}
                  onCreate={handleCreateTemplate}
                  onUpdate={handleUpdateTemplate}
                  onDelete={handleDeleteTemplate}
                />
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
