import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import JobDetail from '../components/JobDetail.jsx';
import { api } from '../api/client.js';
import { useAppContext } from '../context/AppContext.jsx';

function findJobById(jobs, id) {
  return jobs.find((item) => String(item.id) === String(id)) ?? null;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jobs, setJobs } = useAppContext();
  const { onDeleteJob } = useOutletContext();
  const [job, setJob] = useState(() => findJobById(jobs, id));
  const [isLoadingJob, setIsLoadingJob] = useState(() => !findJobById(jobs, id));
  const [jobError, setJobError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const jobId = job ? job.id : id;

  useEffect(() => {
    const existing = findJobById(jobs, id);
    if (existing) {
      setJob(existing);
      setIsLoadingJob(false);
      setJobError(null);
    } else if (!isLoadingJob && !jobError) {
      setJob(null);
      setJobError("Ce traitement n'est plus disponible.");
    }
  }, [jobs, id, isLoadingJob, jobError]);

  useEffect(() => {
    if (findJobById(jobs, id)) {
      return undefined;
    }
    let isMounted = true;
    setIsLoadingJob(true);
    setJobError(null);

    async function fetchJob() {
      try {
        const jobData = await api.getJob(id);
        if (!isMounted) return;
        setJob(jobData);
        setJobs((current) => {
          const hasJob = current.some((item) => String(item.id) === String(jobData.id));
          if (hasJob) {
            return current.map((item) => (String(item.id) === String(jobData.id) ? jobData : item));
          }
          return [jobData, ...current];
        });
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Impossible de charger ce traitement.";
          setJobError(message);
          setJob(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingJob(false);
        }
      }
    }

    fetchJob();

    return () => {
      isMounted = false;
    };
  }, [id, jobs, setJobs]);

  useEffect(() => {
    if (!jobId || !job) {
      setLogs([]);
      setIsLoadingLogs(false);
      return undefined;
    }

    let isMounted = true;
    let initialFetch = true;

    async function fetchLogs() {
      if (initialFetch) {
        setIsLoadingLogs(true);
      }
      try {
        const entries = await api.getJobLogs(jobId);
        if (isMounted) {
          setLogs(entries);
        }
      } catch (error) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "Impossible de charger les logs.";
          setLogs([
            {
              message,
              level: 'error',
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } finally {
        if (isMounted && initialFetch) {
          setIsLoadingLogs(false);
          initialFetch = false;
        }
      }
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [jobId, job]);

  const handleDeleteAndReturn = async (jobToDelete) => {
    try {
      await onDeleteJob?.(jobToDelete);
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : "La suppression a échoué.";
      setJobError(message);
    }
  };

  return (
    <section className="history-stack">
      <div className="surface-card history-detail-card">
        <div className="history-detail-toolbar">
          <Link to="/" className="btn btn-secondary btn-sm">
            Retour à l'historique
          </Link>
        </div>
        {isLoadingJob ? (
          <p className="text-base-content/70">Chargement du traitement…</p>
        ) : jobError ? (
          <div className="space-y-4">
            <div role="alert" className="alert alert--error">
              {jobError}
            </div>
            <p className="text-base-content/70">
              Utilisez le bouton ci-dessus pour revenir à l'historique des traitements.
            </p>
          </div>
        ) : (
          <JobDetail job={job} logs={logs} isLoadingLogs={isLoadingLogs} onDeleteJob={handleDeleteAndReturn} />
        )}
      </div>
    </section>
  );
}
