import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Col, Row, Stack } from 'react-bootstrap';
import ItemTabs from '../components/ItemTabs.jsx';
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
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Stack gap={3}>
                <div>
                  <h4 className="mb-1">{item.title}</h4>
                  <div className="text-muted small">Créé le {new Date(item.createdAt).toLocaleString()}</div>
                  <div className="text-muted small">Gabarit : {item.template || '—'}</div>
                </div>
                {summaryHtml ? (
                  <div
                    className="border rounded-4 p-3"
                    dangerouslySetInnerHTML={{ __html: summaryHtml }}
                  />
                ) : item.summary ? (
                  <p className="mb-0">{item.summary}</p>
                ) : (
                  <p className="mb-0 text-muted">Résumé non disponible.</p>
                )}
                {item.resources?.length > 0 && (
                  <div>
                    <h6>Téléchargements</h6>
                    <Stack direction="horizontal" gap={2} className="flex-wrap">
                      {item.resources.map((resource) => (
                        <Button
                          key={resource.url}
                          as="a"
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          variant="outline-primary"
                        >
                          {resource.type}
                        </Button>
                      ))}
                    </Stack>
                  </div>
                )}
              </Stack>
            </Card.Body>
          </Card>
        );
      case 'audio': {
        const audioResource = item.resources?.find((resource) => resource.type === item.originalFilename);
        return (
          <Card className="shadow-sm border-0">
            <Card.Body className="d-flex flex-column gap-3">
              <h4 className="mb-0">Source audio</h4>
              {audioResource ? (
                <audio controls src={audioResource.url} className="w-100" />
              ) : (
                <p className="mb-0 text-muted">Audio non disponible.</p>
              )}
            </Card.Body>
          </Card>
        );
      }
      case 'texts':
        return (
          <Card className="shadow-sm border-0">
            <Card.Body className="d-flex flex-column gap-3">
              <h4 className="mb-0">Transcriptions</h4>
              <Row className="g-3">
                <Col xs={12} md={6}>
                  <Stack gap={2}>
                    <h6 className="mb-0">Brut</h6>
                    <iframe
                      title="transcription-brute"
                      src={`/api/assets/${item.id}/transcription_raw.txt`}
                      className="w-100 rounded-4 border"
                      style={{ minHeight: 260 }}
                    />
                  </Stack>
                </Col>
                <Col xs={12} md={6}>
                  <Stack gap={2}>
                    <h6 className="mb-0">Nettoyé</h6>
                    <iframe
                      title="transcription-nettoyee"
                      src={`/api/assets/${item.id}/transcription_clean.txt`}
                      className="w-100 rounded-4 border"
                      style={{ minHeight: 260 }}
                    />
                  </Stack>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        );
      case 'markdown':
        return (
          <Card className="shadow-sm border-0">
            <Card.Body className="d-flex flex-column gap-3">
              <h4 className="mb-0">Compte rendu Markdown</h4>
              <iframe
                title="markdown"
                src={`/api/assets/${item.id}/summary.md`}
                className="w-100 rounded-4 border"
                style={{ minHeight: 260 }}
              />
            </Card.Body>
          </Card>
        );
      case 'vtt':
        return (
          <Card className="shadow-sm border-0">
            <Card.Body className="d-flex flex-column gap-3">
              <h4 className="mb-0">Sous-titres WebVTT</h4>
              <iframe
                title="vtt"
                src={`/api/assets/${item.id}/subtitles.vtt`}
                className="w-100 rounded-4 border"
                style={{ minHeight: 260 }}
              />
            </Card.Body>
          </Card>
        );
      default:
        return <p>Onglet inconnu</p>;
    }
  };

  return (
    <Stack gap={3}>
      <ItemTabs />
      {diarization.length > 0 ? (
        <Card className="shadow-sm border-0">
          <Card.Body className="d-flex flex-column gap-3">
            <h5 className="mb-0">Diarisation</h5>
            <Stack gap={2}>
              {diarization.map((entry) => (
                <div
                  key={entry.speaker}
                  className="d-flex justify-content-between align-items-center border rounded-4 px-3 py-2"
                >
                  <span className="fw-semibold">{entry.speaker}</span>
                  <span className="text-muted">{entry.duration.toFixed(1)}s</span>
                </div>
              ))}
            </Stack>
          </Card.Body>
        </Card>
      ) : (
        <p className="text-muted">Aucune information de diarisation.</p>
      )}
      {renderContent()}
    </Stack>
  );
}

export default ItemDetailPage;
