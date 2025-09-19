import { useEffect, useMemo, useState } from 'react';
import UploadForm from '../components/UploadForm.jsx';
import StatusCard from '../components/StatusCard.jsx';
import ResourceList from '../components/ResourceList.jsx';
import LogsPanel from '../components/LogsPanel.jsx';
import usePolling from '../hooks/usePolling.js';
import { fetchConfig, fetchItem, fetchItems } from '../services/api.js';

const LOCAL_STORAGE_KEY = 'crautomatique:last-job-id';

function DashboardPage() {
  const [config, setConfig] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobId, setJobId] = useState(localStorage.getItem(LOCAL_STORAGE_KEY));

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

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

  const defaultParticipants = useMemo(() => currentJob?.participants || config?.participants || [], [config, currentJob]);

  const handleCreated = (job) => {
    setJobId(job.id);
    localStorage.setItem(LOCAL_STORAGE_KEY, job.id);
    setCurrentJob(job);
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <UploadForm
            onCreated={handleCreated}
            defaultTemplate={config?.defaultTemplate || ''}
            defaultParticipants={defaultParticipants}
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
