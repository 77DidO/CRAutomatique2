import PropTypes from 'prop-types';
import './ResourceList.css';

function ResourceList({ resources }) {
  if (!resources?.length) {
    return null;
  }
  return (
    <section className="resource-list">
      <h3>Ressources générées</h3>
      <ul>
        {resources.map((resource) => (
          <li key={resource.url}>
            <a href={resource.url} target="_blank" rel="noreferrer">
              {resource.type}
            </a>
          </li>
        ))}
      </ul>
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

ResourceList.defaultProps = {
  resources: []
};

export default ResourceList;
