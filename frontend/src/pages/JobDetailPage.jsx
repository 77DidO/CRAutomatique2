import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import JobDetail from '../components/JobDetail.jsx';
import { api } from '../api/client.js';

export default function JobDetailPage({ jobsError = null }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setJobError("Aucun traitement sélectionné.");
      setIsLoadingJob(false);
      return undefined;
    }

    let isActive = true;
    let isFetching = false;
    setIsLoadingJob(true);
    setJobError(null);

    const fetchJob = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const details = await api.getJob(jobId);
        if (!isActive) return;
        setJob(details);
      } catch (error) {
        if (!isActive) return;
        const message = error instanceof Error ? error.message : 'Erreur inconnue';
        setJob(null);
        setJobError(`Impossible de charger ce traitement : ${message}`);
      } finally {
        if (isActive) {
          setIsLoadingJob(false);
        }
        isFetching = false;
      }
    };

    fetchJob();
    const intervalId = setInterval(fetchJob, 5000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setLogs([]);
      setIsLoadingLogs(false);
      return undefined;
    }

    let isActive = true;
    let isFetchingLogs = false;

    const fetchLogs = async () => {
      if (isFetchingLogs) return;
      isFetchingLogs = true;
      setIsLoadingLogs(true);
      try {
        const entries = await api.getJobLogs(jobId);
        if (isActive) {
          setLogs(entries);
        }
      } catch (error) {
        if (isActive) {
          const message = error instanceof Error ? error.message : 'Erreur inconnue';
          setLogs([
            {
              message: `Impossible de charger le journal : ${message}`,
              level: 'error',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (isActive) {
          setIsLoadingLogs(false);
        }
        isFetchingLogs = false;
      }
    };

    setLogs([]);
    fetchLogs();
    const intervalId = setInterval(fetchLogs, 5000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [jobId]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => navigate('/historique')}
      >
        ← Retour à l'historique
      </button>
      {jobsError && (
        <div role="alert" className="alert alert--error">
          {jobsError}
        </div>
      )}
      <div className="surface-card">
        {isLoadingJob ? (
          <p className="text-base-content/70">Chargement du traitement…</p>
        ) : jobError ? (
          <div className="space-y-4">
            <p className="text-base-content/70">{jobError}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/historique')}
            >
              Retour à l'historique
            </button>
          </div>
        ) : (
          <JobDetail job={job} logs={logs} isLoadingLogs={isLoadingLogs} />
        )}
      </div>
    </div>
  );
}
