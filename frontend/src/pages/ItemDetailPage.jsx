import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ItemTabs from '../components/ItemTabs.jsx';
import MarkdownReport from '../components/MarkdownReport.jsx';
import { fetchItem } from '../services/api.js';

function computeDiarizationSummary(segments = []) {
  const map = new Map();
  segments.forEach((segment) => {
    const duration = (segment.end - segment.start) || 0;
    map.set(segment.speaker, (map.get(segment.speaker) || 0) + duration);
  });
  return Array.from(map.entries()).map(([speaker, duration]) => ({ speaker, duration }));
}

function ItemDetailPage() {
  const { id, tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [segments, setSegments] = useState([]);

  useEffect(() => {
    fetchItem(id)
      .then((data) => {
        setItem(data);
        const segmentResource = data.resources?.find((resource) => resource.type === 'segments.json');
        if (segmentResource) {
          fetch(segmentResource.url)
            .then((response) => response.json())
            .then(setSegments)
            .catch(() => setSegments([]));
        }
      })
      .catch(() => navigate('/history'));
  }, [id, navigate]);

  const diarization = useMemo(() => computeDiarizationSummary(segments), [segments]);

  if (!item) {
    return <p>Chargement...</p>;
  }

  const summaryResource = item.resources?.find((resource) => resource.type === 'summary.md');

  const renderContent = () => {
    switch (tab) {
      case 'overview':
        return (
          <section className="surface-card result-card">
            <div>
              <h2 className="section-title m-0">{item.title}</h2>
              <p className="text-sm text-base-content/70 m-0 mt-4">
                Créé le {new Date(item.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-base-content/70 m-0">Gabarit : {item.template || '—'}</p>
            </div>
            {summaryResource ? (
              <MarkdownReport resourceUrl={summaryResource.url} preview />
            ) : item.summary ? (
              <p className="m-0">{item.summary}</p>
            ) : (
              <p className="text-base-content/70 m-0">Résumé non disponible.</p>
            )}
            {item.resources?.length > 0 && (
              <div>
                <h3 className="section-title">Téléchargements</h3>
                <div className="resource-list">
                  {item.resources.map((resource) => (
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
              </div>
            )}
          </section>
        );
      case 'audio': {
        const audioResource = item.resources?.find((resource) => resource.type === item.originalFilename);
        return (
          <section className="surface-card result-card">
            <h2 className="section-title m-0">Source audio</h2>
            {audioResource ? (
              <audio controls src={audioResource.url} className="audio-player" />
            ) : (
              <p className="text-base-content/70 m-0">Audio non disponible.</p>
            )}
          </section>
        );
      }
      case 'texts':
        return (
          <section className="surface-card result-card">
            <h2 className="section-title m-0">Transcriptions</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                <h3 className="section-title m-0">Brut</h3>
                <iframe
                  title="transcription-brute"
                  src={`/api/assets/${item.id}/transcription_raw.txt`}
                  className="w-full rounded-xl border border-base-300 embed-frame"
                />
              </div>
              <div className="space-y-6">
                <h3 className="section-title m-0">Nettoyé</h3>
                <iframe
                  title="transcription-nettoyee"
                  src={`/api/assets/${item.id}/transcription_clean.txt`}
                  className="w-full rounded-xl border border-base-300 embed-frame"
                />
              </div>
            </div>
          </section>
        );
      case 'markdown':
        return (
          <section className="surface-card result-card">
            <h2 className="section-title m-0">Compte rendu Markdown</h2>
            {summaryResource ? (
              <MarkdownReport resourceUrl={summaryResource.url} />
            ) : (
              <p className="text-base-content/70 m-0">Fichier summary.md non disponible.</p>
            )}
          </section>
        );
      case 'vtt':
        return (
          <section className="surface-card result-card">
            <h2 className="section-title m-0">Sous-titres WebVTT</h2>
            <iframe
              title="vtt"
              src={`/api/assets/${item.id}/subtitles.vtt`}
              className="w-full rounded-xl border border-base-300 embed-frame"
            />
          </section>
        );
      default:
        return <p>Onglet inconnu</p>;
    }
  };

  const totalDuration = diarization.reduce((acc, entry) => acc + entry.duration, 0);

  return (
    <div className="space-y-6 pb-48">
      <ItemTabs />
      {diarization.length > 0 ? (
        <div className="diarization-summary">
          {diarization.map((entry) => {
            const percentage = totalDuration ? ((entry.duration / totalDuration) * 100).toFixed(1) : null;
            return (
              <div key={entry.speaker} className="diarization-card">
                <p className="diarization-card__title">{entry.speaker}</p>
                <p className="diarization-card__metric">{entry.duration.toFixed(1)} s</p>
                {percentage && <p className="diarization-card__meta">{percentage}% du temps</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-base-content/70">Aucune information de diarisation.</p>
      )}
      {renderContent()}
    </div>
  );
}

export default ItemDetailPage;
