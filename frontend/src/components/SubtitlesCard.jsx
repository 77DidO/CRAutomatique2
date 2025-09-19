function SubtitlesCard({ job }) {
  if (!job) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Sous-titres WebVTT</h2>
      </header>
      <iframe title="subtitles" src={`/api/assets/${job.id}/subtitles.vtt`} className="transcription-frame" />
    </section>
  );
}

export default SubtitlesCard;
