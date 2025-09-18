import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fetchLogs } from '../services/api.js';
import './LogsPanel.css';

function LogsPanel({ jobId, polling }) {
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

  if (!jobId) {
    return null;
  }

  return (
    <section className="logs-panel">
      <header onClick={() => setExpanded((prev) => !prev)}>
        <h3>Logs</h3>
        <button type="button">{expanded ? 'Masquer' : 'Afficher'}</button>
      </header>
      {expanded && (
        <pre>{logs.join('\n')}</pre>
      )}
    </section>
  );
}

LogsPanel.propTypes = {
  jobId: PropTypes.string,
  polling: PropTypes.bool
};

LogsPanel.defaultProps = {
  jobId: null,
  polling: false
};

export default LogsPanel;
