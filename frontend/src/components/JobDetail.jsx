import React from 'react';
import StatusBadge from './StatusBadge.jsx';

export default function JobDetail({ job, logs, isLoadingLogs }) {
  if (!job) {
    return <p>Sélectionnez un traitement pour afficher les détails.</p>;
  }

  return (
    <div className="job-detail">
      <header className="job-detail-header">
        <div>
          <h2 className="section-title">
            {job.filename}
            <StatusBadge status={job.status} />
          </h2>
          <p className="job-meta">
            Déclenché le {new Date(job.createdAt).toLocaleString()} • Dernière mise à jour {new Date(job.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="job-progress large">
          <div className="job-progress-bar" style={{ width: `${job.progress ?? 0}%` }} />
        </div>
      </header>

      <section aria-labelledby="job-outputs">
        <h3 id="job-outputs">Exports disponibles</h3>
        {job.outputs?.length ? (
          <div className="asset-list">
            {job.outputs.map((output) => (
              <a
                key={output.filename}
                className="asset-link"
                href={`/api/assets/${job.id}/${output.filename}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>{output.label}</span>
                <span className="asset-meta">{output.mimeType}</span>
              </a>
            ))}
          </div>
        ) : (
          <p>Aucun export n'est encore disponible.</p>
        )}
      </section>

      <section aria-labelledby="job-logs">
        <h3 id="job-logs">Journal du pipeline</h3>
        {isLoadingLogs && <p>Chargement des logs…</p>}
        <div className="logs">
          {logs.map((entry, index) => (
            <div key={`${entry.timestamp}-${index}`} className="log-entry">
              <div className="meta">
                {new Date(entry.timestamp).toLocaleTimeString()} • {entry.level?.toUpperCase()}
              </div>
              <div>{entry.message}</div>
            </div>
          ))}
          {!logs.length && <p>Aucun événement pour le moment.</p>}
        </div>
      </section>
    </div>
  );
}
