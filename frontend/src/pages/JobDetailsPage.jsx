import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AudioCard from '../components/AudioCard.jsx';
import DiarizationCard from '../components/DiarizationCard.jsx';
import JobMeta from '../components/JobMeta.jsx';
import LogsPanel from '../components/LogsPanel.jsx';
import ResourceList from '../components/ResourceList.jsx';
import SubtitlesCard from '../components/SubtitlesCard.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import TranscriptionCard from '../components/TranscriptionCard.jsx';
import JobStatusBadge from '../components/JobStatusBadge.jsx';
import { deleteItem, fetchItem } from '../services/api.js';

function JobDetailsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadJob = useCallback(
    (showSpinner = false) => {
      if (!jobId) {
        return;
      }
      if (showSpinner) {
        setIsLoading(true);
      }
      setError(null);
      fetchItem(jobId)
        .then((data) => {
          setJob(data);
        })
        .catch(() => {
          setError('Compte rendu introuvable.');
          setJob(null);
        })
        .finally(() => {
          if (showSpinner) {
            setIsLoading(false);
          }
        });
    },
    [jobId]
  );

  useEffect(() => {
    loadJob(true);
  }, [loadJob]);

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') {
      return undefined;
    }
    const timer = setInterval(() => loadJob(false), 4000);
    return () => clearInterval(timer);
  }, [job, loadJob]);

  const handleDelete = async () => {
    if (!job) {
      return;
    }
    if (!window.confirm(`Supprimer le compte rendu "${job.title}" ?`)) {
      return;
    }
    try {
      await deleteItem(job.id);
      navigate('/jobs');
    } catch (deleteError) {
      alert('Suppression impossible.');
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <p>Chargement…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <p className="form__error">{error}</p>
        <button className="btn" type="button" onClick={() => navigate('/jobs')}>
          Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>{job.title}</h1>
          <p className="page__subtitle">
            Statut : <JobStatusBadge status={job.status} />
          </p>
        </div>
        <div className="page__actions">
          <button className="btn" type="button" onClick={() => loadJob(true)}>
            Actualiser
          </button>
          <button className="btn btn-danger" type="button" onClick={handleDelete}>
            Supprimer
          </button>
        </div>
      </header>

      <div className="grid grid--two-columns">
        <JobMeta job={job} />
        <ResourceList resources={job.resources} />
      </div>

      <SummaryCard job={job} />
      <DiarizationCard job={job} />
      <TranscriptionCard job={job} />
      <AudioCard job={job} />
      <SubtitlesCard job={job} />

      <LogsPanel
        jobId={job.id}
        isActive={job.status !== 'done' && job.status !== 'error'}
      />
    </div>
  );
}

export default JobDetailsPage;
