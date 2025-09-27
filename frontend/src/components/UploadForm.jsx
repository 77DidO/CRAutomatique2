import React, { useEffect, useMemo, useState } from 'react';

export default function UploadForm({ templates, onSubmit }) {
  const [file, setFile] = useState(null);
  const [participants, setParticipants] = useState('');
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const templateOptions = useMemo(() => templates.map((tpl) => ({ value: tpl.id, label: tpl.name })), [templates]);

  useEffect(() => {
    if (!templateId && templateOptions[0]) {
      setTemplateId(templateOptions[0].value);
    }
  }, [templateOptions, templateId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Veuillez sélectionner un fichier audio.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('participants', participants);
      formData.append('templateId', templateId);
      await onSubmit(formData);
      setFile(null);
      setParticipants('');
      setTemplateId(templateOptions[0]?.value || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="surface-card space-y-6" aria-label="Formulaire d'import">
      <div>
        <h2 className="section-title">Importer un nouvel enregistrement</h2>
        <p className="text-base-content/70">
          Les fichiers sont traités localement via FFmpeg et Whisper, puis enrichis avec OpenAI.
          Les exports restent identiques à la version précédente (TXT, Markdown et VTT).
        </p>
      </div>

      <form className="upload-form space-y-6" onSubmit={handleSubmit}>
        <div className="form-field">
          <label className="form-label" htmlFor="file">
            Fichier audio
          </label>
          <input
            id="file"
            className="file-input file-input-bordered"
            type="file"
            accept="audio/*,video/*"
            onChange={(event) => setFile(event.target.files[0] || null)}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="participants">
            Participants (séparés par une virgule)
          </label>
          <input
            id="participants"
            className="input input-bordered"
            type="text"
            placeholder="Alice, Bob, ..."
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="template">
            Gabarit de synthèse
          </label>
          <select
            id="template"
            className="select select-bordered"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-primary btn-md" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Envoi en cours…' : 'Lancer le traitement'}
        </button>
      </form>
    </section>
  );
}
