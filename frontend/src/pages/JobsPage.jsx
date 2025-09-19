import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JobStatusBadge from '../components/JobStatusBadge.jsx';
import { deleteItem, fetchItems } from '../services/api.js';

function formatDate(value) {
  if (!value) {
    return '—';
  }
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) {
    return value;
  }
  return new Date(time).toLocaleString();
}

function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadJobs = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchItems()
      .then((items) => {
        const sorted = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setJobs(sorted);
      })
      .catch(() => {
        setError('Impossible de récupérer la liste des comptes rendus.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDelete = async (job) => {
    if (!window.confirm(`Supprimer le compte rendu "${job.title}" ?`)) {
      return;
    }
    try {
      await deleteItem(job.id);
      loadJobs();
    } catch (deleteError) {
      alert('Suppression impossible.');
    }
  };

  return (
    <div className="page">
      <h1>Historique des comptes rendus</h1>
      <div className="card">
        <header className="card__header">
          <h2 className="card__title">Tous les traitements</h2>
          <button type="button" className="btn" onClick={loadJobs} disabled={isLoading}>
            Actualiser
          </button>
        </header>
        {error && <p className="form__error">{error}</p>}
        {isLoading ? (
          <p>Chargement…</p>
        ) : jobs.length === 0 ? (
          <p className="empty-placeholder">Aucun traitement enregistré.</p>
        ) : (
          <table className="job-table job-table--full">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Statut</th>
                <th>Modèle</th>
                <th>Créé le</th>
                <th />
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
                  <td>
                    <button type="button" className="btn btn-danger btn-ghost" onClick={() => handleDelete(job)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default JobsPage;
