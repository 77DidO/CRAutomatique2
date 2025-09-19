import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Badge, Button, Card, Form, Stack } from 'react-bootstrap';
import { createItem, fetchTemplates } from '../services/api.js';

function UploadForm({ onCreated, defaultTemplate, defaultParticipants }) {
  const [file, setFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [template, setTemplate] = useState(defaultTemplate);
  const [participants, setParticipants] = useState(defaultParticipants.join(', '));
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  useEffect(() => {
    setTemplate(defaultTemplate);
  }, [defaultTemplate]);

  useEffect(() => {
    setParticipants(defaultParticipants.join(', '));
  }, [defaultParticipants]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier audio ou vidéo.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('template', template || '');
      formData.append('participants', participants);
      formData.append('title', title);
      const job = await createItem(formData);
      onCreated(job);
      setFile(null);
      setTitle('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const participantList = useMemo(
    () =>
      participants
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    [participants]
  );

  return (
    <Card className="w-100 shadow-sm border-0 flex-fill">
      <Card.Body>
        <Form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
          <div>
            <Form.Label className="text-uppercase text-muted small">Fichier audio / vidéo</Form.Label>
            <Form.Control
              type="file"
              id="file"
              accept="audio/*,video/*"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            {file && <div className="text-muted small mt-1">{file.name}</div>}
          </div>

          <Form.Group controlId="title">
            <Form.Label>Titre</Form.Label>
            <Form.Control
              type="text"
              value={title}
              placeholder="Nom du traitement"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Form.Group>

          <Form.Group controlId="template">
            <Form.Label>Gabarit</Form.Label>
            <Form.Select value={template} onChange={(event) => setTemplate(event.target.value)}>
              <option value="">-- Choisir --</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group controlId="participants">
            <Form.Label>Participants</Form.Label>
            <Form.Control
              type="text"
              value={participants}
              placeholder="Liste séparée par des virgules"
              onChange={(event) => setParticipants(event.target.value)}
            />
            {participantList.length > 0 && (
              <Stack direction="horizontal" gap={2} className="flex-wrap mt-2">
                {participantList.map((participant) => (
                  <Badge key={participant} bg="info" text="dark" pill>
                    {participant}
                  </Badge>
                ))}
              </Stack>
            )}
          </Form.Group>

          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}

          <div className="d-grid">
            <Button type="submit" disabled={loading} size="lg">
              {loading ? 'Traitement en cours...' : 'Lancer le traitement'}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

UploadForm.propTypes = {
  onCreated: PropTypes.func.isRequired,
  defaultTemplate: PropTypes.string,
  defaultParticipants: PropTypes.arrayOf(PropTypes.string)
};

UploadForm.defaultProps = {
  defaultTemplate: '',
  defaultParticipants: []
};

export default UploadForm;
