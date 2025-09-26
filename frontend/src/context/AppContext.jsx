import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  const refreshJobs = useCallback(async () => {
    try {
      const jobList = await api.listJobs();
      setJobs(jobList);
      setJobsError(null);
      setIsJobsLoading(false);
      return jobList;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Impossible de récupérer les traitements');
      setJobsError(err.message);
      setIsJobsLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    let timeoutId;

    const poll = async () => {
      try {
        await refreshJobs();
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Échec du rafraîchissement des traitements', error);
        }
      } finally {
        if (!isActive) return;
        timeoutId = setTimeout(poll, 4000);
      }
    };

    poll();

    return () => {
      isActive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [refreshJobs]);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      templates,
      setTemplates,
      jobs,
      isJobsLoading,
      jobsError,
      refreshJobs,
    }),
    [config, templates, jobs, isJobsLoading, jobsError, refreshJobs],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return ctx;
}
