import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import UploadForm from '../components/UploadForm.jsx';
import StatusCard from '../components/StatusCard.jsx';
import ResourceList from '../components/ResourceList.jsx';
import LogsPanel from '../components/LogsPanel.jsx';
import DashboardHero from '../components/DashboardHero.jsx';
import usePolling from '../hooks/usePolling.js';
import { fetchConfig, fetchItem, fetchItems } from '../services/api.js';
import { DEFAULT_DASHBOARD_HERO_SUBTITLE } from '../constants/uiMessages.js';

const LOCAL_STORAGE_KEY = 'crautomatique:last-job-id';

function DashboardPage() {
  const [currentJob, setCurrentJob] = useState(null);
  const [jobId, setJobId] = useState(localStorage.getItem(LOCAL_STORAGE_KEY));
  const [heroSubtitle, setHeroSubtitle] = useState(DEFAULT_DASHBOARD_HERO_SUBTITLE);

  const loadCurrentJob = async () => {
    if (jobId) {
      try {
        const job = await fetchItem(jobId);
        setCurrentJob(job);
        if (job.status === 'done' || job.status === 'error') {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      const jobs = await fetchItems();
      const active = jobs.find((item) => item.status !== 'done' && item.status !== 'error');
      if (active) {
        setJobId(active.id);
      }
    }
  };

  usePolling(() => {
    if (jobId) {
      loadCurrentJob();
    }
  }, jobId ? 2000 : null);

  useEffect(() => {
    if (jobId) {
      loadCurrentJob();
    }
  }, [jobId]);

  useEffect(() => {
    let ignore = false;

    fetchConfig()
      .then((config) => {
        const subtitle = config?.ui?.dashboardHeroSubtitle;
        if (!ignore && typeof subtitle === 'string') {
          const trimmed = subtitle.trim();
          if (trimmed) {
            setHeroSubtitle(trimmed);
          }
        }
      })
      .catch((error) => {
        console.error("Impossible de récupérer la configuration de l'interface.", error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleCreated = (job) => {
    setJobId(job.id);
    localStorage.setItem(LOCAL_STORAGE_KEY, job.id);
    setCurrentJob(job);
  };

  const heroActions = (
    <div className="dashboard-hero__cta">
      <a className="btn btn-primary btn-sm" href="#upload-section">
        Importer un nouveau dossier
      </a>
      <RouterLink className="btn btn-secondary btn-sm" to="/history">
        Consulter l'historique
      </RouterLink>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      <DashboardHero
        subtitle={heroSubtitle}
        actions={heroActions}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div id="upload-section" className="space-y-6">
          <UploadForm
            onCreated={handleCreated}
          />
        </div>
        <div className="space-y-6">
          <StatusCard job={currentJob} />
          <ResourceList resources={currentJob?.resources || []} />
        </div>
      </div>
      <LogsPanel
        jobId={currentJob?.id}
        polling={currentJob && currentJob.status !== 'done' && currentJob.status !== 'error'}
      />
    </div>
  );
}

export default DashboardPage;
