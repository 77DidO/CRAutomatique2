function AudioCard({ job }) {
  if (!job) {
    return null;
  }
  const resource = job.resources?.find((item) => item.type === job.originalFilename);

  if (!resource) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Audio original</h2>
      </header>
      <audio className="audio-player" controls src={resource.url} />
    </section>
  );
}

export default AudioCard;
