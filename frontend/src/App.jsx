import React, { useEffect, useMemo, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext.jsx';
import { api } from './api/client.js';
import { useInterval } from './hooks/useInterval.js';
import UploadForm from './components/UploadForm.jsx';
import JobDashboard from './components/JobDashboard.jsx';
import ConfigPanel from './components/ConfigPanel.jsx';
import TemplateManager from './components/TemplateManager.jsx';
import './styles/app.css';

const TABS = [
  { id: 'jobs', label: 'Historique' },
  { id: 'config', label: 'Configuration' },
  { id: 'templates', label: 'Gabarits' },
];

function AppShell() {
  const { config, setConfig, templates, setTemplates, jobs, setJobs } = useAppContext();
  const [activeTab, setActiveTab] = useState('jobs');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingJob, setIsCreatingJob] = useState(false);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) || null, [jobs, selectedJobId]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [initialConfig, tpl, jobList] = await Promise.all([
          api.getConfig(),
          api.listTemplates(),
          api.listJobs(),
        ]);
        setConfig(initialConfig);
        setTemplates(tpl);
        setJobs(jobList);
        setSelectedJobId(jobList[0]?.id || null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, [setConfig, setTemplates, setJobs]);

  useInterval(async () => {
    try {
      const jobList = await api.listJobs();
      setJobs(jobList);
      if (selectedJobId && !jobList.some((job) => job.id === selectedJobId)) {
        setSelectedJobId(jobList[0]?.id || null);
      }
    } catch (err) {
      setError(err.message);
    }
  }, 4000);

  const handleUpload = async (payload) => {
    setError(null);
    try {
      const job = await api.createJob(payload);
      const refreshed = await api.listJobs();
      setJobs(refreshed);
      setSelectedJobId(job.id);
      setActiveTab('jobs');
      setIsCreatingJob(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteJob = async (jobId) => {
    setError(null);
    try {
      await api.deleteJob(jobId);
      const refreshed = await api.listJobs();
      setJobs(refreshed);
      if (selectedJobId === jobId) {
        setSelectedJobId(refreshed[0]?.id || null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectJob = (jobId) => {
    setSelectedJobId(jobId);
    setActiveTab('jobs');
    setIsCreatingJob(false);
  };

  const handleSaveConfig = async (nextConfig) => {
    setError(null);
    const updated = await api.updateConfig(nextConfig);
    setConfig(updated);
  };

  const handleCreateTemplate = async (template) => {
    try {
      const created = await api.createTemplate(template);
      setTemplates(await api.listTemplates());
      return created;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleUpdateTemplate = async (id, template) => {
    try {
      await api.updateTemplate(id, template);
      setTemplates(await api.listTemplates());
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteTemplate = async (id) => {
    try {
      await api.deleteTemplate(id);
      setTemplates(await api.listTemplates());
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId !== 'jobs') {
      setIsCreatingJob(false);
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
          <div className="navbar-tabs" role="tablist">
            {TABS.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={[
                    'btn',
                    isActive ? 'btn-primary' : 'btn-secondary',
                    'btn-sm',
                  ].join(' ')}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="navbar-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm btn-with-icon"
              onClick={() => {
                setActiveTab('jobs');
                setIsCreatingJob((prev) => (activeTab === 'jobs' ? !prev : true));
              }}
            >
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 20 20"
                className="btn-with-icon__icon"
              >
                <path
                  d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z"
                  fill="currentColor"
                />
              </svg>
              {isCreatingJob ? 'Fermer' : 'Nouveau traitement'}
            </button>
          </div>
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
          {activeTab === 'jobs' && (
            <>
              {isCreatingJob && <UploadForm templates={templates} onSubmit={handleUpload} />}
              <JobDashboard
                jobs={jobs}
                selectedJob={selectedJob}
                onSelectJob={handleSelectJob}
                onDeleteJob={handleDeleteJob}
              />
            </>
          )}
          {activeTab === 'config' && config && (
            <ConfigPanel config={config} onSave={handleSaveConfig} />
          )}
          {activeTab === 'templates' && (
            <TemplateManager
              templates={templates}
              onCreate={handleCreateTemplate}
              onUpdate={handleUpdateTemplate}
              onDelete={handleDeleteTemplate}
            />
          )}
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
