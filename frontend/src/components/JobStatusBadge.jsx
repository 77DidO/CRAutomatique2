function getStatusLabel(status) {
  switch (status) {
    case 'queued':
      return "En attente";
    case 'processing':
      return 'En cours';
    case 'done':
      return 'Terminé';
    case 'error':
      return 'Erreur';
    default:
      return status || 'Inconnu';
  }
}

function JobStatusBadge({ status }) {
  return <span className={`job-status job-status--${status || 'unknown'}`}>{getStatusLabel(status)}</span>;
}

export default JobStatusBadge;
