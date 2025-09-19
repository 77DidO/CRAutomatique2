import { Link } from 'react-router-dom';
import JobStatusBadge from './JobStatusBadge.jsx';

function formatDate(value) {
  if (!value) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

function JobList({ jobs }) {
  if (!jobs?.length) {
    return <p className="empty-placeholder">Aucun compte rendu enregistré pour le moment.</p>;
  }

  return (
    <table className="job-table">
      <thead>
        <tr>
          <th>Titre</th>
          <th>Statut</th>
          <th>Modèle</th>
          <th>Créé le</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id}>
            <td>
              <Link to={`/jobs/${job.id}`} className="job-table__link">
                {job.title}
              </Link>
            </td>
            <td>
              <JobStatusBadge status={job.status} />
            </td>
            <td>{job.template || '—'}</td>
            <td>{formatDate(job.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default JobList;
