function ResourceList({ resources = [] }) {
  if (!resources.length) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Ressources</h2>
      </header>
      <ul className="resource-list">
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

export default ResourceList;
