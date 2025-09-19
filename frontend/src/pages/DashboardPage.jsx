import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import UploadForm from '../components/UploadForm.jsx';
import StatusCard from '../components/StatusCard.jsx';
import ResourceList from '../components/ResourceList.jsx';
import LogsPanel from '../components/LogsPanel.jsx';
import DashboardHero from '../components/DashboardHero.jsx';
import usePolling from '../hooks/usePolling.js';
import { fetchItem, fetchItems } from '../services/api.js';

const LOCAL_STORAGE_KEY = 'crautomatique:last-job-id';

function DashboardPage() {
  const [currentJob, setCurrentJob] = useState(null);
  const [jobId, setJobId] = useState(localStorage.getItem(LOCAL_STORAGE_KEY));
  const [heroVariant, setHeroVariant] = useState('banner');

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

  const handleCreated = (job) => {
    setJobId(job.id);
    localStorage.setItem(LOCAL_STORAGE_KEY, job.id);
    setCurrentJob(job);
  };

  const heroSubtitle = useMemo(() => {
    if (heroVariant === 'card') {
      return "Une carte compacte intégrée au tableau de bord pour conserver l'espace aux analyses en cours.";
    }
    return "Une bannière éditoriale qui accueille l'utilisateur et met en avant les actions prioritaires.";
  }, [heroVariant]);

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

  const HERO_VARIANT_OPTIONS = useMemo(
    () => [
      {
        value: 'banner',
        title: 'Bannière immersive',
        description: 'Idéale pour souligner les nouveautés et contextualiser le service.'
      },
      {
        value: 'card',
        title: 'Carte compacte',
        description: 'Se fond dans la grille pour un focus direct sur les traitements.'
      }
    ],
    []
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="dashboard-hero-variant">
        <span className="dashboard-hero-variant__label">Propositions de mise en avant</span>
        <div className="dashboard-hero-variant__options" role="group" aria-label="Sélection du style d'accueil">
          {HERO_VARIANT_OPTIONS.map((option) => {
            const isActive = heroVariant === option.value;
            return (
              <button
                type="button"
                key={option.value}
                className={`dashboard-hero-variant__button${isActive ? ' is-active' : ''}`}
                onClick={() => setHeroVariant(option.value)}
                aria-pressed={isActive}
              >
                <span className="dashboard-hero-variant__button-title">{option.title}</span>
                <span className="dashboard-hero-variant__button-description">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>
      <DashboardHero
        variant={heroVariant}
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
