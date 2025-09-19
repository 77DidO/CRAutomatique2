import { useEffect, useMemo, useState } from 'react';

const ACCEPTED_TYPES = '.mp3,.mp4,.wav,.m4a,.aac,.mov,.avi,.mkv,.webm';

export default function UploadForm({ templates, onSubmit }) {
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [participants, setParticipants] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const defaultTemplate = useMemo(() => {
    if (templateId) {
      return templateId;
    }
    if (templates?.length) {
      return templates[0].id;
    }
    return 'default';
  }, [templateId, templates]);

  useEffect(() => {
    if (!templateId && templates?.length) {
      setTemplateId(templates[0].id);
    }
  }, [templateId, templates]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier audio ou vidéo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    if (title.trim()) {
      formData.append('title', title.trim());
    }
    if (defaultTemplate) {
      formData.append('template', defaultTemplate);
    }
    if (participants.trim()) {
      formData.append('participants', participants.trim());
    }

    try {
      await onSubmit(formData);
      setTitle('');
      setParticipants('');
      setFile(null);
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="upload-form space-y-6" onSubmit={handleSubmit}>
      <div className="form-field">
        <label className="form-label" htmlFor="upload-file">
          Fichier à traiter
        </label>
        <input
          id="upload-file"
          name="file"
          className="file-input file-input-bordered"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
          }}
          required
        />
        <p className="form-helper">Formats audio/vidéo courants acceptés (MP3, WAV, MP4, MOV...).</p>
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="upload-title">
          Titre
        </label>
        <input
          id="upload-title"
          name="title"
          className="input input-bordered"
          type="text"
          placeholder="Réunion hebdo, entretien, webinar..."
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="upload-template">
          Gabarit
        </label>
        <select
          id="upload-template"
          name="template"
          className="select select-bordered"
          value={defaultTemplate}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          {(templates ?? []).map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
          {!templates?.length && <option value="default">Gabarit par défaut</option>}
        </select>
        {templateId && (
          <p className="form-helper">
            {(templates ?? []).find((tpl) => tpl.id === templateId)?.description ?? 'Aucun descriptif disponible.'}
          </p>
        )}
      </div>

      <div className="form-field">
        <label className="form-label" htmlFor="upload-participants">
          Participants
        </label>
        <textarea
          id="upload-participants"
          name="participants"
          className="textarea"
          placeholder="Alice, Bob, Charlie"
          value={participants}
          onChange={(event) => setParticipants(event.target.value)}
          rows={3}
        />
        <p className="form-helper">Séparez les noms par des virgules ou collez un tableau JSON.</p>
      </div>

      {error && <p className="error-text text-sm m-0">{error}</p>}

      <button type="submit" className="btn btn-primary btn-md" disabled={submitting}>
        {submitting ? 'Envoi en cours...' : 'Lancer le traitement'}
      </button>
    </form>
  );
}
