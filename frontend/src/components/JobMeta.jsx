import JobStatusBadge from './JobStatusBadge.jsx';

function formatDate(value) {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString();
}

function JobMeta({ job }) {
  if (!job) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Informations</h2>
      </header>
      <dl className="job-meta">
        <div>
          <dt>Titre</dt>
          <dd>{job.title}</dd>
        </div>
        <div>
          <dt>Statut</dt>
          <dd>
            <JobStatusBadge status={job.status} />
          </dd>
        </div>
        <div>
          <dt>Modèle</dt>
          <dd>{job.template || '—'}</dd>
        </div>
        <div>
          <dt>Créé le</dt>
          <dd>{formatDate(job.createdAt)}</dd>
        </div>
        <div>
          <dt>Mis à jour</dt>
          <dd>{formatDate(job.updatedAt)}</dd>
        </div>
        <div>
          <dt>Participants</dt>
          <dd>{job.participants?.length ? job.participants.join(', ') : '—'}</dd>
        </div>
      </dl>
    </section>
  );
}

export default JobMeta;
