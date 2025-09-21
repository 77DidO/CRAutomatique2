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
    <section className="card" aria-label="Formulaire d'import">
      <h2 className="section-title">Importer un nouvel enregistrement</h2>
      <p>
        Les fichiers sont traités localement via FFmpeg et Whisper, puis enrichis avec OpenAI.
        Les exports restent identiques à la version précédente (TXT, Markdown et VTT).
      </p>

      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="file">Fichier audio</label>
          <input
            id="file"
            type="file"
            accept="audio/*,video/*"
            onChange={(event) => setFile(event.target.files[0] || null)}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="participants">Participants (séparés par une virgule)</label>
          <input
            id="participants"
            type="text"
            placeholder="Alice, Bob, ..."
            value={participants}
            onChange={(event) => setParticipants(event.target.value)}
          />
        </div>

        <div className="input-group">
          <label htmlFor="template">Gabarit de synthèse</label>
          <select
            id="template"
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

        {error && <p className="toast error">{error}</p>}

        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Envoi en cours…' : 'Lancer le traitement'}
        </button>
      </form>
    </section>
  );
}
