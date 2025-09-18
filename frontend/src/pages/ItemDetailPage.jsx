import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ItemTabs from '../components/ItemTabs.jsx';
import { fetchItem } from '../services/api.js';
import './ItemDetailPage.css';

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
  const [summaryHtml, setSummaryHtml] = useState('');

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
        const summaryResource = data.resources?.find((resource) => resource.type === 'summary.html');
        if (summaryResource) {
          fetch(summaryResource.url)
            .then((response) => response.text())
            .then(setSummaryHtml)
            .catch(() => setSummaryHtml(''));
        }
      })
      .catch(() => navigate('/history'));
  }, [id, navigate]);

  const diarization = useMemo(() => computeDiarizationSummary(segments), [segments]);

  if (!item) {
    return <p>Chargement...</p>;
  }

  const renderContent = () => {
    switch (tab) {
      case 'overview':
        return (
          <div className="panel">
            <h2>{item.title}</h2>
            <p>Créé le {new Date(item.createdAt).toLocaleString()}</p>
            <p>Gabarit : {item.template || '—'}</p>
            {summaryHtml ? (
              <article className="markdown" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
            ) : item.summary ? (
              <article className="markdown"><p>{item.summary}</p></article>
            ) : (
              <p>Résumé non disponible.</p>
            )}
            <section className="resources">
              <h3>Téléchargements</h3>
              <ul>
                {item.resources?.map((resource) => (
                  <li key={resource.url}>
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      {resource.type}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        );
      case 'audio': {
        const audioResource = item.resources?.find((resource) => resource.type === item.originalFilename);
        return (
          <div className="panel">
            <h2>Source audio</h2>
            {audioResource ? (
              <audio controls src={audioResource.url} />
            ) : (
              <p>Audio non disponible.</p>
            )}
          </div>
        );
      }
      case 'texts':
        return (
          <div className="panel">
            <h2>Transcriptions</h2>
            <div className="text-columns">
              <section>
                <h3>Brut</h3>
                <iframe title="transcription-brute" src={`/api/assets/${item.id}/transcription_raw.txt`} />
              </section>
              <section>
                <h3>Nettoyé</h3>
                <iframe title="transcription-nettoyee" src={`/api/assets/${item.id}/transcription_clean.txt`} />
              </section>
            </div>
          </div>
        );
      case 'markdown':
        return (
          <div className="panel">
            <h2>Compte rendu Markdown</h2>
            <iframe title="markdown" src={`/api/assets/${item.id}/summary.md`} />
          </div>
        );
      case 'vtt':
        return (
          <div className="panel">
            <h2>Sous-titres WebVTT</h2>
            <iframe title="vtt" src={`/api/assets/${item.id}/subtitles.vtt`} />
          </div>
        );
      default:
        return <p>Onglet inconnu</p>;
    }
  };

  return (
    <div className="item-detail-page">
      <ItemTabs />
      {diarization.length > 0 ? (
        <section className="diarization">
          <h3>Diarisation</h3>
          <ul>
            {diarization.map((entry) => (
              <li key={entry.speaker}>
                <span>{entry.speaker}</span>
                <strong>{entry.duration.toFixed(1)}s</strong>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="diarization-empty">Aucune information de diarisation.</p>
      )}
      {renderContent()}
    </div>
  );
}

export default ItemDetailPage;
