import MarkdownViewer from './MarkdownViewer.jsx';

function SummaryCard({ job }) {
  const markdownResource = job?.resources?.find((resource) => resource.type === 'summary.md');

  if (!job) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Résumé</h2>
      </header>
      {markdownResource ? (
        <MarkdownViewer url={markdownResource.url} />
      ) : job.summary ? (
        <p>{job.summary}</p>
      ) : (
        <p className="empty-placeholder">Le résumé n'est pas encore disponible.</p>
      )}
    </section>
  );
}

export default SummaryCard;
