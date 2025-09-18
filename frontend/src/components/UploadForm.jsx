import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { createItem, fetchTemplates } from '../services/api.js';
import './UploadForm.css';

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

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="file">Fichier audio / vidéo</label>
        <input
          id="file"
          type="file"
          accept="audio/*,video/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </div>
      <div className="field">
        <label htmlFor="title">Titre</label>
        <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nom du traitement" />
      </div>
      <div className="field">
        <label htmlFor="template">Gabarit</label>
        <select id="template" value={template} onChange={(event) => setTemplate(event.target.value)}>
          <option value="">-- Choisir --</option>
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="participants">Participants</label>
        <input
          id="participants"
          value={participants}
          onChange={(event) => setParticipants(event.target.value)}
          placeholder="Liste séparée par des virgules"
        />
        {participants && (
          <ul className="participants-preview">
            {participants
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
              .map((participant) => (
                <li key={participant}>{participant}</li>
              ))}
          </ul>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Traitement en cours...' : 'Lancer le traitement'}
      </button>
    </form>
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
