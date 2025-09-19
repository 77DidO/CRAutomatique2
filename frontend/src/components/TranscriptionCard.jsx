function TranscriptionCard({ job }) {
  if (!job) {
    return null;
  }

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Transcriptions</h2>
      </header>
      <div className="transcription-grid">
        <div>
          <h3>Brut</h3>
          <iframe
            title="transcription-brute"
            src={`/api/assets/${job.id}/transcription_raw.txt`}
            className="transcription-frame"
          />
        </div>
        <div>
          <h3>Nettoyé</h3>
          <iframe
            title="transcription-nettoyee"
            src={`/api/assets/${job.id}/transcription_clean.txt`}
            className="transcription-frame"
          />
        </div>
      </div>
    </section>
  );
}

export default TranscriptionCard;
