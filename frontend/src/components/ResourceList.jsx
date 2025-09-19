import PropTypes from 'prop-types';
function ResourceList({ resources = [] }) {
  if (!resources?.length) {
    return null;
  }
  return (
    <section className="surface-card">
      <h3 className="section-title">Ressources générées</h3>
      <div className="resource-list">
        {resources.map((resource) => (
          <a
            key={resource.url}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="resource-link"
          >
            <span>{resource.type}</span>
            <span className="resource-link__suffix" aria-hidden>
              ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

ResourceList.propTypes = {
  resources: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string,
      url: PropTypes.string
    })
  )
};

export default ResourceList;
