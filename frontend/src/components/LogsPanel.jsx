import { useEffect, useState } from 'react';
import { fetchLogs } from '../services/api.js';

function LogsPanel({ jobId, isActive }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!jobId) {
      setLogs([]);
      return;
    }

    let ignore = false;
    let timer;

    const loadLogs = () => {
      fetchLogs(jobId)
        .then((data) => {
          if (!ignore) {
            setLogs(Array.isArray(data) ? data : []);
          }
        })
        .catch(() => {
          if (!ignore) {
            setLogs([]);
          }
        });
    };

    loadLogs();

    if (isActive) {
      timer = setInterval(loadLogs, 2000);
    }

    return () => {
      ignore = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [jobId, isActive]);

  if (!jobId) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Logs</h2>
      </header>
      <div className="logs-panel">
        {logs.length === 0 ? (
          <p className="empty-placeholder">Aucun log disponible pour le moment.</p>
        ) : (
          <ul>
            {logs.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default LogsPanel;
