import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
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
    <section className="surface-card upload-form">
      <h2 className="section-title">Lancer un traitement</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="file" className="form-label text-base-content/70 text-sm">
            Fichier audio / vidéo
          </label>
          <input
            type="file"
            id="file"
            accept="audio/*,video/*"
            className="file-input file-input-bordered"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          {file && <p className="form-helper">{file.name}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="title" className="form-label">
            Titre
          </label>
          <input
            id="title"
            type="text"
            className="input input-bordered"
            value={title}
            placeholder="Nom du traitement"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="template" className="form-label">
            Gabarit
          </label>
          <select
            id="template"
            className="select select-bordered"
            value={template}
            onChange={(event) => setTemplate(event.target.value)}
          >
            <option value="">-- Choisir --</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="participants" className="form-label">
            Participants
          </label>
          <input
            id="participants"
            type="text"
            className="input input-bordered"
            value={participants}
            placeholder="Liste séparée par des virgules"
            onChange={(event) => setParticipants(event.target.value)}
          />
          <p className="form-helper">Séparer les noms par une virgule</p>
          {participantList.length > 0 && (
            <ul className="chip-list mt-4">
              {participantList.map((participant) => (
                <li key={participant} className="chip">
                  {participant}
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="p-4 bg-base-200/60 rounded-xl border border-base-300">
            <div className="flex items-center gap-3">
              <p className="error-text m-0">{error}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError('')}>
                Fermer
              </button>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? 'Traitement en cours…' : 'Lancer le traitement'}
          </button>
        </div>
      </form>
    </section>
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
