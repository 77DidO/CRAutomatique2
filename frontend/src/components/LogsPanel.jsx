import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchLogs } from '../services/api.js';

function LogsPanel({ jobId = null, polling = false }) {
  const [logs, setLogs] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchLogs(jobId);
        if (!cancelled) {
          setLogs(data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    load();
    if (!polling) {
      return () => {
        cancelled = true;
      };
    }
    const id = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [jobId, polling]);

  useEffect(() => {
    if (!jobId) {
      setLogs([]);
      setExpanded(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (logs.length && !expanded) {
      setExpanded(true);
    }
  }, [logs, expanded]);

  if (!jobId) {
    return null;
  }

  const hasLogs = logs.length > 0;

  return (
    <div className="logs-panel">
      <div className="logs-header">
        <h3 className="section-title m-0">Journal d&apos;exécution</h3>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      <div className={`logs-content ${expanded ? '' : 'logs-content--hidden'}`}>
        {hasLogs ? (
          <pre className="logs-text">{logs.join('\n')}</pre>
        ) : (
          <p className="logs-placeholder">En attente de logs…</p>
        )}
      </div>
    </div>
  );
}

LogsPanel.propTypes = {
  jobId: PropTypes.string,
  polling: PropTypes.bool
};

export default LogsPanel;
